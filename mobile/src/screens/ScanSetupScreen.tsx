import { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  requestCameraPermission,
  requestLocationPermission,
} from '../services/permissions';
import { useAuth } from '../services/auth';

export default function ScanSetupScreen({ navigation }: any) {
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [mapName, setMapName] = useState('');
  const [pathName, setPathName] = useState('');

  async function start() {
    try {
      if (!mapName || !pathName) {
        Alert.alert('Missing names', 'Please name both the map and the path.');
        return;
      }
      if (!(await requestCameraPermission())) {
        Alert.alert('Camera permission required');
        return;
      }
      if (!(await requestLocationPermission())) {
        Alert.alert('Location permission required');
        return;
      }
      navigation.navigate('Camera', { mapName, pathName });
    } catch (e: any) {
      Alert.alert('Start scan failed', String(e?.message ?? e));
      console.error('Start scan error:', e);
    }
  }

  return (
    <View style={[s.c, { paddingBottom: Math.max(insets.bottom, 16) + 32 }]}>
      <Text style={s.title}>New scan</Text>
      <TextInput
        style={s.input}
        placeholder="Map name (e.g., Downtown Survey)"
        value={mapName}
        onChangeText={setMapName}
      />
      <TextInput
        style={s.input}
        placeholder="Path name (e.g., Main St)"
        value={pathName}
        onChangeText={setPathName}
      />
      <Button title="Start scan" onPress={start} />
      <View style={{ height: 16 }} />
      <Button title="Sync pending scans" onPress={() => navigation.navigate('Sync')} />
      <View style={{ height: 8 }} />
      <Button title="View analytics" onPress={() => navigation.navigate('Analysis')} />
      <View style={{ height: 8 }} />
      <Button
        title="Backend settings"
        color="#888"
        onPress={() => navigation.navigate('Settings')}
      />
      <View style={{ flex: 1 }} />
      <Button title="Log out" color="#c0392b" onPress={logout} />
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10 },
});
