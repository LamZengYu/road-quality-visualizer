import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import axios from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApiBaseUrl, setApiBaseUrl } from '../api/client';

interface Preset {
  label: string;
  url: string;
  hint: string;
}

const PRESETS: Preset[] = [
  {
    label: 'USB (localhost)',
    url: 'http://localhost:3000/api',
    hint: 'Phone connected by USB with `adb reverse tcp:3000 tcp:3000`.',
  },
  {
    label: 'Android emulator',
    url: 'http://10.0.2.2:3000/api',
    hint: "Running on Android Studio's emulator (special host alias).",
  },
];

export default function SettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [url, setUrl] = useState(getApiBaseUrl());
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  useEffect(() => {
    setUrl(getApiBaseUrl());
  }, []);

  function applyPreset(p: Preset) {
    setUrl(p.url);
    setTestResult(null);
  }

  async function testConnection() {
    const trimmed = url.trim().replace(/\/+$/, '');
    if (!trimmed) {
      setTestResult({ ok: false, msg: 'URL is empty' });
      return;
    }
    setBusy(true);
    setTestResult(null);
    try {
      const { data } = await axios.get(`${trimmed}/health`, { timeout: 5000 });
      if (data?.ok) {
        setTestResult({ ok: true, msg: `Connected — ${trimmed}/health returned OK` });
      } else {
        setTestResult({
          ok: false,
          msg: `Reached the server but /health didn't return { ok: true }`,
        });
      }
    } catch (e: any) {
      const reason =
        e?.code === 'ECONNABORTED'
          ? 'timeout'
          : e?.message ?? 'unknown error';
      setTestResult({
        ok: false,
        msg: `Could not reach ${trimmed}/health — ${reason}`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const trimmed = url.trim();
    if (!trimmed) {
      Alert.alert('URL is empty', 'Enter a backend URL before saving.');
      return;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      Alert.alert(
        'URL missing scheme',
        'URL must start with http:// or https://',
      );
      return;
    }
    await setApiBaseUrl(trimmed);
    Alert.alert('Saved', `Backend URL set to:\n${trimmed.replace(/\/+$/, '')}`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        s.c,
        { paddingBottom: Math.max(insets.bottom, 16) + 24 },
      ]}>
      <Text style={s.title}>Backend connection</Text>
      <Text style={s.muted}>
        The mobile app talks to your backend API over the network. Set the
        backend URL here. Persists across app restarts.
      </Text>

      <Text style={s.label}>Backend URL</Text>
      <TextInput
        value={url}
        onChangeText={(v) => {
          setUrl(v);
          setTestResult(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="http://192.168.1.100:3000/api"
        style={s.input}
      />

      <Text style={s.hint}>
        Tip: must end with <Text style={s.code}>/api</Text>. For LAN testing,
        find your PC's IP with <Text style={s.code}>ipconfig</Text> (Wi-Fi
        adapter → IPv4 address).
      </Text>

      <View style={{ height: 8 }} />
      <Button
        title={busy ? 'Testing…' : 'Test connection'}
        onPress={testConnection}
        disabled={busy}
      />

      {testResult && (
        <View
          style={[
            s.resultBox,
            { backgroundColor: testResult.ok ? '#e8f6ec' : '#fdecea' },
          ]}>
          <Text style={{ color: testResult.ok ? '#1e6431' : '#a72a1d' }}>
            {testResult.ok ? '✓ ' : '✗ '}
            {testResult.msg}
          </Text>
        </View>
      )}

      <View style={{ height: 8 }} />
      <Button title="Save" onPress={save} disabled={busy} />
      <View style={{ height: 8 }} />
      <Button
        title="Cancel"
        color="#888"
        onPress={() => navigation.goBack()}
        disabled={busy}
      />

      <Text style={s.section}>Presets</Text>
      {PRESETS.map((p) => (
        <Pressable key={p.url} onPress={() => applyPreset(p)} style={s.preset}>
          <Text style={s.presetTitle}>{p.label}</Text>
          <Text style={s.presetUrl}>{p.url}</Text>
          <Text style={s.presetHint}>{p.hint}</Text>
        </Pressable>
      ))}

      <Text style={s.section}>Wi-Fi (LAN) — manual</Text>
      <Text style={s.muted}>
        For a real phone unplugged from USB but on the same Wi-Fi as your PC:
        find the PC's IPv4 address (e.g. <Text style={s.code}>192.168.1.100</Text>),
        and enter <Text style={s.code}>http://192.168.1.100:3000/api</Text>{' '}
        above. You must also allow inbound TCP/3000 in Windows Firewall on
        the PC. See <Text style={s.code}>docs/learn/phase-3-mobile.md</Text>.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  c: { padding: 20, gap: 6 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  section: { fontSize: 14, fontWeight: '700', marginTop: 20, marginBottom: 6 },
  label: { fontWeight: '600', marginTop: 14, marginBottom: 4 },
  hint: { color: '#666', fontSize: 12, marginTop: 4 },
  muted: { color: '#666', fontSize: 13, lineHeight: 18 },
  code: {
    fontFamily: 'monospace',
    fontSize: 12,
    backgroundColor: '#eee',
    paddingHorizontal: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    fontFamily: 'monospace',
  },
  resultBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 6,
  },
  preset: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: 6,
    marginBottom: 6,
    backgroundColor: 'white',
  },
  presetTitle: { fontWeight: '600' },
  presetUrl: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#345',
    marginTop: 2,
  },
  presetHint: { color: '#666', fontSize: 12, marginTop: 4 },
});
