import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './services/auth';
import LoginScreen from './screens/LoginScreen';
import ScanSetupScreen from './screens/ScanSetupScreen';
import CameraScreen from './screens/CameraScreen';
import SyncScreen from './screens/SyncScreen';
import AnalysisScreen from './screens/AnalysisScreen';
import SettingsScreen from './screens/SettingsScreen';

const Stack = createNativeStackNavigator();

function Routes() {
  const { token, ready } = useAuth();
  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  return (
    <Stack.Navigator>
      {token ? (
        <>
          <Stack.Screen name="ScanSetup" component={ScanSetupScreen} options={{ title: 'New scan' }} />
          <Stack.Screen name="Camera" component={CameraScreen} options={{ title: 'Scanning' }} />
          <Stack.Screen name="Sync" component={SyncScreen} options={{ title: 'Sync' }} />
          <Stack.Screen name="Analysis" component={AnalysisScreen} options={{ title: 'Analysis' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Backend settings' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Backend settings' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <Routes />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
