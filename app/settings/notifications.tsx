import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
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
  const [tempHour, setTempHour] = useState('09');
  const [tempMinute, setTempMinute] = useState('00');
  const [saving, setSaving] = useState(false);

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

  // Handler to update low stock alert time
  const handleTimeChange = async () => {
    // Validate inputs
    const hours = parseInt(tempHour) || 0;
    const minutes = parseInt(tempMinute) || 0;

    if (hours < 0 || hours > 23) {
      Alert.alert(t('Error'), t('Hour must be between 0 and 23'));
      return;
    }

    if (minutes < 0 || minutes > 59) {
      Alert.alert(t('Error'), t('Minute must be between 0 and 59'));
      return;
    }

    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    // Update temp notification settings with new time
    setTempNotificationSettings({
      ...tempNotificationSettings,
      lowStockAlertTime: timeString,
    });

    setShowTimePicker(false);
  };

  const openTimePicker = () => {
    const currentTime = tempNotificationSettings.lowStockAlertTime || '09:00';
    const [hour, minute] = currentTime.split(':');
    setTempHour(hour);
    setTempMinute(minute);
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
                  {tempNotificationSettings.lowStockAlertTime || '09:00'}
                </Text>
                <Text style={styles.timePickerIcon}>🕐</Text>
              </TouchableOpacity>
              <Text style={styles.timePickerHint}>
                {t('Daily low stock notifications will be sent at this time')}
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

      {/* Time Picker Modal */}
      <Modal visible={showTimePicker} animationType="slide" transparent>
        <View style={styles.timePickerModalOverlay}>
          <View style={styles.timePickerModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('Set Alert Time')}</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timePickerInputContainer}>
              <View>
                <Text style={styles.timeInputLabel}>{t('Hour')} (00-23)</Text>
                <TextInput
                  style={styles.timeInput}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="09"
                  value={tempHour}
                  onChangeText={(text) => setTempHour(text)}
                />
              </View>

              <Text style={styles.timeInputSeparator}>:</Text>

              <View>
                <Text style={styles.timeInputLabel}>{t('Minute')} (00-59)</Text>
                <TextInput
                  style={styles.timeInput}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="00"
                  value={tempMinute}
                  onChangeText={(text) => setTempMinute(text)}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { flex: 1, marginRight: 10 }]}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.cancelButtonText}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton, { flex: 1 }]} onPress={handleTimeChange}>
                <Text style={styles.saveButtonText}>{t('Done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  timePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '80%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
    padding: 4,
  },
  timePickerInputContainer: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  timeInputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    textAlign: 'center',
    width: 60,
    marginHorizontal: 8,
  },
  timeInputSeparator: {
    fontSize: 24,
    color: '#333',
    marginHorizontal: 8,
    marginBottom: 4,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});
