import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  RefreshControl,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getAllScans,
  removeScan,
  clearSynced,
} from '../db/repository';
import type { BufferedScan } from '../db/repository';
import { syncPendingScans } from '../services/sync';
import type { SyncProgress } from '../services/sync';
import { deletePhoto } from '../services/photo-capture';
import { t, colors } from '../theme';

export default function SyncScreen() {
  const insets = useSafeAreaInsets();
  const [scans, setScans] = useState<BufferedScan[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [actionTarget, setActionTarget] = useState<BufferedScan | null>(null);

  const refresh = useCallback(async () => {
    setScans(await getAllScans());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function doSync() {
    setBusy(true);
    setProgress(null);
    try {
      const r = await syncPendingScans((p) => setProgress(p));
      await refresh();
      Alert.alert(
        'Sync result',
        `Synced ${r.syncedCount}, failed ${r.failedCount}` +
          (r.lastError ? `\n${r.lastError}` : ''),
      );
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const pending = scans.filter((s) => !s.synced).length;
  const syncedCount = scans.filter((s) => s.synced).length;
  const totalPhotosInProgress =
    progress && progress.phase === 'uploading' ? progress.photoTotal : 0;

  async function handleDelete(target: BufferedScan) {
    try {
      const photoPaths = await removeScan(target.clientUuid);
      // Best-effort: clean up any photo files still on disk (only relevant if
      // the scan never synced).
      for (const p of photoPaths) {
        try {
          await deletePhoto(p);
        } catch {
          /* ignore — file may already be gone */
        }
      }
      await refresh();
    } catch (e: any) {
      Alert.alert('Delete failed', e?.message ?? 'unknown');
    }
  }

  function confirmDeleteSingle(target: BufferedScan) {
    setActionTarget(null);
    Alert.alert(
      `Delete this ${target.synced ? 'synced' : 'pending'} scan?`,
      `"${target.mapName} · ${target.pathName}"\n\n` +
        (target.synced
          ? 'Only the local entry is removed — your data on the server is not touched.'
          : 'This scan will never be uploaded. Cannot be undone.'),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDelete(target),
        },
      ],
    );
  }

  function confirmClearSynced() {
    if (syncedCount === 0) return;
    Alert.alert(
      `Clear ${syncedCount} synced scan${syncedCount === 1 ? '' : 's'}?`,
      'Removes synced entries from the local list only. Your data on the server is not touched.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearSynced();
              await refresh();
            } catch (e: any) {
              Alert.alert('Clear failed', e?.message ?? 'unknown');
            }
          },
        },
      ],
    );
  }

  const actionSheet = (
    <Modal
      visible={actionTarget !== null}
      transparent
      animationType="fade"
      onRequestClose={() => setActionTarget(null)}>
      <Pressable
        style={s.modalOverlay}
        onPress={() => setActionTarget(null)}>
        <Pressable style={s.sheetCard} onPress={() => {}}>
          {actionTarget && (
            <>
              <Text style={s.sheetTitle}>
                {actionTarget.mapName} · {actionTarget.pathName}
              </Text>
              <Pressable
                onPress={() => confirmDeleteSingle(actionTarget)}
                style={({ pressed }) => [
                  s.sheetItem,
                  pressed && { backgroundColor: '#f0f0f0' },
                ]}>
                <Text style={[s.sheetItemText, { color: colors.danger, fontWeight: '600' }]}>
                  Delete buffered scan
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActionTarget(null)}
                style={({ pressed }) => [
                  s.sheetItem,
                  s.sheetCancel,
                  pressed && { backgroundColor: '#f0f0f0' },
                ]}>
                <Text style={[s.sheetItemText, { color: '#666' }]}>Cancel</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );

  return (
    <View
      style={[
        s.c,
        { paddingBottom: Math.max(insets.bottom, 16) },
      ]}>
      {actionSheet}
      <Text style={t.pageTitle}>Sync</Text>
      <Text style={t.itemMeta}>
        {scans.length} buffered scan{scans.length === 1 ? '' : 's'} ·{' '}
        {pending} pending · {syncedCount} synced
      </Text>

      <View style={{ marginTop: 12 }}>
        <Button
          title={busy ? 'Syncing…' : 'Sync now'}
          onPress={doSync}
          disabled={busy || pending === 0}
        />
      </View>
      {syncedCount > 0 && (
        <View style={{ marginTop: 8 }}>
          <Button
            title={`Clear ${syncedCount} synced from list`}
            color="#888"
            onPress={confirmClearSynced}
            disabled={busy}
          />
        </View>
      )}

      {progress && (
        <View style={s.progressBox}>
          <Text style={s.progressTitle}>
            Scan {progress.scanIndex + 1} of {progress.scanTotal}
          </Text>
          {progress.phase === 'uploading' ? (
            <>
              <Text style={s.progressLine}>
                Uploading photo {progress.photoIndex + 1} / {totalPhotosInProgress}
              </Text>
              <View style={s.barTrack}>
                <View
                  style={[
                    s.barFill,
                    {
                      width:
                        totalPhotosInProgress > 0
                          ? `${((progress.photoIndex + 1) / totalPhotosInProgress) * 100}%`
                          : '0%',
                    },
                  ]}
                />
              </View>
              <Text style={s.progressHint}>
                Backend is running ONNX detection on each photo…
              </Text>
            </>
          ) : (
            <>
              <Text style={s.progressLine}>
                Finalizing — computing score & grade…
              </Text>
              <ActivityIndicator style={{ marginTop: 6 }} />
            </>
          )}
          <Text style={s.progressFoot}>
            Synced so far: {progress.syncedCount} · failed: {progress.failedCount}
          </Text>
        </View>
      )}

      <Text style={t.sectionLabel}>Buffered scans</Text>
      <Text style={t.hint}>
        Long-press a scan to delete it from the buffer.
      </Text>

      <FlatList
        data={scans}
        keyExtractor={(it) => it.clientUuid}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refresh} />
        }
        renderItem={({ item }) => (
          <Pressable
            onLongPress={() => setActionTarget(item)}
            style={({ pressed }) => [t.card, pressed && t.cardPressed]}>
            <View style={s.rowHeader}>
              <Text style={t.itemTitle}>{item.mapName}</Text>
              <View
                style={[
                  t.pill,
                  {
                    backgroundColor: item.synced
                      ? colors.gradeA
                      : colors.gradeD,
                  },
                ]}>
                <Text style={t.pillText}>
                  {item.synced ? 'synced' : 'pending'}
                </Text>
              </View>
            </View>
            <Text style={{ color: colors.text, marginTop: 2 }}>
              {item.pathName}
            </Text>
            <Text style={t.itemMeta}>
              {new Date(item.scannedAt).toLocaleString()} ·{' '}
              {item.photos.length > 0
                ? `${item.photos.length} photos`
                : `${item.holes.length} holes (mock)`}{' '}
              · {item.points.length} GPS points
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Text style={s.emptyTitle}>No buffered scans yet</Text>
            <Text style={s.empty}>
              Run a scan from the previous screen first. It'll show up here
              ready to upload.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, padding: 16, backgroundColor: colors.bg },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#eef6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cde0f5',
  },
  progressTitle: { fontWeight: '600', marginBottom: 4 },
  progressLine: { marginBottom: 6 },
  progressHint: { fontSize: 12, color: colors.muted, marginTop: 6 },
  progressFoot: { fontSize: 12, color: '#444', marginTop: 8 },
  barTrack: {
    height: 8,
    backgroundColor: '#dde7f2',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: 8, backgroundColor: '#2e86de' },
  emptyBox: {
    margin: 20,
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    backgroundColor: '#fafafa',
  },
  emptyTitle: { textAlign: 'center', fontWeight: '600', marginBottom: 4 },
  empty: { padding: 12, textAlign: 'center', color: colors.muted },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  sheetCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    textAlign: 'center',
  },
  sheetItem: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sheetItemText: { fontSize: 16, textAlign: 'center' },
  sheetCancel: {
    marginTop: 4,
    borderBottomWidth: 0,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
});
