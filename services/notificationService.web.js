import * as secureStorage from "../utils/secureStorage";

/**
 * Web implementation of Notification Service
 * Push notifications are not supported on web, but we provide mock implementations
 * to maintain API compatibility
 */

class NotificationService {
  // Register for push notifications (not supported on web)
  async registerForPushNotificationsAsync() {
    console.log("Push notifications are not supported on web platform");
    return null;
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
      const defaultSettings = {
        lowStockAlerts: true,
        salesNotifications: true,
        lowStockAlertTime: "09:00",
        expiryAlerts: true,
        expiryAlertDaysBefore: 30,
        expiryAlertTime: "09:00",
      };

      const settings = await secureStorage.getItemAsync("notificationSettings");
      if (settings) {
        return {
          ...defaultSettings,
          ...JSON.parse(settings),
        };
      }
      return defaultSettings;
    } catch (error) {
      console.error("Error getting notification settings:", error);
      return {
        lowStockAlerts: true,
        salesNotifications: true,
        lowStockAlertTime: "09:00",
        expiryAlerts: true,
        expiryAlertDaysBefore: 30,
        expiryAlertTime: "09:00",
      };
    }
  }

  // Get notification permissions status (not applicable on web)
  async getPermissionsStatus() {
    return "granted"; // Mock as granted for web
  }

  // Request notification permissions (not applicable on web)
  async requestPermissions() {
    return "granted"; // Mock as granted for web
  }

  // Listen for notification responses (no-op on web)
  addNotificationResponseListener(_callback) {
    void _callback;
    console.log("Notification response listener not supported on web");
    return { remove: () => {} }; // Return mock subscription
  }

  // Listen for notifications received (no-op on web)
  addNotificationReceivedListener(_callback) {
    void _callback;
    console.log("Notification received listener not supported on web");
    return { remove: () => {} }; // Return mock subscription
  }

  // Cancel all notifications (no-op on web)
  async cancelAllNotifications() {
    console.log("Cancel notifications not applicable on web");
  }

  // Get badge count (not supported on web)
  async getBadgeCount() {
    return 0;
  }

  // Set badge count (not supported on web)
  async setBadgeCount(_count) {
    void _count;
    console.log("Badge count not supported on web");
  }

  // Clear badge (not supported on web)
  async clearBadge() {
    console.log("Badge clear not supported on web");
  }

  // Register device with server (not applicable for web browsers)
  async registerDeviceWithServer(
    _pushToken,
    _notificationSettings = null,
    _authToken = null,
  ) {
    void _pushToken;
    void _notificationSettings;
    void _authToken;
    console.log("Device registration not applicable for web browsers");
    return false;
  }

  // Update notification preferences on server (not applicable for web)
  async updateServerPreferences(_pushToken, preferences) {
    void _pushToken;
    console.log("Server preferences update not applicable for web browsers");
    // Still save locally for consistency
    await this.saveNotificationSettings(preferences);
    return true;
  }

  // Unregister device from server (not applicable for web)
  async unregisterDeviceFromServer(_pushToken) {
    void _pushToken;
    console.log("Device unregistration not applicable for web browsers");
    return false;
  }

  // Get stored push token (always null on web)
  async getStoredPushToken() {
    return null;
  }

  // Store push token locally (no-op on web)
  async storeLocalPushToken(_pushToken) {
    void _pushToken;
    console.log("Push token storage not applicable on web");
    return false;
  }
}

export default new NotificationService();
