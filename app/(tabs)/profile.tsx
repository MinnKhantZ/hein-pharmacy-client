import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCreateOwnerModal, setShowCreateOwnerModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
  };

  const currentLanguage = i18n.language;
  
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
      <ScrollView style={styles.content}>
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
              <TouchableOpacity style={styles.settingItem}>
                <Text style={styles.settingText}>{t('Change Password')}</Text>
                <Text style={styles.settingArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingItem}>
                <Text style={styles.settingText}>{t('Privacy Settings')}</Text>
                <Text style={styles.settingArrow}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>{t('Notifications')}</Text>
              <TouchableOpacity style={styles.settingItem}>
                <Text style={styles.settingText}>{t('Low Stock Alerts')}</Text>
                <Text style={styles.settingArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingItem}>
                <Text style={styles.settingText}>{t('Sales Notifications')}</Text>
                <Text style={styles.settingArrow}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>{t('About')}</Text>
              <TouchableOpacity style={styles.settingItem}>
                <Text style={styles.settingText}>{t('Version')}</Text>
                <Text style={styles.settingValue}>1.0.0</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingItem}>
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
    paddingBottom: 80, // Account for tab bar
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
});