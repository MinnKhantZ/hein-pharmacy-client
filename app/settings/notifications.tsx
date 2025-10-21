import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '../../contexts/NotificationContext';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
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
    lowStockAlertTime: '09:00',
  });

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Helper function to convert HH:MM string to Date object for picker
  const timeStringToDate = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0);
    return date;
  };

  // Helper function to convert Date object to HH:MM string
  const dateToTimeString = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Load notification settings from context when component mounts
  useEffect(() => {
    if (savedNotificationSettings) {
      setTempNotificationSettings(savedNotificationSettings);
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
        (tempNotificationSettings.lowStockAlerts || tempNotificationSettings.salesNotifications) &&
        permissionStatus !== 'granted'
      ) {
        const granted = await requestPermissions();
        if (!granted) {
          Alert.alert(
            t('Permissions Required'),
            t('Please enable notifications in your device settings to receive alerts.')
          );
          setSaving(false);
          return;
        }
      }

      await updateNotificationSettings(tempNotificationSettings);

      Alert.alert(t('Success'), t('Notification settings updated successfully'));
    } catch {
      Alert.alert(t('Error'), t('Failed to update notification settings'));
    } finally {
      setSaving(false);
    }
  };

  // Handle native time picker change
  const handleDateTimePickerChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (selectedDate) {
      const originalMinutes = selectedDate.getMinutes();
      // Round minutes to nearest multiple of 10
      const roundedMinutes = Math.round(originalMinutes / 10) * 10;
      selectedDate.setMinutes(roundedMinutes);

      const timeString = dateToTimeString(selectedDate);

      // Show alert if time was rounded
      if (originalMinutes !== roundedMinutes) {
        Alert.alert(
          t('Time Adjusted'),
          t('Notification time has been rounded to the nearest 10-minute interval.')
        );
      }

      // Update temp notification settings with new time
      setTempNotificationSettings({
        ...tempNotificationSettings,
        lowStockAlertTime: timeString,
      });

      if (Platform.OS === 'android') {
        // On Android, close picker after selection
        setShowTimePicker(false);
      }
    }
  };

  // Format time for display in 12-hour AM/PM format
  const formatTimeForDisplay = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const openTimePicker = () => {
    setShowTimePicker(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollView, { paddingBottom: Math.max(insets.bottom, 20) }]}
      >
        <View style={styles.settingsSection}>
          <View style={styles.toggleItem}>
            <View style={styles.toggleInfo}>
              <Text style={styles.settingText}>{t('Enable Low Stock Alerts')}</Text>
              <Text style={styles.settingDescription}>{t('Get notified when items are running low')}</Text>
            </View>
            <Switch
              value={tempNotificationSettings.lowStockAlerts}
              onValueChange={(value) => handleNotificationToggle('lowStockAlerts', value)}
              trackColor={{ false: '#ddd', true: '#4CAF50' }}
              thumbColor={tempNotificationSettings.lowStockAlerts ? '#fff' : '#f4f3f4'}
            />
          </View>

          {tempNotificationSettings.lowStockAlerts && (
            <View style={styles.timePickerContainer}>
              <Text style={styles.timePickerLabel}>{t('Alert Time')}</Text>
              <TouchableOpacity style={styles.timePickerButton} onPress={openTimePicker}>
                <Text style={styles.timePickerText}>
                  {formatTimeForDisplay(tempNotificationSettings.lowStockAlertTime || '09:00')}
                </Text>
                <Text style={styles.timePickerIcon}>🕐</Text>
              </TouchableOpacity>
              <Text style={styles.timePickerHint}>
                {t('Daily low stock notifications will be sent at this time')} ({t('rounded to nearest 10 minutes')})
              </Text>
            </View>
          )}

          <View style={styles.toggleItem}>
            <View style={styles.toggleInfo}>
              <Text style={styles.settingText}>{t('Enable Sales Notifications')}</Text>
              <Text style={styles.settingDescription}>{t('Get notified about daily sales')}</Text>
            </View>
            <Switch
              value={tempNotificationSettings.salesNotifications}
              onValueChange={(value) => handleNotificationToggle('salesNotifications', value)}
              trackColor={{ false: '#ddd', true: '#4CAF50' }}
              thumbColor={tempNotificationSettings.salesNotifications ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity 
          style={[styles.button, styles.saveButton, styles.fullWidthButton]} 
          onPress={handleSaveNotificationSettings}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>{t('Save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Native Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={timeStringToDate(tempNotificationSettings.lowStockAlertTime || '09:00')}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateTimePickerChange}
          is24Hour={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    padding: 20,
  },
  settingsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  timePickerContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timePickerLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  timePickerText: {
    fontSize: 16,
    color: '#333',
  },
  timePickerIcon: {
    fontSize: 18,
    color: '#666',
  },
  timePickerHint: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: {
    backgroundColor: '#2196F3',
  },
  fullWidthButton: {
    flex: 1,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
