import { RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import { pool } from "../config/db";
import type { PathPoint } from "@rqv/shared";
import { toMysqlDate } from "../util/time";

export async function replaceForPath(
  conn: PoolConnection,
  pathId: number,
  points: PathPoint[]
): Promise<void> {
  await conn.execute("DELETE FROM path_points WHERE path_id = :pathId", { pathId });
  for (const p of points) {
    await conn.execute(
      "INSERT INTO path_points (path_id, seq, lat, lng, ts) VALUES (:pathId, :seq, :lat, :lng, :ts)",
      { pathId, seq: p.seq, lat: p.lat, lng: p.lng, ts: toMysqlDate(p.ts) }
    );
  }
}

export async function listForPath(pathId: number): Promise<RowDataPacket[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT seq, lat, lng FROM path_points WHERE path_id = :pathId ORDER BY seq",
    { pathId }
  );
  return rows;
}

export async function deleteForPath(conn: PoolConnection, pathId: number): Promise<void> {
  await conn.execute("DELETE FROM path_points WHERE path_id = :pathId", { pathId });
}
