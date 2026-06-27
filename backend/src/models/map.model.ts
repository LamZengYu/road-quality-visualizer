import { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import { pool } from "../config/db";
import type { Visibility } from "@rqv/shared";

// Used by ingest: a map is identified by (name, owner) so re-scanning reuses it.
export async function upsertByName(
  conn: PoolConnection,
  name: string,
  ownerId: number
): Promise<number> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    "SELECT id FROM maps WHERE name = :name AND created_by = :owner LIMIT 1",
    { name, owner: ownerId }
  );
  if (rows[0]) return rows[0].id;
  const [r] = await conn.execute<ResultSetHeader>(
    "INSERT INTO maps (name, created_by) VALUES (:name, :owner)",
    { name, owner: ownerId }
  );
  return r.insertId;
}

export async function create(
  name: string,
  visibility: Visibility,
  ownerId: number
): Promise<number> {
  const [r] = await pool.execute<ResultSetHeader>(
    "INSERT INTO maps (name, visibility, created_by) VALUES (:name, :vis, :owner)",
    { name, vis: visibility, owner: ownerId }
  );
  return r.insertId;
}

// Own maps + any public map.
export async function listForUser(userId: number): Promise<RowDataPacket[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT m.id, m.name, m.visibility, (m.created_by = :uid) AS isOwner,
            COUNT(p.id) AS pathCount, AVG(p.score) AS avgScore
       FROM maps m
       LEFT JOIN paths p ON p.map_id = m.id
      WHERE m.created_by = :uid OR m.visibility = 'public'
      GROUP BY m.id, m.name, m.visibility, m.created_by
      ORDER BY m.created_at DESC`,
    { uid: userId }
  );
  return rows;
}

// A single map, but only if owned or public (else null → 404).
export async function getForUser(mapId: number, userId: number): Promise<RowDataPacket | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, name, visibility, (created_by = :uid) AS isOwner
       FROM maps
      WHERE id = :id AND (created_by = :uid OR visibility = 'public')`,
    { id: mapId, uid: userId }
  );
  return rows[0] ?? null;
}

export async function ownsMap(mapId: number, userId: number): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT 1 FROM maps WHERE id = :id AND created_by = :uid",
    { id: mapId, uid: userId }
  );
  return rows.length > 0;
}

export async function updateMeta(
  mapId: number,
  userId: number,
  fields: { name?: string; visibility?: Visibility }
): Promise<void> {
  const sets: string[] = [];

  const params: Record<string, any> = { id: mapId, uid: userId };
  if (fields.name !== undefined) {
    sets.push("name = :name");
    params.name = fields.name;
  }
  if (fields.visibility !== undefined) {
    sets.push("visibility = :vis");
    params.vis = fields.visibility;
  }
  if (sets.length === 0) return;
  await pool.execute(
    `UPDATE maps SET ${sets.join(", ")} WHERE id = :id AND created_by = :uid`,
    params
  );
}

export async function deleteById(conn: PoolConnection, mapId: number): Promise<void> {
  await conn.execute("DELETE FROM maps WHERE id = :id", { id: mapId });
}
