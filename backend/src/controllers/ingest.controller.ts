import { Response } from "express";
import { AuthedRequest } from "../middleware/auth.middleware";
import { pool } from "../config/db";
import * as mapsModel from "../models/map.model";
import * as pathsModel from "../models/path.model";
import * as holesModel from "../models/hole.model";
import * as pointsModel from "../models/pathPoint.model";
import * as scoring from "../services/scoring.service";
import { clusterHoles } from "../services/dedup.service";
import { detectInImage } from "../services/detect.service";
import type { IngestScanRequest, Hole } from "@rqv/shared";

// ─── Existing endpoint (used by mock/legacy clients) ──────────────────────────
// POST /api/ingest/scan — uploads ONE complete scan (all holes + GPS trace).
export async function ingestScan(req: AuthedRequest, res: Response) {
  const body = req.body as IngestScanRequest;
  if (!body?.mapName || !body?.path?.clientUuid) {
    return res.status(400).json({ error: { code: "BAD_INPUT", message: "mapName and path.clientUuid required" } });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const mapId = await mapsModel.upsertByName(conn, body.mapName, req.user!.id);
    const pathId = await pathsModel.upsertByUuid(conn, mapId, body.path);

    const merged = clusterHoles(body.holes ?? []);
    const scored: Hole[] = merged.map((h) => ({
      ...h,
      score: scoring.holeScore(h.severity, h.bboxArea ?? 0),
    }));

    await holesModel.replaceForPath(conn, pathId, scored);
    await pointsModel.replaceForPath(conn, pathId, body.points ?? []);

    const lengthM = scoring.lengthFromPoints(body.points ?? []);
    const pScore = scoring.pathScore(scored.map((h) => ({ score: h.score! })), lengthM);
    const g = scoring.grade(pScore);
    await pathsModel.updateComputed(conn, pathId, {
      lengthM,
      score: pScore,
      grade: g,
      holeCount: scored.length,
    });

    await conn.commit();
    res.json({ pathId, score: pScore, grade: g, holeCount: scored.length });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// ─── Phase 3e (Path D): photo-based detection ─────────────────────────────────
// POST /api/ingest/scan-photo  (multipart)
//   - photo: the JPEG file (multer parses it into req.file.buffer)
//   - meta:  JSON string with { mapName, pathClientUuid, pathName, scannedAt,
//                                photoClientUuid, lat, lng, capturedAt }
// Runs ONNX inference on the image, inserts any detected holes for this path.
interface ScanPhotoMetadata {
  mapName: string;
  pathClientUuid: string;
  pathName: string;
  scannedAt: string;
  photoClientUuid: string;
  lat: number;
  lng: number;
  capturedAt: string;
}

export async function scanPhoto(req: AuthedRequest, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: { code: "NO_FILE", message: "Expected multipart file 'photo'" } });
  }
  let meta: ScanPhotoMetadata;
  try {
    meta = JSON.parse((req.body as any).meta ?? "{}");
  } catch {
    return res.status(400).json({ error: { code: "BAD_META", message: "Invalid JSON in 'meta' field" } });
  }
  if (!meta.mapName || !meta.pathClientUuid || !meta.photoClientUuid) {
    return res.status(400).json({ error: { code: "BAD_INPUT", message: "mapName, pathClientUuid, and photoClientUuid required" } });
  }

  // Run detection BEFORE the DB transaction (it can be slow + can throw if the
  // model isn't loaded; we don't want to hold a connection that whole time).
  const detections = await detectInImage(req.file.buffer);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const mapId = await mapsModel.upsertByName(conn, meta.mapName, req.user!.id);
    const pathId = await pathsModel.upsertByUuid(conn, mapId, {
      clientUuid: meta.pathClientUuid,
      name: meta.pathName,
      scannedAt: meta.scannedAt,
    });

    // Each detection becomes a Hole. clientUuid is derived from the photo's UUID
    // so re-uploading the same photo is idempotent (ON DUPLICATE KEY UPDATE).
    // Truncate to 30 chars so the composed `<short>-h<index>` always fits the
    // CHAR(36) column even for paths with hundreds of detections per photo.
    const photoIdShort = meta.photoClientUuid.slice(0, 30);
    const holes: Hole[] = detections.map((d, i) => ({
      clientUuid: `${photoIdShort}-h${i}`,
      lat: meta.lat,
      lng: meta.lng,
      severity: d.severity,
      confidence: d.confidence,
      bboxArea: d.box.w * d.box.h,
      score: scoring.holeScore(d.severity, d.box.w * d.box.h),
      detectedAt: meta.capturedAt,
    }));

    if (holes.length > 0) {
      await holesModel.insertMany(conn, pathId, holes);
    }

    await conn.commit();
    res.json({ photoClientUuid: meta.photoClientUuid, pathId, detectedCount: holes.length });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// POST /api/ingest/scan-finalize
// After all photos are uploaded, the phone calls this with the GPS trace.
// We store the points, then recompute the path's length / score / grade based on
// however many holes the photo uploads accumulated.
export async function scanFinalize(req: AuthedRequest, res: Response) {
  const { mapName, path: pathInfo, points } = (req.body ?? {}) as {
    mapName?: string;
    path?: { clientUuid: string; name: string; scannedAt: string };
    points?: { seq: number; lat: number; lng: number; ts: string }[];
  };
  if (!mapName || !pathInfo?.clientUuid) {
    return res.status(400).json({ error: { code: "BAD_INPUT", message: "mapName and path.clientUuid required" } });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const mapId = await mapsModel.upsertByName(conn, mapName, req.user!.id);
    const pathId = await pathsModel.upsertByUuid(conn, mapId, pathInfo);
    await pointsModel.replaceForPath(conn, pathId, points ?? []);

    // Read whatever holes have accumulated for this path from previous scan-photo calls.
    const holeRows = await holesModel.listForPath(pathId);
    const lengthM = scoring.lengthFromPoints(points ?? []);
    const pScore = scoring.pathScore(
      holeRows.map((h) => ({ score: Number(h.score) })),
      lengthM
    );
    const g = scoring.grade(pScore);
    await pathsModel.updateComputed(conn, pathId, {
      lengthM,
      score: pScore,
      grade: g,
      holeCount: holeRows.length,
    });

    await conn.commit();
    res.json({ pathId, score: pScore, grade: g, holeCount: holeRows.length });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
