// Offline buffer for scans, stored as a single JSON array under one AsyncStorage key.
// JPEG photo bytes live on the filesystem (under DocumentDir); we only store their
// metadata (path + GPS + timestamp) here.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Hole, PathPoint } from '../types/api';

const KEY = 'rqv.pendingScans';

export interface BufferedPhoto {
  clientUuid: string;
  filePath: string; // local path on the phone (DocumentDir/scan-photos/<uuid>.jpg)
  lat: number;
  lng: number;
  capturedAt: string;
}

export interface BufferedScan {
  clientUuid: string;
  mapName: string;
  pathName: string;
  scannedAt: string;
  photos: BufferedPhoto[]; // Phase 3e Path D: photos to upload + run server-side detection
  holes: Hole[];           // Legacy / mock path: holes detected on-device (usually empty now)
  points: PathPoint[];
  synced: boolean;
}

async function readAll(): Promise<BufferedScan[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as BufferedScan[];
  // Backfill `photos: []` for scans saved before Phase 3e.
  return parsed.map((s) => ({ ...s, photos: s.photos ?? [] }));
}
async function writeAll(scans: BufferedScan[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(scans));
}

export async function saveScan(scan: BufferedScan): Promise<void> {
  const all = await readAll();
  const i = all.findIndex((s) => s.clientUuid === scan.clientUuid);
  if (i >= 0) all[i] = scan;
  else all.push(scan);
  await writeAll(all);
}

export async function getAllScans(): Promise<BufferedScan[]> {
  return readAll();
}

export async function getPendingScans(): Promise<BufferedScan[]> {
  return (await readAll()).filter((s) => !s.synced);
}

export async function markSynced(clientUuid: string): Promise<void> {
  const all = await readAll();
  const i = all.findIndex((s) => s.clientUuid === clientUuid);
  if (i >= 0) {
    all[i].synced = true;
    // Photos were uploaded + deleted; clear the array so the JSON stays small.
    all[i].photos = [];
    await writeAll(all);
  }
}

export async function clearAll(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

// Remove a single buffered scan from the local list. Returns the file paths of
// any photos that were still buffered (caller should delete them from disk).
export async function removeScan(clientUuid: string): Promise<string[]> {
  const all = await readAll();
  const target = all.find((s) => s.clientUuid === clientUuid);
  if (!target) return [];
  const remaining = all.filter((s) => s.clientUuid !== clientUuid);
  await writeAll(remaining);
  return target.photos.map((p) => p.filePath);
}

// Drop every scan that has already synced. Returns the count removed.
export async function clearSynced(): Promise<number> {
  const all = await readAll();
  const remaining = all.filter((s) => !s.synced);
  const removed = all.length - remaining.length;
  await writeAll(remaining);
  return removed;
}
