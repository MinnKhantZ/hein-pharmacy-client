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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { authAPI } from '../../services/api';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { 
    notificationSettings: savedNotificationSettings, 
    updateSettings: updateNotificationSettings,
    permissionStatus,
    requestPermissions,
  } = useNotifications();
  const { t, i18n } = useTranslation();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCreateOwnerModal, setShowCreateOwnerModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
  };

  const currentLanguage = i18n.language;

  // Settings state
  const [privacySettings, setPrivacySettings] = useState({
    showActivity: true,
    dataCollection: true,
    shareUsageData: false,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    lowStockAlerts: true,
    salesNotifications: true,
  });
  
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
  });

  const [newOwnerForm, setNewOwnerForm] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Load notification settings from context when component mounts
  useEffect(() => {
    if (savedNotificationSettings) {
      setNotificationSettings(savedNotificationSettings);
    }
  }, [savedNotificationSettings]);

  // Handler to update notification settings
  const handleNotificationToggle = async (key: string, value: boolean) => {
    const newSettings = {
      ...notificationSettings,
      [key]: value,
    };
    
    // Check if we need to request permissions
    if (value && permissionStatus !== 'granted') {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          t('Permissions Required'),
          t('Please enable notifications in your device settings to receive alerts.')
        );
        return;
      }
    }
    
    setNotificationSettings(newSettings);
    await updateNotificationSettings(newSettings);
    
    Alert.alert(
      t('Success'),
      t('Notification settings updated successfully')
    );
  };

  const openEditModal = () => {
    const userData = user as any;
    setEditForm({
      full_name: userData?.full_name || '',
      email: userData?.email || '',
      phone: userData?.phone || '',
      address: userData?.address || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateProfile = async () => {
    try {
      setIsSubmitting(true);
      await authAPI.updateProfile(editForm);
      Alert.alert(t('Success'), t('Profile updated successfully'));
      setShowEditModal(false);
      // Reload user data here if needed
    } catch (error: any) {
      Alert.alert(t('Error'), error.response?.data?.error || t('Failed to update profile'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateOwner = async () => {
    if (!newOwnerForm.username || !newOwnerForm.password || !newOwnerForm.full_name) {
      Alert.alert(t('Error'), t('Username, password, and full name are required'));
      return;
    }

    try {
      setIsSubmitting(true);
      await authAPI.createOwner(newOwnerForm);
      Alert.alert(t('Success'), t('New owner account created successfully'));
      setShowCreateOwnerModal(false);
      setNewOwnerForm({
        username: '',
        password: '',
        full_name: '',
        email: '',
        phone: '',
      });
    } catch (error: any) {
      Alert.alert(t('Error'), error.response?.data?.error || t('Failed to create owner account'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword) {
      Alert.alert(t('Error'), t('Current password is required'));
      return;
    }

    if (!passwordForm.newPassword) {
      Alert.alert(t('Error'), t('New password is required'));
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      Alert.alert(t('Error'), t('Password must be at least 6 characters'));
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert(t('Error'), t('Passwords do not match'));
      return;
    }

    try {
      setIsSubmitting(true);
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      Alert.alert(t('Success'), t('Password changed successfully'));
      setShowChangePasswordModal(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      Alert.alert(t('Error'), error.response?.data?.error || t('Failed to change password'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('Logout'),
      t('Are you sure you want to logout?'),
      [
        { text: t('Cancel'), style: 'cancel' },
        { text: t('Logout'), style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollView}>
        <Text style={styles.title}>{t('Profile')}</Text>
        <Text style={styles.subtitle}>{t('Manage your account settings')}</Text>
        
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user as any)?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{(user as any)?.full_name || 'Unknown User'}</Text>
            <Text style={styles.userUsername}>@{(user as any)?.username || 'unknown'}</Text>
            {(user as any)?.email && (
              <Text style={styles.userEmail}>📧 {(user as any).email}</Text>
            )}
            {(user as any)?.phone && (
              <Text style={styles.userPhone}>📱 {(user as any).phone}</Text>
            )}
            {(user as any)?.address && (
              <Text style={styles.userAddress}>📍 {(user as any).address}</Text>
            )}
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={openEditModal}>
            <Text style={styles.actionIcon}>✏️</Text>
            <Text style={styles.actionText}>{t('Edit Profile')}</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
          
          {/* Admin-only: Create New Owner */}
          {(user as any)?.username === 'admin' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.adminButton]} 
              onPress={() => setShowCreateOwnerModal(true)}
            >
              <Text style={styles.actionIcon}>👤</Text>
              <Text style={styles.actionText}>{t('Create New Owner')}</Text>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowSettingsModal(true)}>
            <Text style={styles.actionIcon}>⚙️</Text>
            <Text style={styles.actionText}>{t('Settings')}</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Text style={styles.actionIcon}>🚪</Text>
            <Text style={[styles.actionText, styles.logoutText]}>{t('Logout')}</Text>
            <Text style={[styles.actionArrow, styles.logoutText]}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('Edit Profile')}</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>{t('Full Name')}</Text>
            <TextInput
              style={styles.input}
              value={editForm.full_name}
              onChangeText={(text) => setEditForm({ ...editForm, full_name: text })}
              placeholder={t('Enter your full name')}
            />

            <Text style={styles.label}>{t('Email')}</Text>
            <TextInput
              style={styles.input}
              value={editForm.email}
              onChangeText={(text) => setEditForm({ ...editForm, email: text })}
              placeholder={t('Enter your email')}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>{t('Phone')}</Text>
            <TextInput
              style={styles.input}
              value={editForm.phone}
              onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
              placeholder={t('Enter your phone number')}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>{t('Address')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editForm.address}
              onChangeText={(text) => setEditForm({ ...editForm, address: text })}
              placeholder={t('Enter your address')}
              multiline
              numberOfLines={3}
            />
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowEditModal(false)}
            >
              <Text style={styles.cancelButtonText}>{t('Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleUpdateProfile}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.saveButtonText}>{t('Update Profile')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('Settings')}</Text>
            <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>{t('App Preferences')}</Text>
              <View style={styles.settingItem}>
                <Text style={styles.settingText}>{t('Language')}</Text>
                <View style={styles.languageButtons}>
                  <TouchableOpacity
                    style={[
                      styles.languageButton,
                      currentLanguage === 'en' && styles.languageButtonActive
                    ]}
                    onPress={() => changeLanguage('en')}
                  >
                    <Text style={[
                      styles.languageButtonText,
                      currentLanguage === 'en' && styles.languageButtonTextActive
                    ]}>{t('English')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.languageButton,
                      currentLanguage === 'my' && styles.languageButtonActive
                    ]}
                    onPress={() => changeLanguage('my')}
                  >
                    <Text style={[
                      styles.languageButtonText,
                      currentLanguage === 'my' && styles.languageButtonTextActive
                    ]}>မြန်မာ</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>{t('Account')}</Text>
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => {
                  setShowSettingsModal(false);
                  setTimeout(() => setShowChangePasswordModal(true), 300);
                }}
              >
                <Text style={styles.settingText}>{t('Change Password')}</Text>
                <Text style={styles.settingArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => {
                  setShowSettingsModal(false);
                  setTimeout(() => setShowPrivacyModal(true), 300);
                }}
              >
                <Text style={styles.settingText}>{t('Privacy Settings')}</Text>
                <Text style={styles.settingArrow}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>{t('Notifications')}</Text>
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => {
                  setShowSettingsModal(false);
                  setTimeout(() => setShowNotificationModal(true), 300);
                }}
              >
                <Text style={styles.settingText}>{t('Notification Settings')}</Text>
                <Text style={styles.settingArrow}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>{t('About')}</Text>
              <TouchableOpacity style={styles.settingItem}>
                <Text style={styles.settingText}>{t('Version')}</Text>
                <Text style={styles.settingValue}>1.0.0</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => {
                  setShowSettingsModal(false);
                  setTimeout(() => setShowTermsModal(true), 300);
                }}
              >
                <Text style={styles.settingText}>{t('Terms & Conditions')}</Text>
                <Text style={styles.settingArrow}>›</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Create Owner Modal - Admin Only */}
      <Modal visible={showCreateOwnerModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('Create New Owner Account')}</Text>
            <TouchableOpacity onPress={() => setShowCreateOwnerModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.infoText}>
              {t('Create a new owner account that can manage inventory and sales.')}
            </Text>

            <Text style={styles.label}>{t('Username')} *</Text>
            <TextInput
              style={styles.input}
              value={newOwnerForm.username}
              onChangeText={(text) => setNewOwnerForm({ ...newOwnerForm, username: text })}
              placeholder={t('Enter username')}
              autoCapitalize="none"
            />

            <Text style={styles.label}>{t('Password')} *</Text>
            <TextInput
              style={styles.input}
              value={newOwnerForm.password}
              onChangeText={(text) => setNewOwnerForm({ ...newOwnerForm, password: text })}
              placeholder={t('Enter password')}
              secureTextEntry
            />

            <Text style={styles.label}>{t('Full Name')} *</Text>
            <TextInput
              style={styles.input}
              value={newOwnerForm.full_name}
              onChangeText={(text) => setNewOwnerForm({ ...newOwnerForm, full_name: text })}
              placeholder={t('Enter full name')}
            />

            <Text style={styles.label}>{t('Email')} (Optional)</Text>
            <TextInput
              style={styles.input}
              value={newOwnerForm.email}
              onChangeText={(text) => setNewOwnerForm({ ...newOwnerForm, email: text })}
              placeholder={t('Enter email')}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>{t('Phone')} (Optional)</Text>
            <TextInput
              style={styles.input}
              value={newOwnerForm.phone}
              onChangeText={(text) => setNewOwnerForm({ ...newOwnerForm, phone: text })}
              placeholder={t('Enter phone number')}
              keyboardType="phone-pad"
            />
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowCreateOwnerModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleCreateOwner}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.saveButtonText}>{t('Create Owner')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={showChangePasswordModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('Change Password')}</Text>
            <TouchableOpacity onPress={() => setShowChangePasswordModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>{t('Current Password')} *</Text>
            <TextInput
              style={styles.input}
              value={passwordForm.currentPassword}
              onChangeText={(text) => setPasswordForm({ ...passwordForm, currentPassword: text })}
              placeholder={t('Enter current password')}
              secureTextEntry
            />

            <Text style={styles.label}>{t('New Password')} *</Text>
            <TextInput
              style={styles.input}
              value={passwordForm.newPassword}
              onChangeText={(text) => setPasswordForm({ ...passwordForm, newPassword: text })}
              placeholder={t('Enter new password')}
              secureTextEntry
            />

            <Text style={styles.label}>{t('Confirm New Password')} *</Text>
            <TextInput
              style={styles.input}
              value={passwordForm.confirmPassword}
              onChangeText={(text) => setPasswordForm({ ...passwordForm, confirmPassword: text })}
              placeholder={t('Confirm new password')}
              secureTextEntry
            />
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowChangePasswordModal(false)}
            >
              <Text style={styles.cancelButtonText}>{t('Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleChangePassword}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.saveButtonText}>{t('Change Password')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Privacy Settings Modal */}
      <Modal visible={showPrivacyModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('Privacy Settings')}</Text>
            <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.settingsSection}>
              <View style={styles.toggleItem}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.settingText}>{t('Show Account Activity')}</Text>
                </View>
                <Switch
                  value={privacySettings.showActivity}
                  onValueChange={(value) => setPrivacySettings({ ...privacySettings, showActivity: value })}
                  trackColor={{ false: '#ddd', true: '#4CAF50' }}
                  thumbColor={privacySettings.showActivity ? '#fff' : '#f4f3f4'}
                />
              </View>

              <View style={styles.toggleItem}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.settingText}>{t('Data Collection')}</Text>
                </View>
                <Switch
                  value={privacySettings.dataCollection}
                  onValueChange={(value) => setPrivacySettings({ ...privacySettings, dataCollection: value })}
                  trackColor={{ false: '#ddd', true: '#4CAF50' }}
                  thumbColor={privacySettings.dataCollection ? '#fff' : '#f4f3f4'}
                />
              </View>

              <View style={styles.toggleItem}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.settingText}>{t('Share Usage Data')}</Text>
                </View>
                <Switch
                  value={privacySettings.shareUsageData}
                  onValueChange={(value) => setPrivacySettings({ ...privacySettings, shareUsageData: value })}
                  trackColor={{ false: '#ddd', true: '#4CAF50' }}
                  thumbColor={privacySettings.shareUsageData ? '#fff' : '#f4f3f4'}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton, { flex: 1 }]}
              onPress={() => setShowPrivacyModal(false)}
            >
              <Text style={styles.saveButtonText}>{t('Done')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Notification Settings Modal */}
      <Modal visible={showNotificationModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('Notification Settings')}</Text>
            <TouchableOpacity onPress={() => setShowNotificationModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.settingsSection}>
              <View style={styles.toggleItem}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.settingText}>{t('Enable Low Stock Alerts')}</Text>
                  <Text style={styles.settingDescription}>{t('Get notified when items are running low')}</Text>
                </View>
                <Switch
                  value={notificationSettings.lowStockAlerts}
                  onValueChange={(value) => handleNotificationToggle('lowStockAlerts', value)}
                  trackColor={{ false: '#ddd', true: '#4CAF50' }}
                  thumbColor={notificationSettings.lowStockAlerts ? '#fff' : '#f4f3f4'}
                />
              </View>

              <View style={styles.toggleItem}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.settingText}>{t('Enable Sales Notifications')}</Text>
                  <Text style={styles.settingDescription}>{t('Get notified about daily sales')}</Text>
                </View>
                <Switch
                  value={notificationSettings.salesNotifications}
                  onValueChange={(value) => handleNotificationToggle('salesNotifications', value)}
                  trackColor={{ false: '#ddd', true: '#4CAF50' }}
                  thumbColor={notificationSettings.salesNotifications ? '#fff' : '#f4f3f4'}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton, { flex: 1 }]}
              onPress={() => setShowNotificationModal(false)}
            >
              <Text style={styles.saveButtonText}>{t('Done')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Terms & Conditions Modal */}
      <Modal visible={showTermsModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('Terms & Conditions')}</Text>
            <TouchableOpacity onPress={() => setShowTermsModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.termsContainer}>
              <Text style={styles.termsTitle}>{t('About Hein Pharmacy')}</Text>
              <Text style={styles.termsText}>
                {t('A comprehensive pharmacy management system')}
              </Text>

              <Text style={styles.termsTitle}>Terms of Service</Text>
              <Text style={styles.termsText}>
                This pharmacy management system is provided for authorized users only. 
                By using this application, you agree to maintain the confidentiality of all 
                patient and business information accessed through the system.
              </Text>

              <Text style={styles.termsTitle}>Privacy Policy</Text>
              <Text style={styles.termsText}>
                We are committed to protecting your privacy and the privacy of your customers. 
                All data is stored securely and will not be shared with third parties without 
                explicit consent.
              </Text>

              <Text style={styles.termsTitle}>Data Security</Text>
              <Text style={styles.termsText}>
                All sensitive information is encrypted and stored securely. Users are responsible 
                for maintaining the security of their login credentials.
              </Text>

              <Text style={styles.termsTitle}>{t('Contact Us')}</Text>
              <Text style={styles.termsText}>
                For support or inquiries, please contact our support team.
              </Text>

              <Text style={styles.termsVersion}>Version 1.0.0</Text>
              <Text style={styles.termsDate}>Last Updated: October 8, 2025</Text>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton, { flex: 1 }]}
              onPress={() => setShowTermsModal(false)}
            >
              <Text style={styles.saveButtonText}>{t('Close')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
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
    padding: 20,
    paddingTop: 20,
  },
  scrollView: {
    paddingBottom: 100, // Extra padding for tab bar
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userUsername: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: '#888',
    marginBottom: 3,
  },
  userPhone: {
    fontSize: 14,
    color: '#888',
    marginBottom: 3,
  },
  userAddress: {
    fontSize: 14,
    color: '#888',
  },
  actionsContainer: {
    gap: 10,
  },
  actionButton: {
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionArrow: {
    fontSize: 24,
    color: '#999',
  },
  logoutButton: {
    backgroundColor: '#f44336',
    marginTop: 20,
  },
  logoutText: {
    color: 'white',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 28,
    color: '#666',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  settingsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 8,
    marginBottom: 10,
  },
  settingText: {
    fontSize: 16,
    color: '#333',
  },
  settingArrow: {
    fontSize: 20,
    color: '#999',
  },
  settingValue: {
    fontSize: 14,
    color: '#666',
  },
  adminButton: {
    backgroundColor: '#fff8e1',
    borderWidth: 2,
    borderColor: '#ffc107',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 10,
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
    color: 'white',
    fontWeight: '600',
  },
  toggleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 8,
    marginBottom: 10,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingDescription: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  termsContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
  },
  termsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  termsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 15,
  },
  termsVersion: {
    fontSize: 12,
    color: '#999',
    marginTop: 30,
    textAlign: 'center',
  },
  termsDate: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
});