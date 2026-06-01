import { Response } from "express";
import { AuthedRequest } from "../middleware/auth.middleware";
import * as pathsModel from "../models/path.model";
import * as holes from "../models/hole.model";
import * as points from "../models/pathPoint.model";
import * as maps from "../models/map.model";
import { pool } from "../config/db";

async function ownsContainingMap(pathId: number, userId: number): Promise<boolean> {
  const p = await pathsModel.getById(pathId);
  if (!p) return false;
  return maps.ownsMap(Number(p.mapId), userId);
}

export async function patch(req: AuthedRequest, res: Response) {
  const pathId = Number(req.params.id);
  if (!(await ownsContainingMap(pathId, req.user!.id))) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Path not found" } });
  }
  const { name } = req.body ?? {};
  if (typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: { code: "BAD_INPUT", message: "name required" } });
  }
  await pathsModel.updateName(pathId, name.trim());
  res.json({ id: pathId, name: name.trim() });
}

export async function remove(req: AuthedRequest, res: Response) {
  const pathId = Number(req.params.id);
  if (!(await ownsContainingMap(pathId, req.user!.id))) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Path not found" } });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await holes.deleteForPath(conn, pathId);
    await points.deleteForPath(conn, pathId);
    await pathsModel.deleteById(conn, pathId);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  res.json({ ok: true });
}

export async function getDetail(req: AuthedRequest, res: Response) {
  const pathId = Number(req.params.id);
  const p = await pathsModel.getById(pathId);
  if (!p) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Path not found" } });

  // Inherit the parent map's visibility (own or public), else 404.
  const m = await maps.getForUser(Number(p.mapId), req.user!.id);
  if (!m) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Path not found" } });

  const holeRows = await holes.listForPath(pathId);
  const pointRows = await points.listForPath(pathId);
  res.json({
    id: Number(p.id),
    mapId: Number(p.mapId),
    name: p.name,
    lengthM: Number(p.lengthM),
    holeCount: Number(p.holeCount),
    score: p.score !== null ? Number(p.score) : null,
    grade: p.grade ?? null,
    scannedAt: p.scannedAt,
    holes: holeRows.map((h) => ({
      id: Number(h.id),
      clientUuid: h.clientUuid,
      lat: Number(h.lat),
      lng: Number(h.lng),
      severity: h.severity,
      score: Number(h.score),
      confidence: h.confidence !== null ? Number(h.confidence) : undefined,
      bboxArea: h.bboxArea !== null ? Number(h.bboxArea) : undefined,
      thumbUrl: h.thumbUrl ?? null,
      detectedAt: h.detectedAt,
    })),
    points: pointRows.map((pt) => ({ seq: Number(pt.seq), lat: Number(pt.lat), lng: Number(pt.lng) })),
  });
}
