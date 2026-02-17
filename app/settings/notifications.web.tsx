import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNotifications } from "../../contexts/NotificationContext";
import { useBreakpoint } from "../../utils/responsive";

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const breakpoint = useBreakpoint();
  const isDesktop = breakpoint === "desktop" || breakpoint === "largeDesktop";
  const {
    notificationSettings: savedNotificationSettings,
    updateSettings: updateNotificationSettings,
    permissionStatus,
    requestPermissions,
  } = useNotifications();

  // Temporary state for editing notification settings (only saved on "Done")
  const [tempNotificationSettings, setTempNotificationSettings] = useState({
    lowStockAlerts: true,
    salesNotifications: true,
    lowStockAlertTime: "09:00",
    expiryAlerts: true,
    expiryAlertDaysBefore: 30,
    expiryAlertTime: "09:00",
  });

  const [saving, setSaving] = useState(false);

  // Load notification settings from context when component mounts
  useEffect(() => {
    if (savedNotificationSettings) {
      setTempNotificationSettings((prev) => ({
        ...prev,
        ...savedNotificationSettings,
      }));
    }
  }, [savedNotificationSettings]);

  // Handler to toggle notification settings (only updates local state, not server)
  const handleNotificationToggle = (key: string, value: boolean) => {
    setTempNotificationSettings({
      ...tempNotificationSettings,
      [key]: value,
    });
  };

  // Handler to save notification settings (called when "Done" is pressed)
  const handleSaveNotificationSettings = async () => {
    setSaving(true);

    try {
      // Check if we need to request permissions
      if (
        (tempNotificationSettings.lowStockAlerts ||
          tempNotificationSettings.salesNotifications ||
          tempNotificationSettings.expiryAlerts) &&
        permissionStatus !== "granted"
      ) {
        const granted = await requestPermissions();
        if (!granted) {
          Alert.alert(
            t("Permissions Required"),
            t(
              "Please enable notifications in your device settings to receive alerts.",
            ),
          );
          setSaving(false);
          return;
        }
      }

      await updateNotificationSettings(tempNotificationSettings);

      Alert.alert(
        t("Success"),
        t("Notification settings updated successfully"),
      );
    } catch {
      Alert.alert(t("Error"), t("Failed to update notification settings"));
    } finally {
      setSaving(false);
    }
  };

  // Handle time input change (web version)
  const handleTimeChange = (event: any) => {
    const timeString = event.target.value; // Format: HH:MM

    // Round to nearest 10 minutes
    const [hours, minutes] = timeString.split(":").map(Number);
    const roundedMinutes = Math.round(minutes / 10) * 10;
    const roundedTime = `${hours.toString().padStart(2, "0")}:${roundedMinutes.toString().padStart(2, "0")}`;

    setTempNotificationSettings({
      ...tempNotificationSettings,
      lowStockAlertTime: roundedTime,
    });

    if (minutes !== roundedMinutes) {
      Alert.alert(
        t("Time Adjusted"),
        t(
          "Notification time has been rounded to the nearest 10-minute interval.",
        ),
      );
    }
  };

  const handleExpiryTimeChange = (event: any) => {
    const timeString = event.target.value; // Format: HH:MM

    setTempNotificationSettings({
      ...tempNotificationSettings,
      expiryAlertTime: timeString,
    });
  };

  const handleExpiryDaysChange = (event: any) => {
    const value = parseInt(event.target.value, 10);
    setTempNotificationSettings({
      ...tempNotificationSettings,
      expiryAlertDaysBefore: Number.isNaN(value) ? 0 : Math.max(0, value),
    });
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right", "bottom"]}
    >
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollView,
          { paddingBottom: Math.max(insets.bottom, 20) },
        ]}
      >
        <View style={styles.settingsSection}>
          <View style={styles.toggleItem}>
            <View style={styles.toggleInfo}>
              <Text style={styles.settingText}>
                {t("Enable Low Stock Alerts")}
              </Text>
              <Text style={styles.settingDescription}>
                {t("Get notified when items are running low")}
              </Text>
            </View>
            <Switch
              value={tempNotificationSettings.lowStockAlerts}
              onValueChange={(value) =>
                handleNotificationToggle("lowStockAlerts", value)
              }
              trackColor={{ false: "#ddd", true: "#4CAF50" }}
              thumbColor={
                tempNotificationSettings.lowStockAlerts ? "#fff" : "#f4f3f4"
              }
            />
          </View>

          {tempNotificationSettings.lowStockAlerts && (
            <View style={styles.timePickerContainer}>
              <Text style={styles.timePickerLabel}>{t("Alert Time")}</Text>
              <View style={styles.timePickerButton}>
                <input
                  type="time"
                  value={tempNotificationSettings.lowStockAlertTime || "09:00"}
                  onChange={handleTimeChange}
                  style={{
                    padding: "12px",
                    fontSize: "16px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    width: "100%",
                    maxWidth: isDesktop ? "200px" : "100%",
                  }}
                />
              </View>
              <Text style={styles.timePickerHint}>
                {t("Daily low stock notifications will be sent at this time")} (
                {t("rounded to nearest 10 minutes")})
              </Text>
              <Text style={styles.timePickerNote}>
                {t(
                  "Note: Push notifications are not supported on web. Configure these settings on the mobile app.",
                )}
              </Text>
            </View>
          )}

          <View style={styles.toggleItem}>
            <View style={styles.toggleInfo}>
              <Text style={styles.settingText}>
                {t("Enable Sales Notifications")}
              </Text>
              <Text style={styles.settingDescription}>
                {t("Get notified about daily sales")}
              </Text>
            </View>
            <Switch
              value={tempNotificationSettings.salesNotifications}
              onValueChange={(value) =>
                handleNotificationToggle("salesNotifications", value)
              }
              trackColor={{ false: "#ddd", true: "#4CAF50" }}
              thumbColor={
                tempNotificationSettings.salesNotifications ? "#fff" : "#f4f3f4"
              }
            />
          </View>

          <View style={styles.toggleItem}>
            <View style={styles.toggleInfo}>
              <Text style={styles.settingText}>
                {t("Enable Expiration Alerts")}
              </Text>
              <Text style={styles.settingDescription}>
                {t("Get notified daily before items expire")}
              </Text>
            </View>
            <Switch
              value={tempNotificationSettings.expiryAlerts}
              onValueChange={(value) =>
                handleNotificationToggle("expiryAlerts", value)
              }
              trackColor={{ false: "#ddd", true: "#4CAF50" }}
              thumbColor={
                tempNotificationSettings.expiryAlerts ? "#fff" : "#f4f3f4"
              }
            />
          </View>

          {tempNotificationSettings.expiryAlerts && (
            <View style={styles.timePickerContainer}>
              <Text style={styles.timePickerLabel}>
                {t("Expiration Alert Days Before")}
              </Text>
              <View style={styles.timePickerButton}>
                <input
                  type="number"
                  min={0}
                  value={tempNotificationSettings.expiryAlertDaysBefore}
                  onChange={handleExpiryDaysChange}
                  style={{
                    padding: "12px",
                    fontSize: "16px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    width: "100%",
                    maxWidth: isDesktop ? "200px" : "100%",
                  }}
                />
              </View>

              <Text style={styles.timePickerLabel}>
                {t("Expiration Alert Time")}
              </Text>
              <View style={styles.timePickerButton}>
                <input
                  type="time"
                  value={tempNotificationSettings.expiryAlertTime || "09:00"}
                  onChange={handleExpiryTimeChange}
                  style={{
                    padding: "12px",
                    fontSize: "16px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    width: "100%",
                    maxWidth: isDesktop ? "200px" : "100%",
                  }}
                />
              </View>
              <Text style={styles.timePickerHint}>
                {t("Daily expiration notifications will be sent at this time")}
              </Text>
              <Text style={styles.timePickerNote}>
                {t(
                  "Note: Push notifications are not supported on web. Configure these settings on the mobile app.",
                )}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View
        style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 20) }]}
      >
        <TouchableOpacity
          style={[styles.button, styles.saveButton, styles.fullWidthButton]}
          onPress={handleSaveNotificationSettings}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>{t("Save")}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
  },
  scrollView: {
    padding: 20,
  },
  settingsSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  toggleItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: "#666",
  },
  timePickerContainer: {
    marginTop: 12,
    marginBottom: 12,
    paddingTop: 12,
  },
  timePickerLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  timePickerButton: {
    marginBottom: 8,
  },
  timePickerHint: {
    fontSize: 12,
    color: "#999",
    marginTop: 8,
  },
  timePickerNote: {
    fontSize: 12,
    color: "#ff9800",
    marginTop: 8,
    fontStyle: "italic",
  },
  actions: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
  },
  fullWidthButton: {
    width: "100%",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
