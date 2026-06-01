import { RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import { pool } from "../config/db";
import type { Grade } from "@rqv/shared";
import { toMysqlDate } from "../util/time";

// Idempotent by client_uuid: re-syncing the same scan reuses the row.
export async function upsertByUuid(
  conn: PoolConnection,
  mapId: number,
  path: { clientUuid: string; name: string; scannedAt: string }
): Promise<number> {
  await conn.execute(
    `INSERT INTO paths (map_id, client_uuid, name, scanned_at)
     VALUES (:mapId, :uuid, :name, :scannedAt)
     ON DUPLICATE KEY UPDATE name = VALUES(name), scanned_at = VALUES(scanned_at)`,
    { mapId, uuid: path.clientUuid, name: path.name, scannedAt: toMysqlDate(path.scannedAt) }
  );
  const [rows] = await conn.execute<RowDataPacket[]>(
    "SELECT id FROM paths WHERE client_uuid = :uuid",
    { uuid: path.clientUuid }
  );
  return rows[0].id;
}

export async function updateComputed(
  conn: PoolConnection,
  pathId: number,
  c: { lengthM: number; score: number; grade: Grade; holeCount: number }
): Promise<void> {
  await conn.execute(
    `UPDATE paths SET length_m = :len, score = :score, grade = :grade, hole_count = :hc
      WHERE id = :id`,
    { len: c.lengthM, score: c.score, grade: c.grade, hc: c.holeCount, id: pathId }
  );
}

export async function listForMap(mapId: number): Promise<RowDataPacket[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, name, score, grade, length_m AS lengthM, scanned_at AS scannedAt
       FROM paths WHERE map_id = :mapId ORDER BY scanned_at DESC`,
    { mapId }
  );
  return rows;
}

export async function getById(pathId: number): Promise<RowDataPacket | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, map_id AS mapId, name, length_m AS lengthM, hole_count AS holeCount,
            score, grade, scanned_at AS scannedAt
       FROM paths WHERE id = :id`,
    { id: pathId }
  );
  return rows[0] ?? null;
}

export async function listIdsForMap(conn: PoolConnection, mapId: number): Promise<number[]> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    "SELECT id FROM paths WHERE map_id = :mapId",
    { mapId }
  );
  return rows.map((r) => Number(r.id));
}

export async function updateName(pathId: number, name: string): Promise<void> {
  await pool.execute("UPDATE paths SET name = :name WHERE id = :id", { id: pathId, name });
}

export async function deleteById(conn: PoolConnection, pathId: number): Promise<void> {
  await conn.execute("DELETE FROM paths WHERE id = :id", { id: pathId });
}
