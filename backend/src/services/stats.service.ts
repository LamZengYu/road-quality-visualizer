import { RowDataPacket } from "mysql2";
import { pool } from "../config/db";
import type { MapStats, Severity, Grade } from "@rqv/shared";

const VALID_SEVERITIES: Severity[] = ["minor", "moderate", "severe"];

export interface StatsFilter {
  from?: string;          // ISO date YYYY-MM-DD (inclusive)
  to?: string;            // ISO date YYYY-MM-DD (inclusive)
  severities?: Severity[]; // only affects severityBreakdown
}

function buildDateClause(filter: StatsFilter, params: Record<string, any>): string {
  const parts: string[] = [];
  if (filter.from && /^\d{4}-\d{2}-\d{2}$/.test(filter.from)) {
    parts.push("p.scanned_at >= :from");
    params.from = filter.from;
  }
  if (filter.to && /^\d{4}-\d{2}-\d{2}$/.test(filter.to)) {
    parts.push("p.scanned_at < DATE_ADD(:to, INTERVAL 1 DAY)");
    params.to = filter.to;
  }
  return parts.length ? " AND " + parts.join(" AND ") : "";
}

function buildSeverityClause(filter: StatsFilter): string {
  const sev = (filter.severities ?? []).filter((s) => VALID_SEVERITIES.includes(s));
  if (sev.length === 0 || sev.length === VALID_SEVERITIES.length) return "";
  // Values are checked against an allowlist, safe to inline.
  return ` AND h.severity IN (${sev.map((s) => `'${s}'`).join(",")})`;
}

export async function mapStats(mapId: number, filter: StatsFilter = {}): Promise<MapStats> {
  const params: Record<string, any> = { mapId };
  const dateClause = buildDateClause(filter, params);
  const sevClause = buildSeverityClause(filter);

  const [sev] = await pool.execute<RowDataPacket[]>(
    `SELECT h.severity, COUNT(*) AS n
       FROM holes h JOIN paths p ON p.id = h.path_id
      WHERE p.map_id = :mapId${dateClause}${sevClause}
      GROUP BY h.severity`,
    params
  );
  const severityBreakdown: Record<Severity, number> = { minor: 0, moderate: 0, severe: 0 };
  for (const r of sev) severityBreakdown[r.severity as Severity] = Number(r.n);

  const [sot] = await pool.execute<RowDataPacket[]>(
    `SELECT DATE(p.scanned_at) AS date, AVG(p.score) AS avgScore
       FROM paths p
      WHERE p.map_id = :mapId AND p.score IS NOT NULL${dateClause}
      GROUP BY DATE(p.scanned_at)
      ORDER BY date`,
    params
  );
  const scoreOverTime = sot.map((r) => ({
    date: String(r.date),
    avgScore: Number(r.avgScore),
  }));

  const [worst] = await pool.execute<RowDataPacket[]>(
    `SELECT p.id AS pathId, p.name, p.score, p.grade
       FROM paths p
      WHERE p.map_id = :mapId AND p.score IS NOT NULL${dateClause}
      ORDER BY p.score ASC
      LIMIT 5`,
    params
  );
  const worstPaths = worst.map((r) => ({
    pathId: Number(r.pathId),
    name: String(r.name),
    score: Number(r.score),
    grade: r.grade as Grade,
  }));

  return { severityBreakdown, scoreOverTime, worstPaths };
}
