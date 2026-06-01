import { Platform, PermissionsAndroid } from 'react-native';

// Uses RN's built-in PermissionsAndroid for both camera and location instead of
// vision-camera's Camera.requestCameraPermission(). They request the same OS-level
// permission, but PermissionsAndroid is always available even if vision-camera's
// native module isn't fully initialized yet.

export async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const res = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA,
    {
      title: 'Camera permission',
      message: 'Needed to detect potholes on the road.',
      buttonPositive: 'OK',
    },
  );
  return res === PermissionsAndroid.RESULTS.GRANTED;
}

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const res = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Location permission',
      message: 'We need GPS so each pothole can be tagged with its location.',
      buttonPositive: 'OK',
    },
  );
  return res === PermissionsAndroid.RESULTS.GRANTED;
}
