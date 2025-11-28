const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Config plugin to add proper Bluetooth permissions for Android 12+ (API 31+)
 * This adds the neverForLocation flag to BLUETOOTH_SCAN permission which is required
 * for Android 12+ to scan without needing location services
 */
const withAndroidBluetoothPermissions = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    // Ensure uses-permission array exists
    if (!androidManifest['uses-permission']) {
      androidManifest['uses-permission'] = [];
    }

    // Check if BLUETOOTH_SCAN permission already exists
    const bluetoothScanIndex = androidManifest['uses-permission'].findIndex(
      (perm) => perm.$['android:name'] === 'android.permission.BLUETOOTH_SCAN'
    );

    if (bluetoothScanIndex !== -1) {
      // Update existing permission to add neverForLocation flag
      androidManifest['uses-permission'][bluetoothScanIndex].$['android:usesPermissionFlags'] = 'neverForLocation';
    } else {
      // Add new permission with neverForLocation flag
      androidManifest['uses-permission'].push({
        $: {
          'android:name': 'android.permission.BLUETOOTH_SCAN',
          'android:usesPermissionFlags': 'neverForLocation',
        },
      });
    }

    // Ensure BLUETOOTH_CONNECT exists (should already be there from app.json)
    const bluetoothConnectExists = androidManifest['uses-permission'].some(
      (perm) => perm.$['android:name'] === 'android.permission.BLUETOOTH_CONNECT'
    );

    if (!bluetoothConnectExists) {
      androidManifest['uses-permission'].push({
        $: {
          'android:name': 'android.permission.BLUETOOTH_CONNECT',
        },
      });
    }

    return config;
  });
};

module.exports = withAndroidBluetoothPermissions;
