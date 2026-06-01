import { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, Pressable } from 'react-native';
import { useAuth } from '../services/auth';
import { getApiBaseUrl } from '../api/client';

export default function LoginScreen({ navigation }: any) {
  const { login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function go(action: 'login' | 'register') {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Email and password are required.');
      return;
    }
    setBusy(true);
    try {
      if (action === 'login') await login(email, password);
      else await register(email, password);
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message ?? e?.message ?? 'Failed';
      Alert.alert(action === 'login' ? 'Login failed' : 'Register failed', msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.c}>
      <Text style={s.title}>Road Quality Visualizer</Text>
      <TextInput
        style={s.input}
        placeholder="email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={s.input}
        placeholder="password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title={busy ? '...' : 'Log in'} onPress={() => go('login')} disabled={busy} />
      <View style={{ height: 8 }} />
      <Button title="Register new account" onPress={() => go('register')} disabled={busy} />
      <View style={{ height: 24 }} />
      <Pressable
        onPress={() => navigation.navigate('Settings')}
        style={s.footerLink}>
        <Text style={s.footerLinkText}>Backend: {getApiBaseUrl()}</Text>
        <Text style={s.footerLinkAction}>Tap to change</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '600', textAlign: 'center', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10 },
  footerLink: {
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  footerLinkText: { color: '#666', fontSize: 12, fontFamily: 'monospace' },
  footerLinkAction: { color: '#2c3e50', fontSize: 12, marginTop: 2, fontWeight: '600' },
});
