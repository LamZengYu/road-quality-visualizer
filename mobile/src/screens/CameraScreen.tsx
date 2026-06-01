import { useEffect, useState, useRef } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import uuid from 'react-native-uuid';
import {
  startWatching,
  stopWatching,
  getCurrentFix,
  getTrace,
  clearTrace,
  getGpsDiagnostics,
} from '../services/location';
import { ensurePhotoDir, takeAndSavePhoto } from '../services/photo-capture';
import { saveScan } from '../db/repository';
import type { BufferedPhoto } from '../db/repository';
import type { PathPoint } from '../types/api';

// Phase 3e (Path D): capture a photo every N ms. Photos buffer on the phone,
// then upload at sync time and the backend runs ONNX detection.
const CAPTURE_INTERVAL_MS = 1000;

export default function CameraScreen({ navigation, route }: any) {
  const { mapName, pathName } = route.params ?? {};
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);
  const insets = useSafeAreaInsets();
  const [photos, setPhotos] = useState<BufferedPhoto[]>([]);
  const [gpsReady, setGpsReady] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsRejected, setGpsRejected] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [flash, setFlash] = useState(false);
  const scanUuid = useRef(String(uuid.v4()));
  const startedAt = useRef(new Date().toISOString());
  // We use a ref to gate concurrent captures (a previous takePhoto may still be in
  // flight when the interval fires again on a slow phone).
  const captureBusy = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensurePhotoDir();
    })();

    clearTrace();
    startWatching();

    const timer = setInterval(async () => {
      if (cancelled) return;
      const fixNow = getCurrentFix();
      setGpsReady(fixNow !== null);
      setGpsAccuracy(fixNow?.accuracy ?? null);
      setGpsRejected(getGpsDiagnostics().rejectedAccuracy);
      if (captureBusy.current) return;
      const fix = getCurrentFix();
      if (!fix) return;
      captureBusy.current = true;
      setCapturing(true);
      try {
        const photo = await takeAndSavePhoto(cameraRef, fix);
        if (photo) {
          setPhotos((prev) => [...prev, photo]);
          setFlash(true);
          setTimeout(() => setFlash(false), 120);
        }
      } catch (e) {
        console.error('photo capture failed', e);
      } finally {
        captureBusy.current = false;
        setCapturing(false);
      }
    }, CAPTURE_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
      stopWatching();
    };
  }, []);

  async function endScan() {
    const trace = getTrace();
    const points: PathPoint[] = trace.map((f, i) => ({
      seq: i,
      lat: f.lat,
      lng: f.lng,
      ts: new Date(f.ts).toISOString(),
    }));
    await saveScan({
      clientUuid: scanUuid.current,
      mapName,
      pathName,
      scannedAt: startedAt.current,
      photos,
      holes: [],
      points,
      synced: false,
    });
    Alert.alert(
      'Scan saved',
      `${photos.length} photos buffered, ${points.length} GPS points.\nGo to Sync to upload + detect.`,
      [{ text: 'OK', onPress: () => navigation.popToTop() }],
    );
  }

  if (!device) {
    return (
      <View style={s.fallback}>
        <Text>No back camera found on this device.</Text>
        <View style={{ height: 12 }} />
        <Button title="End scan" onPress={endScan} />
      </View>
    );
  }

  return (
    <View style={s.c}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
      />
      {flash && (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: 'white', opacity: 0.35 }]}
        />
      )}
      <View style={[s.topOverlay, { paddingTop: 16 + insets.top }]}>
        <Text style={s.txt}>Map: {mapName}</Text>
        <Text style={s.txt}>Path: {pathName}</Text>
        <Text style={s.txt}>
          GPS: {gpsReady
            ? `OK · ±${gpsAccuracy?.toFixed(0) ?? '?'} m`
            : 'searching…'}
          {gpsRejected > 0 ? `  (rejected ${gpsRejected})` : ''}
        </Text>
        <Text style={[s.txt, s.note]}>
          1 photo / {CAPTURE_INTERVAL_MS / 1000}s · detection happens on sync
        </Text>
      </View>
      <View style={s.counterCenter} pointerEvents="none">
        <Text style={s.counterBig}>📸 {photos.length}</Text>
        <Text style={s.counterSub}>
          {capturing ? 'capturing…' : 'photos buffered'}
        </Text>
      </View>
      <View style={[s.bottom, { bottom: Math.max(insets.bottom, 16) + 16 }]}>
        <Button title="End scan" onPress={endScan} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: 'black' },
  fallback: { flex: 1, padding: 24, justifyContent: 'center' },
  topOverlay: { padding: 16 },
  txt: {
    color: 'white',
    fontSize: 16,
    marginBottom: 4,
    textShadowColor: 'black',
    textShadowRadius: 4,
  },
  note: { fontSize: 12, opacity: 0.85, marginTop: 8 },
  counterCenter: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  counterBig: {
    color: 'white',
    fontSize: 56,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 6,
  },
  counterSub: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
    textShadowColor: 'black',
    textShadowRadius: 4,
    marginTop: 2,
  },
  bottom: { position: 'absolute', left: 0, right: 0, padding: 16 },
});
