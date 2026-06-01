// Phase 3e (Path D) upload flow:
//   For each pending scan:
//     1. POST /api/ingest/scan-photo per photo (multipart) — backend runs ONNX
//        detection on each photo and inserts the detected holes for this path.
//     2. POST /api/ingest/scan-finalize once — backend stores the GPS trace, then
//        recomputes length / score / grade from the accumulated holes.
//     3. Delete local photos, mark the scan synced.
import { api } from '../api/client';
import { getPendingScans, markSynced } from '../db/repository';
import type { BufferedScan, BufferedPhoto } from '../db/repository';
import { deletePhoto } from './photo-capture';

export interface SyncResult {
  syncedCount: number;
  failedCount: number;
  lastError?: string;
}

export interface SyncProgress {
  scanIndex: number;       // 0-based
  scanTotal: number;
  photoIndex: number;      // 0-based, # of photos already uploaded in this scan
  photoTotal: number;
  syncedCount: number;     // scans successfully synced so far
  failedCount: number;
  phase: 'uploading' | 'finalizing';
}

async function uploadPhoto(scan: BufferedScan, photo: BufferedPhoto): Promise<void> {
  const form = new FormData();
  form.append('photo', {
    uri: photo.filePath.startsWith('file://') ? photo.filePath : `file://${photo.filePath}`,
    type: 'image/jpeg',
    name: `${photo.clientUuid}.jpg`,
  } as any);
  form.append(
    'meta',
    JSON.stringify({
      mapName: scan.mapName,
      pathClientUuid: scan.clientUuid,
      pathName: scan.pathName,
      scannedAt: scan.scannedAt,
      photoClientUuid: photo.clientUuid,
      lat: photo.lat,
      lng: photo.lng,
      capturedAt: photo.capturedAt,
    }),
  );
  await api.post('/ingest/scan-photo', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000, // each photo upload + inference can take a few seconds
  });
}

async function finalizeScan(scan: BufferedScan): Promise<void> {
  await api.post('/ingest/scan-finalize', {
    mapName: scan.mapName,
    path: { clientUuid: scan.clientUuid, name: scan.pathName, scannedAt: scan.scannedAt },
    points: scan.points,
  });
}

export async function syncPendingScans(
  onProgress?: (p: SyncProgress) => void,
): Promise<SyncResult> {
  const pending = await getPendingScans();
  let syncedCount = 0;
  let failedCount = 0;
  let lastError: string | undefined;

  for (let i = 0; i < pending.length; i++) {
    const scan = pending[i];
    try {
      for (let j = 0; j < scan.photos.length; j++) {
        onProgress?.({
          scanIndex: i,
          scanTotal: pending.length,
          photoIndex: j,
          photoTotal: scan.photos.length,
          syncedCount,
          failedCount,
          phase: 'uploading',
        });
        await uploadPhoto(scan, scan.photos[j]);
      }
      onProgress?.({
        scanIndex: i,
        scanTotal: pending.length,
        photoIndex: scan.photos.length,
        photoTotal: scan.photos.length,
        syncedCount,
        failedCount,
        phase: 'finalizing',
      });
      await finalizeScan(scan);
      for (const photo of scan.photos) {
        await deletePhoto(photo.filePath);
      }
      await markSynced(scan.clientUuid);
      syncedCount++;
    } catch (e: any) {
      failedCount++;
      lastError = e?.response?.data?.error?.message ?? e?.message ?? 'unknown';
    }
  }
  return { syncedCount, failedCount, lastError };
}
