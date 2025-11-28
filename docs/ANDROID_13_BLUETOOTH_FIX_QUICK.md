# Android 13 Bluetooth Fix - Quick Guide

## The Problem
```
LOG  Scanning for Bluetooth devices...
WARN  Scan failed with error: NOT_STARTED
LOG  Devices returned from scanPrinters: []
```
Bluetooth scanning fails on Android 13 but works on Android 11.

## The Solution (3 Steps)

### Step 1: Rebuild the App
The fix requires native code changes, so you MUST rebuild:

```bash
# Clean rebuild
npx expo prebuild --clean
npx expo run:android
```

### Step 2: Grant Permissions
When you open the app:
1. Tap "Print Receipt" button
2. When prompted: "Allow app to connect to nearby devices?"
3. Tap **"Allow"**

### Step 3: Test
1. Try scanning again
2. Should now see paired Bluetooth devices
3. No more "NOT_STARTED" error

## What Was Changed

1. ✅ Added config plugin for Android permissions
2. ✅ Added `neverForLocation` flag to BLUETOOTH_SCAN
3. ✅ Enhanced permission checking logic
4. ✅ Better error messages

## Still Not Working?

### Check 1: Did you rebuild?
```bash
npx expo prebuild --clean && npx expo run:android
```

### Check 2: Are permissions granted?
- Settings > Apps > Hein Pharmacy > Permissions
- "Nearby devices" should be **Allowed**

### Check 3: Is printer paired?
- Settings > Connected devices > Bluetooth
- Your printer should appear in "Paired devices"

### Check 4: Check the logs
Look for this in logs:
```
LOG  Current Bluetooth permissions: { scanStatus: true, connectStatus: true }
```
Both should be `true`.

## Why Android 13 is Different

| Version | What It Needs |
|---------|---------------|
| Android 11 | Location permission + Location ON |
| Android 13 | Only Bluetooth permission (with neverForLocation flag) |

Android 12+ introduced new Bluetooth permissions that don't require location services if you add the `neverForLocation` flag. This is a privacy improvement.

## For EAS Builds

If you're building with EAS:
```bash
eas build --platform android --profile development
```
Then install the new build on your device.

## Need Help?

Check the detailed documentation:
- `docs/ANDROID_13_BLUETOOTH_FIX.md` - Full technical details
- `docs/RECEIPT_PRINTING.md` - General printing guide
