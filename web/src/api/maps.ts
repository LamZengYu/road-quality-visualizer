import { api } from './client';
import type { MapSummary, MapDetail, MapStats, PathDetail, Severity, Visibility } from '@rqv/shared';

export interface StatsFilter {
  from?: string;          // YYYY-MM-DD inclusive
  to?: string;            // YYYY-MM-DD inclusive
  severities?: Severity[];
}

export async function listMaps(): Promise<MapSummary[]> {
  const { data } = await api.get<MapSummary[]>('/maps');
  return data;
}
export async function getMap(id: number): Promise<MapDetail> {
  const { data } = await api.get<MapDetail>(`/maps/${id}`);
  return data;
}
export async function getMapStats(id: number, filter: StatsFilter = {}): Promise<MapStats> {
  const params: Record<string, string> = {};
  if (filter.from) params.from = filter.from;
  if (filter.to) params.to = filter.to;
  if (filter.severities && filter.severities.length > 0 && filter.severities.length < 3) {
    params.severities = filter.severities.join(',');
  }
  const { data } = await api.get<MapStats>(`/maps/${id}/stats`, { params });
  return data;
}
export async function getPath(id: number): Promise<PathDetail> {
  const { data } = await api.get<PathDetail>(`/paths/${id}`);
  return data;
}

export async function patchMap(
  id: number,
  fields: { name?: string; visibility?: Visibility },
): Promise<void> {
  await api.patch(`/maps/${id}`, fields);
}
export async function deleteMap(id: number): Promise<void> {
  await api.delete(`/maps/${id}`);
}
export async function patchPath(id: number, fields: { name: string }): Promise<void> {
  await api.patch(`/paths/${id}`, fields);
}
export async function deletePath(id: number): Promise<void> {
  await api.delete(`/paths/${id}`);
}
