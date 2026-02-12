import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, AppState } from "react-native";
import notificationService from "../services/notificationService";
import * as secureStorage from "../utils/secureStorage";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [expoPushToken, setExpoPushToken] = useState("");
  const [notificationSettings, setNotificationSettings] = useState({
    lowStockAlerts: true,
    salesNotifications: true,
    lowStockAlertTime: "09:00", // Default 9:00 AM
  });
  const [permissionStatus, setPermissionStatus] = useState("undetermined");
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    loadSettings();
    refreshPushTokenAndSync("startup");

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        refreshPushTokenAndSync("foreground");
      }
    });

    const responseSubscription =
      notificationService.addNotificationResponseListener(
        handleNotificationResponse,
      );

    const receivedSubscription =
      notificationService.addNotificationReceivedListener(
        handleNotificationReceived,
      );

    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
      subscription?.remove?.();
    };
  }, [
    loadSettings,
    refreshPushTokenAndSync,
    handleNotificationResponse,
    handleNotificationReceived,
  ]);

  const loadSettings = useCallback(async () => {
    const settings = await notificationService.getNotificationSettings();
    setNotificationSettings(settings);
  }, []);

  const refreshPushTokenAndSync = useCallback(async (reason = "manual") => {
    try {
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;

      const token =
        await notificationService.registerForPushNotificationsAsync();
      if (token) {
        setExpoPushToken(token);
        console.log(`Expo Push Token (${reason}):`, token);

        // Store token locally immediately so login can use it
        await notificationService.storeLocalPushToken(token);

        // Always sync token to server if user is logged in (token may have rotated)
        try {
          const authToken = await secureStorage.getItemAsync("authToken");
          if (authToken) {
            console.log(
              "User is logged in, syncing device token with server...",
            );
            await notificationService.registerDeviceWithServer(
              token,
              null,
              authToken,
            );
          } else {
            console.log(
              "User not logged in yet. Device will be registered after login.",
            );
          }
        } catch (serverError) {
          console.error("Error registering device with server:", serverError);
          // Don't fail if server registration fails
        }
      }

      const status = await notificationService.getPermissionsStatus();
      setPermissionStatus(status);
    } catch (error) {
      console.error("Error registering for push notifications:", error);
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  const handleNotificationResponse = useCallback((response) => {
    const data = response.notification.request.content.data;
    console.log("Notification tapped:", data);

    // Handle different notification types
    if (data.type === "low_stock") {
      // Navigate to inventory screen or show item details
      console.log("Low stock notification tapped:", data.itemName);
    } else if (data.type === "daily_sales") {
      // Navigate to sales or income screen
      console.log("Daily sales notification tapped");
    }
  }, []);

  const handleNotificationReceived = useCallback((notification) => {
    console.log("Notification received:", notification);
    // Clear badge when notification is received
    notificationService.clearBadge();
  }, []);

  const updateSettings = async (newSettings) => {
    // Save locally first
    const success =
      await notificationService.saveNotificationSettings(newSettings);
    if (success) {
      setNotificationSettings(newSettings);

      // Sync with server if user is logged in
      try {
        const authToken = await secureStorage.getItemAsync("authToken");
        if (authToken) {
          if (expoPushToken) {
            await notificationService.updateServerPreferences(
              expoPushToken,
              newSettings,
            );
          } else {
            console.log(
              "No push token yet, preferences will sync when device is registered",
            );
          }
        } else {
          console.log("User not logged in, preferences will sync after login");
        }
      } catch (error) {
        console.error("Error syncing preferences with server:", error);
        // Don't fail the local update if server sync fails
      }

      return true;
    }
    return false;
  };

  const requestPermissions = async () => {
    const status = await notificationService.requestPermissions();
    setPermissionStatus(status);

    if (status === "granted") {
      await refreshPushTokenAndSync("permissions");
      return true;
    } else {
      Alert.alert(
        "Permissions Required",
        "Please enable notifications in your device settings to receive alerts.",
        [{ text: "OK" }],
      );
      return false;
    }
  };

  const value = {
    expoPushToken,
    notificationSettings,
    permissionStatus,
    updateSettings,
    requestPermissions,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
}
