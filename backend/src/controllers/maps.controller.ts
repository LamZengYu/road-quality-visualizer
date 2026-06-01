import { Response } from "express";
import { AuthedRequest } from "../middleware/auth.middleware";
import * as maps from "../models/map.model";
import * as paths from "../models/path.model";
import * as holes from "../models/hole.model";
import * as points from "../models/pathPoint.model";
import * as stats from "../services/stats.service";
import { pool } from "../config/db";
import type { Visibility, Severity } from "@rqv/shared";

const VALID_SEVERITIES: Severity[] = ["minor", "moderate", "severe"];

function parseSeverities(raw: unknown): Severity[] | undefined {
  if (typeof raw !== "string" || raw.length === 0) return undefined;
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is Severity => (VALID_SEVERITIES as string[]).includes(s));
  return parts.length > 0 ? parts : undefined;
}

function parseDate(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined;
}

export async function list(req: AuthedRequest, res: Response) {
  const rows = await maps.listForUser(req.user!.id);
  res.json(
    rows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      visibility: r.visibility,
      isOwner: Number(r.isOwner) === 1,
      pathCount: Number(r.pathCount),
      avgScore: r.avgScore !== null ? Number(r.avgScore) : null,
    }))
  );
}

export async function create(req: AuthedRequest, res: Response) {
  const { name, visibility } = req.body ?? {};
  if (!name) return res.status(400).json({ error: { code: "BAD_INPUT", message: "name required" } });
  const vis: Visibility = visibility === "public" ? "public" : "private";
  const id = await maps.create(name, vis, req.user!.id);
  res.json({ id, name, visibility: vis });
}

export async function get(req: AuthedRequest, res: Response) {
  const mapId = Number(req.params.id);
  const m = await maps.getForUser(mapId, req.user!.id);
  if (!m) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Map not found" } });
  const pathRows = await paths.listForMap(mapId);
  res.json({
    id: Number(m.id),
    name: m.name,
    visibility: m.visibility,
    isOwner: Number(m.isOwner) === 1,
    paths: pathRows.map((p) => ({
      id: Number(p.id),
      name: p.name,
      score: p.score !== null ? Number(p.score) : null,
      grade: p.grade ?? null,
      lengthM: Number(p.lengthM),
      scannedAt: new Date(p.scannedAt).toISOString(),
    })),
  });
}

export async function patch(req: AuthedRequest, res: Response) {
  const mapId = Number(req.params.id);
  if (!(await maps.ownsMap(mapId, req.user!.id))) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Map not found" } });
  }
  const { name, visibility } = req.body ?? {};
  await maps.updateMeta(mapId, req.user!.id, { name, visibility });
  const m = await maps.getForUser(mapId, req.user!.id);
  res.json({ id: Number(m!.id), name: m!.name, visibility: m!.visibility });
}

export async function remove(req: AuthedRequest, res: Response) {
  const mapId = Number(req.params.id);
  if (!(await maps.ownsMap(mapId, req.user!.id))) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Map not found" } });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const pathIds = await paths.listIdsForMap(conn, mapId);
    for (const pid of pathIds) {
      await holes.deleteForPath(conn, pid);
      await points.deleteForPath(conn, pid);
      await paths.deleteById(conn, pid);
    }
    await maps.deleteById(conn, mapId);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  res.json({ ok: true });
}

export async function getStats(req: AuthedRequest, res: Response) {
  const mapId = Number(req.params.id);
  const m = await maps.getForUser(mapId, req.user!.id);
  if (!m) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Map not found" } });
  const filter: stats.StatsFilter = {
    from: parseDate(req.query.from),
    to: parseDate(req.query.to),
    severities: parseSeverities(req.query.severities),
  };
  res.json(await stats.mapStats(mapId, filter));
}
