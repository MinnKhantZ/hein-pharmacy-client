import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import * as secureStorage from "../utils/secureStorage";
import { deviceAPI } from "./api";

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  getStableDeviceId() {
    // Prefer stable OS/build ids when available. Avoid Date.now() to prevent creating
    // new device records on every reinstall/session.
    return (
      Device.osInternalBuildId ||
      Device.osBuildId ||
      Device.modelId ||
      `${Platform.OS}-${Device.brand || "unknown"}-${Device.modelName || "unknown"}`
    );
  }

  getDeviceModelString() {
    return (
      Device.modelName ||
      `${Device.brand || "Unknown"} ${Device.deviceName || "Device"}`
    );
  }

  // Register for push notifications and get push token
  async registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Failed to get push token for push notification!");
        return null;
      }

      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) {
          console.error("Project ID not found in app.json");
          return null;
        }

        token = (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data;

        console.log("Push token:", token);
      } catch (error) {
        console.error("Error registering for push notifications:", error);
        return null;
      }
    } else {
      console.log("Must use physical device for Push Notifications");
    }

    return token;
  }

  // Save notification settings to local storage
  async saveNotificationSettings(settings) {
    try {
      await secureStorage.setItemAsync(
        "notificationSettings",
        JSON.stringify(settings),
      );
      return true;
    } catch (error) {
      console.error("Error saving notification settings:", error);
      return false;
    }
  }

  // Get notification settings from local storage
  async getNotificationSettings() {
    try {
      const settings = await secureStorage.getItemAsync("notificationSettings");
      if (settings) {
        return JSON.parse(settings);
      }
      // Default settings
      return {
        lowStockAlerts: true,
        salesNotifications: true,
        lowStockAlertTime: "09:00", // Default 9:00 AM
      };
    } catch (error) {
      console.error("Error getting notification settings:", error);
      return {
        lowStockAlerts: true,
        salesNotifications: true,
        lowStockAlertTime: "09:00",
      };
    }
  }

  // Get notification permissions status
  async getPermissionsStatus() {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }

  // Request notification permissions
  async requestPermissions() {
    const { status } = await Notifications.requestPermissionsAsync();
    return status;
  }

  // Listen for notification responses (when user taps notification)
  addNotificationResponseListener(callback) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Listen for notifications received while app is in foreground
  addNotificationReceivedListener(callback) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  // Cancel all notifications
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
  }

  // Get badge count
  async getBadgeCount() {
    return await Notifications.getBadgeCountAsync();
  }

  // Set badge count
  async setBadgeCount(count) {
    await Notifications.setBadgeCountAsync(count);
  }

  // Clear badge
  async clearBadge() {
    await Notifications.setBadgeCountAsync(0);
  }

  // Register device with server
  async registerDeviceWithServer(
    pushToken,
    notificationSettings = null,
    authToken = null,
  ) {
    try {
      if (!pushToken) {
        console.error("No push token provided for server registration");
        return false;
      }

      // Get current notification settings if not provided
      if (!notificationSettings) {
        notificationSettings = await this.getNotificationSettings();
      }

      const deviceInfo = {
        push_token: pushToken,
        device_id: this.getStableDeviceId(),
        device_model: this.getDeviceModelString(),
        low_stock_alerts: notificationSettings.lowStockAlerts,
        sales_notifications: notificationSettings.salesNotifications,
        low_stock_alert_time: notificationSettings.lowStockAlertTime
          ? `${notificationSettings.lowStockAlertTime}:00`
          : "09:00:00",
      };

      console.log("Registering device with server:", deviceInfo);

      // If auth token is provided, use it directly in the request
      const config = authToken
        ? {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        : {};

      const response = await deviceAPI.registerDevice(deviceInfo, config);

      if (response.data) {
        console.log("✅ Device registered with server successfully");
        return true;
      }

      return false;
    } catch (error) {
      console.error(
        "❌ Error registering device with server:",
        error.response?.data || error.message,
      );
      return false;
    }
  }

  // Update notification preferences on server
  async updateServerPreferences(pushToken, preferences) {
    try {
      if (!pushToken) {
        pushToken = await this.getStoredPushToken();
      }

      if (!pushToken) {
        console.log("No push token available to update preferences");
        return false;
      }

      const serverPrefs = {
        low_stock_alerts: preferences.lowStockAlerts,
        sales_notifications: preferences.salesNotifications,
        low_stock_alert_time: preferences.lowStockAlertTime
          ? `${preferences.lowStockAlertTime}:00`
          : undefined,
      };

      try {
        await deviceAPI.updatePreferences(pushToken, serverPrefs);
        console.log("✅ Server preferences updated successfully");
        return true;
      } catch (updateError) {
        // If device not found, register it first
        if (
          updateError.response?.status === 404 ||
          updateError.response?.data?.error === "Device not found"
        ) {
          console.log("Device not found, registering device first...");
          // Get auth token from secureStorage to ensure it's available
          const authToken = await secureStorage.getItemAsync("authToken");
          const registered = await this.registerDeviceWithServer(
            pushToken,
            preferences,
            authToken,
          );
          if (registered) {
            console.log("✅ Device registered and preferences set");
            return true;
          }
        }
        throw updateError;
      }
    } catch (error) {
      console.error(
        "❌ Error updating server preferences:",
        error.response?.data || error.message,
      );
      return false;
    }
  }

  // Unregister device from server
  async unregisterDeviceFromServer(pushToken) {
    try {
      if (!pushToken) {
        // Try to get stored token
        pushToken = await secureStorage.getItemAsync("pushToken");
      }

      if (!pushToken) {
        console.log("No push token to unregister");
        return false;
      }

      await deviceAPI.unregisterDevice(pushToken);
      await secureStorage.deleteItemAsync("pushToken");
      console.log("✅ Device unregistered from server");
      return true;
    } catch (error) {
      console.error("Error unregistering device:", error);
      return false;
    }
  }

  // Get stored push token
  async getStoredPushToken() {
    try {
      return await secureStorage.getItemAsync("pushToken");
    } catch (error) {
      console.error("Error getting stored push token:", error);
      return null;
    }
  }

  // Store push token locally
  async storeLocalPushToken(pushToken) {
    try {
      await secureStorage.setItemAsync("pushToken", pushToken);
      console.log("✅ Push token stored locally");
      return true;
    } catch (error) {
      console.error("Error storing push token:", error);
      return false;
    }
  }
}

export default new NotificationService();
