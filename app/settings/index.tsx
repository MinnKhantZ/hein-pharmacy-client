import Constants from 'expo-constants';
import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppUpdates } from '../../hooks/useAppUpdates';
import { changeLanguage as changeLanguageUtil } from '../../i18n';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { 
    isChecking, 
    isDownloading, 
    isUpdateAvailable, 
    isUpdatePending,
    isUpdatesAvailable,
    checkAndPromptUpdate,
    applyUpdate,
  } = useAppUpdates();

  const changeLanguage = async (language: string) => {
    await changeLanguageUtil(language);
  };

  const currentLanguage = i18n.language;
  
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const handleCheckUpdate = () => {
    checkAndPromptUpdate({ 
      alertTitle: t('Update Available'),
      alertMessage: t('A new version of the app is available. Would you like to update now?'),
      updateButtonText: t('Update Now'),
      laterButtonText: t('Later'),
    });
  };

  const getUpdateStatusText = () => {
    if (isChecking) return t('Checking...');
    if (isDownloading) return t('Downloading...');
    if (isUpdatePending) return t('Restart to apply');
    if (isUpdateAvailable) return t('Update available');
    return t('Check for Updates');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollView, { paddingBottom: Math.max(insets.bottom, 20) }]}
      >
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t('App Preferences')}</Text>
          <View style={styles.settingItemLast}>
            <Text style={styles.settingText}>{t('Language')}</Text>
            <View style={styles.languageButtons}>
              <TouchableOpacity
                style={[
                  styles.languageButton,
                  currentLanguage === 'en' && styles.languageButtonActive,
                ]}
                onPress={() => changeLanguage('en')}
              >
                <Text
                  style={[
                    styles.languageButtonText,
                    currentLanguage === 'en' && styles.languageButtonTextActive,
                  ]}
                >
                  {t('English')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.languageButton,
                  currentLanguage === 'my' && styles.languageButtonActive,
                ]}
                onPress={() => changeLanguage('my')}
              >
                <Text
                  style={[
                    styles.languageButtonText,
                    currentLanguage === 'my' && styles.languageButtonTextActive,
                  ]}
                >
                  မြန်မာ
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t('Account')}</Text>
          <TouchableOpacity
            style={styles.settingItemLast}
            onPress={() => router.push('/settings/change-password')}
          >
            <Text style={styles.settingText}>{t('Change Password')}</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t('Notifications')}</Text>
          <TouchableOpacity
            style={styles.settingItemLast}
            onPress={() => router.push('/settings/notifications')}
          >
            <Text style={styles.settingText}>{t('Notification Settings')}</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t('Printing')}</Text>
          <TouchableOpacity
            style={styles.settingItemLast}
            onPress={() => router.push('/settings/print-layout')}
          >
            <Text style={styles.settingText}>{t('Print Layout Settings')}</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t('About')}</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingText}>{t('Version')}</Text>
            <Text style={styles.settingValue}>{appVersion}</Text>
          </View>
          {isUpdatesAvailable && (
            <TouchableOpacity
              style={styles.settingItem}
              onPress={isUpdatePending ? applyUpdate : handleCheckUpdate}
              disabled={isChecking || isDownloading}
            >
              <Text style={styles.settingText}>{t('App Updates')}</Text>
              <View style={styles.updateStatus}>
                {(isChecking || isDownloading) && (
                  <ActivityIndicator size="small" color="#2196F3" style={styles.updateLoader} />
                )}
                <Text style={[
                  styles.settingValue,
                  isUpdatePending && styles.updatePendingText,
                  isUpdateAvailable && styles.updateAvailableText,
                ]}>
                  {getUpdateStatusText()}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.settingItemLast}
            onPress={() => router.push('/settings/terms')}
          >
            <Text style={styles.settingText}>{t('Terms & Conditions')}</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    marginBottom: 20,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingItemLast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  settingValue: {
    fontSize: 16,
    color: '#666',
  },
  settingArrow: {
    fontSize: 18,
    color: '#ccc',
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  languageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  languageButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  languageButtonText: {
    fontSize: 14,
    color: '#666',
  },
  languageButtonTextActive: {
    color: '#fff',
  },
  updateStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  updateLoader: {
    marginRight: 8,
  },
  updatePendingText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  updateAvailableText: {
    color: '#2196F3',
    fontWeight: '500',
  },
});
