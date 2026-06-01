import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  Button,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  listMaps,
  getPath,
  getMapStats,
  patchMap,
  deleteMap,
  patchPath,
  deletePath,
  type StatsFilter,
} from '../api/scans';
import { api } from '../api/client';
import type { MapStats, MapSummary, PathDetail, PathSummary, Severity } from '../types/api';

const ALL_SEVERITIES: Severity[] = ['minor', 'moderate', 'severe'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function parseDate(s: string): Date | null {
  if (!DATE_RE.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
import { SchematicMap } from '../components/SchematicMap';
import { SeverityBreakdown, ScoreOverTime, WorstPaths } from '../components/Charts';
import { t, colors, gradeColor, severityColor } from '../theme';

interface RenameTarget {
  kind: 'map' | 'path';
  id: number;
  current: string;
}

interface SheetAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}
interface ActionSheetState {
  title: string;
  actions: SheetAction[];
}

export default function AnalysisScreen() {
  const insets = useSafeAreaInsets();
  const listPadBottom = { paddingBottom: insets.bottom + 24 };

  const [maps, setMaps] = useState<MapSummary[] | null>(null);
  const [paths, setPaths] = useState<PathSummary[] | null>(null);
  const [mapStats, setMapStats] = useState<MapStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [selectedMap, setSelectedMap] = useState<MapSummary | null>(null);
  const [pathDetail, setPathDetail] = useState<PathDetail | null>(null);
  const [selectedHoleId, setSelectedHoleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- Filter state (active when viewing a map's detail) ---
  const [fromStr, setFromStr] = useState('');
  const [toStr, setToStr] = useState('');
  const [severities, setSeverities] = useState<Severity[]>([...ALL_SEVERITIES]);
  const [showPicker, setShowPicker] = useState<'from' | 'to' | null>(null);

  function handlePickerChange(e: DateTimePickerEvent, picked?: Date) {
    // On Android the picker dismisses itself on either Set or Cancel —
    // we close it either way.
    const target = showPicker;
    setShowPicker(null);
    if (e.type !== 'set' || !picked) return;
    const str = fmtDate(picked);
    if (target === 'from') setFromStr(str);
    else if (target === 'to') setToStr(str);
  }

  const filter: StatsFilter = useMemo(
    () => ({
      from: DATE_RE.test(fromStr) ? fromStr : undefined,
      to: DATE_RE.test(toStr) ? toStr : undefined,
      severities:
        severities.length === ALL_SEVERITIES.length ? undefined : severities,
    }),
    [fromStr, toStr, severities],
  );

  const anyFilterActive =
    fromStr !== '' || toStr !== '' || severities.length !== ALL_SEVERITIES.length;

  // --- Rename modal state ---
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [renameText, setRenameText] = useState('');
  const [renameBusy, setRenameBusy] = useState(false);

  // --- Action-sheet modal state (replaces Alert.alert for >3 actions on Android) ---
  const [sheet, setSheet] = useState<ActionSheetState | null>(null);

  const loadMaps = useCallback(async () => {
    try {
      setMaps(await listMaps());
    } catch (e: any) {
      Alert.alert('Load failed', e.message);
    }
  }, []);

  const loadPaths = useCallback(async (mapId: number) => {
    try {
      const { data } = await api.get<{ paths: PathSummary[] }>(`/maps/${mapId}`);
      setPaths(data.paths);
    } catch (e: any) {
      Alert.alert('Load failed', e.message);
    }
  }, []);

  // Refetch stats whenever the selected map or the filter changes.
  useEffect(() => {
    if (!selectedMap) {
      setMapStats(null);
      return;
    }
    let cancelled = false;
    setStatsLoading(true);
    getMapStats(selectedMap.id, filter)
      .then((s) => {
        if (!cancelled) setMapStats(s);
      })
      .catch((e: any) => {
        if (!cancelled) Alert.alert('Stats load failed', e.message);
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedMap, filter]);

  function toggleSeverity(sev: Severity) {
    setSeverities((cur) =>
      cur.includes(sev) ? cur.filter((x) => x !== sev) : [...cur, sev],
    );
  }
  function resetFilters() {
    setFromStr('');
    setToStr('');
    setSeverities([...ALL_SEVERITIES]);
  }

  useEffect(() => {
    loadMaps().finally(() => setLoading(false));
  }, [loadMaps]);

  function openRename(target: RenameTarget) {
    setRenameTarget(target);
    setRenameText(target.current);
  }

  async function submitRename() {
    if (!renameTarget) return;
    const trimmed = renameText.trim();
    if (!trimmed || trimmed === renameTarget.current) {
      setRenameTarget(null);
      return;
    }
    setRenameBusy(true);
    try {
      if (renameTarget.kind === 'map') {
        await patchMap(renameTarget.id, { name: trimmed });
        await loadMaps();
      } else {
        await patchPath(renameTarget.id, { name: trimmed });
        if (selectedMap) await loadPaths(selectedMap.id);
      }
      setRenameTarget(null);
    } catch (e: any) {
      Alert.alert('Rename failed', e?.response?.data?.error?.message ?? e.message);
    } finally {
      setRenameBusy(false);
    }
  }

  function confirmDelete(title: string, body: string, onConfirm: () => Promise<void>) {
    Alert.alert(title, body, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await onConfirm();
          } catch (e: any) {
            Alert.alert(
              'Delete failed',
              e?.response?.data?.error?.message ?? e.message,
            );
          }
        },
      },
    ]);
  }

  function openMapActions(m: MapSummary) {
    if (!m.isOwner) {
      Alert.alert('Read-only', "You don't own this map.");
      return;
    }
    const nextVis = m.visibility === 'private' ? 'public' : 'private';
    setSheet({
      title: `${m.name} (${m.visibility})`,
      actions: [
        {
          label: 'Rename',
          onPress: () => openRename({ kind: 'map', id: m.id, current: m.name }),
        },
        {
          label: `Make ${nextVis}`,
          onPress: async () => {
            try {
              await patchMap(m.id, { visibility: nextVis });
              await loadMaps();
            } catch (e: any) {
              Alert.alert(
                'Update failed',
                e?.response?.data?.error?.message ?? e.message,
              );
            }
          },
        },
        {
          label: 'Delete',
          destructive: true,
          onPress: () =>
            confirmDelete(
              `Delete "${m.name}"?`,
              `This removes ${m.pathCount} path(s) and all their holes. Cannot be undone.`,
              async () => {
                await deleteMap(m.id);
                await loadMaps();
              },
            ),
        },
      ],
    });
  }

  function openPathActions(p: PathSummary) {
    if (!selectedMap?.isOwner) {
      Alert.alert('Read-only', "You don't own this map.");
      return;
    }
    setSheet({
      title: p.name,
      actions: [
        {
          label: 'Rename',
          onPress: () => openRename({ kind: 'path', id: p.id, current: p.name }),
        },
        {
          label: 'Delete',
          destructive: true,
          onPress: () =>
            confirmDelete(
              `Delete "${p.name}"?`,
              'This removes all holes and GPS points on this path. Cannot be undone.',
              async () => {
                await deletePath(p.id);
                await loadPaths(selectedMap.id);
                await loadMaps();
              },
            ),
        },
      ],
    });
  }

  const renameModal = (
    <Modal
      visible={renameTarget !== null}
      transparent
      animationType="fade"
      onRequestClose={() => !renameBusy && setRenameTarget(null)}>
      <Pressable
        style={s.modalOverlay}
        onPress={() => !renameBusy && setRenameTarget(null)}>
        <Pressable style={s.modalCard} onPress={() => {}}>
          <Text style={s.modalTitle}>
            Rename {renameTarget?.kind === 'map' ? 'map' : 'path'}
          </Text>
          <TextInput
            value={renameText}
            onChangeText={setRenameText}
            style={s.modalInput}
            autoFocus
            selectTextOnFocus
          />
          <View style={s.modalRow}>
            <View style={{ flex: 1 }}>
              <Button
                title="Cancel"
                color="#888"
                onPress={() => setRenameTarget(null)}
                disabled={renameBusy}
              />
            </View>
            <View style={{ width: 8 }} />
            <View style={{ flex: 1 }}>
              <Button
                title={renameBusy ? '...' : 'Save'}
                onPress={submitRename}
                disabled={renameBusy}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const actionSheetModal = (
    <Modal
      visible={sheet !== null}
      transparent
      animationType="fade"
      onRequestClose={() => setSheet(null)}>
      <Pressable style={s.modalOverlay} onPress={() => setSheet(null)}>
        <Pressable style={s.sheetCard} onPress={() => {}}>
          {sheet && (
            <>
              <Text style={s.sheetTitle}>{sheet.title}</Text>
              {sheet.actions.map((a) => (
                <Pressable
                  key={a.label}
                  onPress={() => {
                    setSheet(null);
                    // Defer slightly so the modal closes before any follow-up
                    // dialog opens (avoids overlapping modals on Android).
                    setTimeout(() => a.onPress(), 0);
                  }}
                  style={({ pressed }) => [
                    s.sheetItem,
                    pressed && { backgroundColor: '#f0f0f0' },
                  ]}>
                  <Text
                    style={[
                      s.sheetItemText,
                      a.destructive && { color: '#c0392b', fontWeight: '600' },
                    ]}>
                    {a.label}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setSheet(null)}
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

  // ---- Path detail view ----
  if (pathDetail) {
    const grade = pathDetail.grade ?? 'C';
    return (
      <View style={[s.c, { backgroundColor: colors.bg }]}>
        {renameModal}
        {actionSheetModal}
        <Pressable
          onPress={() => {
            setPathDetail(null);
            setSelectedHoleId(null);
          }}
          style={s.backBtn}>
          <Text style={s.backText}>← Back to paths</Text>
        </Pressable>
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={listPadBottom}
          data={pathDetail.holes}
          keyExtractor={(h) => String(h.id)}
          ListHeaderComponent={
            <View>
              <View style={s.rowHeader}>
                <Text style={t.pageTitle}>{pathDetail.name}</Text>
                <View
                  style={[
                    t.pill,
                    { backgroundColor: gradeColor(pathDetail.grade) },
                  ]}>
                  <Text style={t.pillText}>{pathDetail.grade ?? '-'}</Text>
                </View>
              </View>
              <Text style={t.itemMeta}>
                {pathDetail.lengthM.toFixed(0)} m · score{' '}
                {pathDetail.score?.toFixed(1) ?? '-'}
              </Text>
              <View style={s.schematicBox}>
                <SchematicMap
                  variant="detail"
                  grade={grade}
                  points={pathDetail.points}
                  holes={pathDetail.holes.map((h) => ({
                    id: h.id,
                    lat: h.lat,
                    lng: h.lng,
                    severity: h.severity,
                    score: h.score,
                    confidence: h.confidence,
                  }))}
                  selectedHoleId={selectedHoleId}
                  onHoleClick={(hid) =>
                    setSelectedHoleId((cur) => (cur === hid ? null : hid))
                  }
                />
              </View>
              <Text style={t.sectionLabel}>
                Holes ({pathDetail.holes.length})
              </Text>
              <Text style={t.hint}>
                Tap a marker above to highlight it below.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const selected =
              item.id !== undefined && item.id === selectedHoleId;
            return (
              <Pressable
                onPress={() => {
                  if (item.id !== undefined) {
                    setSelectedHoleId((cur) =>
                      cur === item.id ? null : item.id!,
                    );
                  }
                }}
                style={({ pressed }) => [
                  t.card,
                  selected && t.rowSelected,
                  pressed && t.cardPressed,
                ]}>
                <View style={s.rowHeader}>
                  <Text style={t.itemTitle}>Hole #{index + 1}</Text>
                  <View
                    style={[
                      t.pill,
                      { backgroundColor: severityColor(item.severity) },
                    ]}>
                    <Text style={t.pillText}>{item.severity}</Text>
                  </View>
                </View>
                <Text style={t.itemMeta}>
                  score {item.score?.toFixed(1) ?? '-'}
                  {item.confidence !== undefined
                    ? ` · confidence ${(item.confidence * 100).toFixed(0)}%`
                    : ''}
                </Text>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text style={s.empty}>No holes on this path.</Text>
          }
        />
      </View>
    );
  }

  // ---- Map detail view (list of paths in this map) ----
  if (selectedMap) {
    return (
      <View style={[s.c, { backgroundColor: colors.bg }]}>
        {renameModal}
        {actionSheetModal}
        <Pressable
          onPress={() => {
            setSelectedMap(null);
            setPaths(null);
            setMapStats(null);
            resetFilters();
          }}
          style={s.backBtn}>
          <Text style={s.backText}>← Back to maps</Text>
        </Pressable>
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={listPadBottom}
          data={paths ?? []}
          keyExtractor={(p) => String(p.id)}
          ListHeaderComponent={
            <View>
              <Text style={t.pageTitle}>{selectedMap.name}</Text>
              <Text style={t.itemMeta}>
                {selectedMap.pathCount} paths · avg score{' '}
                {selectedMap.avgScore?.toFixed(1) ?? '-'}
              </Text>

              {/* --- Filter bar --- */}
              <View style={[t.card, { marginTop: 12 }]}>
                <Text style={t.sectionLabel}>Filters</Text>
                <View style={s.filterRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.filterLabel}>From</Text>
                    <View style={s.dateFieldRow}>
                      <Pressable
                        onPress={() => setShowPicker('from')}
                        style={s.filterInput}>
                        <Text
                          style={{
                            color: fromStr ? colors.text : colors.faint,
                            fontSize: 13,
                          }}>
                          {fromStr || 'Any date'}
                        </Text>
                      </Pressable>
                      {fromStr !== '' && (
                        <Pressable
                          onPress={() => setFromStr('')}
                          style={s.clearBtn}>
                          <Text style={s.clearBtnText}>✕</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                  <View style={{ width: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.filterLabel}>To</Text>
                    <View style={s.dateFieldRow}>
                      <Pressable
                        onPress={() => setShowPicker('to')}
                        style={s.filterInput}>
                        <Text
                          style={{
                            color: toStr ? colors.text : colors.faint,
                            fontSize: 13,
                          }}>
                          {toStr || 'Any date'}
                        </Text>
                      </Pressable>
                      {toStr !== '' && (
                        <Pressable
                          onPress={() => setToStr('')}
                          style={s.clearBtn}>
                          <Text style={s.clearBtnText}>✕</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>

                {showPicker !== null && (
                  <DateTimePicker
                    mode="date"
                    display="default"
                    value={
                      (showPicker === 'from'
                        ? parseDate(fromStr)
                        : parseDate(toStr)) ?? new Date()
                    }
                    minimumDate={
                      showPicker === 'to' ? parseDate(fromStr) ?? undefined : undefined
                    }
                    maximumDate={
                      showPicker === 'from' ? parseDate(toStr) ?? undefined : undefined
                    }
                    onChange={handlePickerChange}
                  />
                )}
                <Text style={[s.filterLabel, { marginTop: 10 }]}>Severity</Text>
                <View style={s.sevChecks}>
                  {ALL_SEVERITIES.map((sev) => {
                    const on = severities.includes(sev);
                    return (
                      <Pressable
                        key={sev}
                        onPress={() => toggleSeverity(sev)}
                        style={[
                          s.sevChip,
                          {
                            backgroundColor: on
                              ? severityColor(sev)
                              : '#f0f0f0',
                            borderColor: on
                              ? severityColor(sev)
                              : colors.border,
                          },
                        ]}>
                        <Text
                          style={{
                            color: on ? 'white' : colors.muted,
                            fontSize: 12,
                            fontWeight: '600',
                          }}>
                          {on ? '✓ ' : ''}
                          {sev}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={s.filterFoot}>
                  <Text style={s.filterFootHint}>
                    Severity affects only the breakdown chart. Date affects all
                    three.
                    {statsLoading ? ' · loading…' : ''}
                  </Text>
                  <Pressable
                    onPress={resetFilters}
                    disabled={!anyFilterActive}
                    style={[
                      s.resetBtn,
                      !anyFilterActive && { opacity: 0.4 },
                    ]}>
                    <Text style={s.resetBtnText}>Reset</Text>
                  </Pressable>
                </View>
              </View>

              {mapStats && (
                <View style={{ marginTop: 12 }}>
                  <SeverityBreakdown data={mapStats.severityBreakdown} />
                  <ScoreOverTime data={mapStats.scoreOverTime} />
                  <WorstPaths data={mapStats.worstPaths} />
                </View>
              )}
              <Text style={t.sectionLabel}>Paths</Text>
              <Text style={t.hint}>
                Long-press a path to rename or delete.
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await loadPaths(selectedMap.id);
                setRefreshing(false);
              }}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={async () => {
                try {
                  setPathDetail(await getPath(item.id));
                } catch (e: any) {
                  Alert.alert('Load failed', e.message);
                }
              }}
              onLongPress={() => openPathActions(item)}
              style={({ pressed }) => [t.card, pressed && t.cardPressed]}>
              <View style={s.rowHeader}>
                <Text style={t.itemTitle}>{item.name}</Text>
                <View
                  style={[
                    t.pill,
                    { backgroundColor: gradeColor(item.grade) },
                  ]}>
                  <Text style={t.pillText}>{item.grade ?? '-'}</Text>
                </View>
              </View>
              <Text style={t.itemMeta}>
                {new Date(item.scannedAt).toLocaleString()} ·{' '}
                {item.lengthM.toFixed(0)} m · score{' '}
                {item.score !== null ? item.score.toFixed(1) : '-'}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Text style={s.emptyTitle}>No paths in this map yet</Text>
              <Text style={s.empty}>
                Run another scan on this map name to add a path.
              </Text>
            </View>
          }
        />
      </View>
    );
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  // ---- Top-level: map list ----
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {renameModal}
      {actionSheetModal}
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={[{ padding: 16 }, listPadBottom]}
        data={maps ?? []}
        keyExtractor={(m) => String(m.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadMaps();
              setRefreshing(false);
            }}
          />
        }
        ListHeaderComponent={
          <View>
            <Text style={t.pageTitle}>Maps</Text>
            <Text style={t.hint}>
              Long-press a map to rename, change visibility, or delete · pull to refresh.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={async () => {
              setSelectedMap(item);
              setPaths(null);
              await loadPaths(item.id);
            }}
            onLongPress={() => openMapActions(item)}
            style={({ pressed }) => [t.card, pressed && t.cardPressed]}>
            <View style={s.rowHeader}>
              <Text style={t.itemTitle}>{item.name}</Text>
              <View
                style={[
                  t.pill,
                  {
                    backgroundColor:
                      item.visibility === 'public' ? colors.gradeB : colors.muted,
                  },
                ]}>
                <Text style={t.pillText}>
                  {item.visibility}
                  {item.isOwner ? '' : ' · ro'}
                </Text>
              </View>
            </View>
            <Text style={t.itemMeta}>
              {item.pathCount} path{item.pathCount === 1 ? '' : 's'} · avg score{' '}
              {item.avgScore?.toFixed(1) ?? '-'}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Text style={s.emptyTitle}>No maps yet</Text>
            <Text style={s.empty}>
              Tap <Text style={{ fontWeight: '600' }}>Start scan</Text> on the
              previous screen, scan a road, then{' '}
              <Text style={{ fontWeight: '600' }}>Sync</Text> to upload it. Once
              a sync succeeds, the map appears here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, padding: 16, gap: 4 },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  schematicBox: {
    marginTop: 10,
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fafafa',
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  backText: { color: colors.primary, fontWeight: '600' },
  empty: { padding: 12, textAlign: 'center', color: colors.muted },
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
  filterRow: { flexDirection: 'row', marginTop: 4 },
  filterLabel: {
    fontSize: 11,
    color: colors.muted,
    marginBottom: 4,
    fontWeight: '600',
  },
  filterInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
    backgroundColor: 'white',
    justifyContent: 'center',
  },
  dateFieldRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  clearBtnText: { color: colors.muted, fontWeight: '700' },
  sevChecks: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  sevChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterFoot: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterFootHint: {
    flex: 1,
    fontSize: 11,
    color: colors.muted,
    fontStyle: 'italic',
  },
  resetBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    backgroundColor: 'white',
  },
  resetBtnText: { fontSize: 12, fontWeight: '600', color: colors.text },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 18,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  modalRow: { flexDirection: 'row' },
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
