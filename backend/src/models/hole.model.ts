import { RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import { pool } from "../config/db";
import type { Hole } from "@rqv/shared";
import { toMysqlDate } from "../util/time";

// A scan is uploaded as one batch, so we replace this path's holes wholesale.
export async function replaceForPath(
  conn: PoolConnection,
  pathId: number,
  holes: Hole[]
): Promise<void> {
  await conn.execute("DELETE FROM holes WHERE path_id = :pathId", { pathId });
  for (const h of holes) {
    await conn.execute(
      `INSERT INTO holes
         (path_id, client_uuid, lat, lng, severity, score, confidence, bbox_area, thumb_url, detected_at)
       VALUES
         (:pathId, :uuid, :lat, :lng, :sev, :score, :conf, :area, :thumb, :detectedAt)`,
      {
        pathId,
        uuid: h.clientUuid,
        lat: h.lat,
        lng: h.lng,
        sev: h.severity,
        score: h.score ?? 0,
        conf: h.confidence ?? null,
        area: h.bboxArea ?? null,
        thumb: h.thumbUrl ?? null,
        detectedAt: toMysqlDate(h.detectedAt),
      }
    );
  }
}

// Phase 3e (Path D): append-only insert used by /api/ingest/scan-photo so multiple
// photo uploads can each add their own detected holes without clobbering earlier ones.
// Idempotent: client_uuid is UNIQUE, so re-uploading the same photo upserts the same rows.
export async function insertMany(
  conn: PoolConnection,
  pathId: number,
  holes: Hole[]
): Promise<void> {
  for (const h of holes) {
    await conn.execute(
      `INSERT INTO holes
         (path_id, client_uuid, lat, lng, severity, score, confidence, bbox_area, thumb_url, detected_at)
       VALUES
         (:pathId, :uuid, :lat, :lng, :sev, :score, :conf, :area, :thumb, :detectedAt)
       ON DUPLICATE KEY UPDATE
         lat = VALUES(lat), lng = VALUES(lng), severity = VALUES(severity),
         score = VALUES(score), confidence = VALUES(confidence), bbox_area = VALUES(bbox_area),
         thumb_url = VALUES(thumb_url), detected_at = VALUES(detected_at)`,
      {
        pathId,
        uuid: h.clientUuid,
        lat: h.lat,
        lng: h.lng,
        sev: h.severity,
        score: h.score ?? 0,
        conf: h.confidence ?? null,
        area: h.bboxArea ?? null,
        thumb: h.thumbUrl ?? null,
        detectedAt: toMysqlDate(h.detectedAt),
      }
    );
  }
}

export async function listForPath(pathId: number): Promise<RowDataPacket[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, client_uuid AS clientUuid, lat, lng, severity, score, confidence,
            bbox_area AS bboxArea, thumb_url AS thumbUrl, detected_at AS detectedAt
       FROM holes WHERE path_id = :pathId`,
    { pathId }
  );
  return rows;
}

export async function deleteForPath(conn: PoolConnection, pathId: number): Promise<void> {
  await conn.execute("DELETE FROM holes WHERE path_id = :pathId", { pathId });
}
