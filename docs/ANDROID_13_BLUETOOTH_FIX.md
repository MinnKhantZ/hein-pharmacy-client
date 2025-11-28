# Android 13 Bluetooth Scanning Fix

## Problem
Bluetooth scanning failed on Android 13 (API level 33) with error "NOT_STARTED" while working perfectly on Android 11. This is due to stricter Bluetooth permission requirements introduced in Android 12+.

## Root Cause
Starting with Android 12 (API level 31), Google changed how Bluetooth permissions work:

1. **Android 11 and below**: Required `ACCESS_FINE_LOCATION` permission for Bluetooth scanning
2. **Android 12+ (including 13)**: Require `BLUETOOTH_SCAN` and `BLUETOOTH_CONNECT` permissions

The key issue: On Android 12+, the `BLUETOOTH_SCAN` permission needs the `android:usesPermissionFlags="neverForLocation"` attribute in AndroidManifest.xml to scan for Bluetooth devices WITHOUT requiring location services. Without this flag, the scan won't start even if the permission is granted.

## Solution Implemented

### 1. Created Config Plugin (`plugins/withAndroidBluetoothPermissions.js`)
This Expo config plugin automatically modifies the AndroidManifest.xml during build to add the required `neverForLocation` flag:

```javascript
const { withAndroidManifest } = require('@expo/config-plugins');

const withAndroidBluetoothPermissions = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;
    
    // Add BLUETOOTH_SCAN with neverForLocation flag
    androidManifest['uses-permission'].push({
      $: {
        'android:name': 'android.permission.BLUETOOTH_SCAN',
        'android:usesPermissionFlags': 'neverForLocation',
      },
    });
    
    return config;
  });
};
```

### 2. Updated `app.json`
Added the config plugin to the plugins array:

```json
"plugins": [
  "./plugins/withAndroidBluetoothPermissions",
  "expo-updates",
  // ... other plugins
]
```

### 3. Enhanced Permission Request Logic
Updated `services/printerService.native.ts` to:
- Check permission status before requesting
- Better error handling and logging
- Detect permanently denied permissions
- Provide helpful error messages

Key changes:
```typescript
if (androidVersion >= 31) {
  // Check current status first
  const scanStatus = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
  );
  const connectStatus = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
  );
  
  // If already granted, return immediately
  if (scanStatus && connectStatus) {
    return true;
  }
  
  // Request with better error handling
  const results = await PermissionsAndroid.requestMultiple(permissions);
  console.log('Permission request results:', results);
}
```

### 4. Improved Error Messages
Enhanced the scanPrinters error handling to provide specific guidance:

```typescript
if (scanError?.message?.includes('NOT_STARTED')) {
  console.error('Bluetooth scan NOT_STARTED - This usually indicates:');
  console.error('1. Permissions not granted (check app settings)');
  console.error('2. AndroidManifest missing neverForLocation flag');
  console.error('3. Need to rebuild the app after updating config plugin');
}
```

## How to Apply This Fix

### For Development Build:

1. **Rebuild the app** - This is CRITICAL as the config plugin modifies native code:
   ```bash
   npx expo prebuild --clean
   npx expo run:android
   ```

### For EAS Build:

1. **Create a new build**:
   ```bash
   eas build --platform android --profile development
   ```
   
2. **Install the new build** on your Android 13 device

### Testing the Fix:

1. **Install the rebuilt app** on Android 13
2. **Open the app** and navigate to print receipt
3. **When prompted**, grant Bluetooth permissions:
   - "Allow [app] to connect to nearby devices?"
   - Tap "Allow"
4. **Scan should now work** without requiring location services

## Verification Steps

1. Check permissions are properly granted:
   - Settings > Apps > Hein Pharmacy > Permissions
   - "Nearby devices" should be "Allowed"

2. Check logs for confirmation:
   ```
   LOG  Scanning for Bluetooth devices...
   LOG  Current Bluetooth permissions: { scanStatus: true, connectStatus: true }
   LOG  Paired devices: [...]
   LOG  Found devices: [...]
   ```

3. Scan should return paired devices without "NOT_STARTED" error

## Why This Works

### Without neverForLocation Flag:
- Android requires location services to be ON
- Even if BLUETOOTH_SCAN permission is granted, scan won't start
- Results in "NOT_STARTED" error

### With neverForLocation Flag:
- Android knows you're not using Bluetooth to determine location
- Scan works WITHOUT location services
- Only Bluetooth permission required, not location

## Android Version Compatibility

| Android Version | API Level | Permissions Required | Location Required? |
|----------------|-----------|---------------------|-------------------|
| Android 11 and below | ≤30 | ACCESS_FINE_LOCATION | Yes |
| Android 12 | 31 | BLUETOOTH_SCAN, BLUETOOTH_CONNECT | No (with neverForLocation) |
| Android 13 | 33 | BLUETOOTH_SCAN, BLUETOOTH_CONNECT | No (with neverForLocation) |
| Android 14 | 34 | BLUETOOTH_SCAN, BLUETOOTH_CONNECT | No (with neverForLocation) |

## Troubleshooting

### Still getting NOT_STARTED error?

1. **Did you rebuild?**
   - Config plugins only take effect after rebuild
   - Run: `npx expo prebuild --clean && npx expo run:android`

2. **Check permissions are granted:**
   - Settings > Apps > Hein Pharmacy > Permissions
   - "Nearby devices" should be enabled

3. **Check printer is paired:**
   - Settings > Connected devices > Bluetooth
   - Your printer should be in the paired devices list

4. **Check logs for permission status:**
   ```
   LOG  Current Bluetooth permissions: { scanStatus: true, connectStatus: true }
   ```
   Both should be `true`

5. **Reset permissions and try again:**
   - Settings > Apps > Hein Pharmacy > Permissions
   - Revoke "Nearby devices"
   - Open app again and grant when prompted

## Additional Notes

- The `neverForLocation` flag tells Android that you're not using Bluetooth scanning to determine the user's physical location
- This allows the app to scan for Bluetooth devices without requesting location permissions or requiring location services to be enabled
- Android 12+ introduced this as a privacy improvement to prevent apps from tracking users via Bluetooth without proper location permissions
- For apps that DO need location (e.g., to show nearby stores), you would still request location permissions and NOT use the neverForLocation flag

## References

- [Android 12 Bluetooth permissions changes](https://developer.android.com/guide/topics/connectivity/bluetooth/permissions)
- [BLUETOOTH_SCAN permission documentation](https://developer.android.com/reference/android/Manifest.permission#BLUETOOTH_SCAN)
- [Expo Config Plugins](https://docs.expo.dev/guides/config-plugins/)
