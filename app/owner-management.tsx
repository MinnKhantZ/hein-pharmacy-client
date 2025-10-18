import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authAPI } from '../services/api';

interface Owner {
  id: number;
  username: string;
  full_name: string;
  email?: string;
  phone?: string;
}

export default function OwnerManagementScreen() {
  const { t } = useTranslation();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);

  const [newOwnerForm, setNewOwnerForm] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
  });

  const [editOwnerForm, setEditOwnerForm] = useState({
    full_name: '',
    email: '',
    phone: '',
  });

  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchOwners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOwners = async () => {
    try {
      const response = await authAPI.getAllOwners();
      setOwners(response.data.owners || []);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching owners:', error);
      Alert.alert(t('Error'), t('Failed to fetch owners'));
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOwners();
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
      setShowCreateModal(false);
      setNewOwnerForm({
        username: '',
        password: '',
        full_name: '',
        email: '',
        phone: '',
      });
      fetchOwners();
    } catch (error: any) {
      Alert.alert(t('Error'), error.response?.data?.error || t('Failed to create owner account'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOwner = (owner: Owner) => {
    Alert.alert(
      t('Delete Owner'),
      t('Are you sure you want to delete this owner?'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await authAPI.deleteOwner(owner.id);
              Alert.alert(t('Success'), t('Owner deleted successfully'));
              fetchOwners();
            } catch (error: any) {
              Alert.alert(t('Error'), error.response?.data?.error || t('Failed to delete owner'));
            }
          },
        },
      ]
    );
  };

  const handleEditOwner = (owner: Owner) => {
    setSelectedOwner(owner);
    setEditOwnerForm({
      full_name: owner.full_name,
      email: owner.email || '',
      phone: owner.phone || '',
    });
    setShowEditModal(true);
  };

  const handleSubmitEdit = async () => {
    if (!editOwnerForm.full_name) {
      Alert.alert(t('Error'), t('Full name is required'));
      return;
    }

    try {
      setIsSubmitting(true);
      await authAPI.updateOwner(selectedOwner!.id, editOwnerForm);
      Alert.alert(t('Success'), t('Owner updated successfully'));
      setShowEditModal(false);
      setSelectedOwner(null);
      fetchOwners();
    } catch (error: any) {
      Alert.alert(t('Error'), error.response?.data?.error || t('Failed to update owner'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = (owner: Owner) => {
    setSelectedOwner(owner);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const handleSubmitPasswordReset = async () => {
    if (!newPassword) {
      Alert.alert(t('Error'), t('Password is required'));
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(t('Error'), t('Password must be at least 6 characters'));
      return;
    }

    try {
      setIsSubmitting(true);
      await authAPI.resetOwnerPassword(selectedOwner!.id, { newPassword });
      Alert.alert(t('Success'), t('Password reset successfully'));
      setShowPasswordModal(false);
      setSelectedOwner(null);
      setNewPassword('');
    } catch (error: any) {
      Alert.alert(t('Error'), error.response?.data?.error || t('Failed to reset password'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← {t('Back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('Owner Management')}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.addButtonText}>+ {t('Create Owner')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>{t('Manage all owner accounts in the system.')}</Text>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {owners.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('No owners found')}</Text>
          </View>
        ) : (
          owners.map((owner) => (
            <View key={owner.id} style={styles.ownerCard}>
              <View style={styles.ownerInfo}>
                <Text style={styles.ownerName}>{owner.full_name}</Text>
                <Text style={styles.ownerDetail}>@{owner.username}</Text>
                {owner.email && <Text style={styles.ownerDetail}>{owner.email}</Text>}
                {owner.phone && <Text style={styles.ownerDetail}>{owner.phone}</Text>}
              </View>
              <View style={styles.ownerActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditOwner(owner)}
                >
                  <Text style={styles.editButtonText}>{t('Edit')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.passwordButton}
                  onPress={() => handleResetPassword(owner)}
                >
                  <Text style={styles.passwordButtonText}>{t('Reset Password')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteOwner(owner)}
                >
                  <Text style={styles.deleteButtonText}>{t('Delete')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Owner Modal */}
      <Modal visible={showCreateModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('Create New Owner Account')}</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
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
              onPress={() => setShowCreateModal(false)}
            >
              <Text style={styles.cancelButtonText}>{t('Cancel')}</Text>
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

      {/* Edit Owner Modal */}
      <Modal visible={showEditModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('Edit Owner')}</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.infoText}>
              {t('Update owner account details.')}
            </Text>

            <Text style={styles.label}>{t('Username')}</Text>
            <Text style={styles.readOnlyText}>@{selectedOwner?.username}</Text>

            <Text style={styles.label}>{t('Full Name')} *</Text>
            <TextInput
              style={styles.input}
              value={editOwnerForm.full_name}
              onChangeText={(text) => setEditOwnerForm({ ...editOwnerForm, full_name: text })}
              placeholder={t('Enter full name')}
            />

            <Text style={styles.label}>{t('Email')} (Optional)</Text>
            <TextInput
              style={styles.input}
              value={editOwnerForm.email}
              onChangeText={(text) => setEditOwnerForm({ ...editOwnerForm, email: text })}
              placeholder={t('Enter email')}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>{t('Phone')} (Optional)</Text>
            <TextInput
              style={styles.input}
              value={editOwnerForm.phone}
              onChangeText={(text) => setEditOwnerForm({ ...editOwnerForm, phone: text })}
              placeholder={t('Enter phone number')}
              keyboardType="phone-pad"
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
              onPress={handleSubmitEdit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.saveButtonText}>{t('Save Changes')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Reset Password Modal */}
      <Modal visible={showPasswordModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('Reset Password')}</Text>
            <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.infoText}>
              {t('Reset password for')} {selectedOwner?.full_name} (@{selectedOwner?.username})
            </Text>

            <Text style={styles.label}>{t('New Password')} *</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t('Enter new password')}
              secureTextEntry
            />

            <Text style={styles.helperText}>
              {t('Password must be at least 6 characters')}
            </Text>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowPasswordModal(false)}
            >
              <Text style={styles.cancelButtonText}>{t('Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSubmitPasswordReset}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.saveButtonText}>{t('Reset Password')}</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
    backgroundColor: 'white',
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    padding: 20,
    paddingTop: 10,
    backgroundColor: 'white',
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  loader: {
    marginTop: 50,
  },
  ownerCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  ownerDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  ownerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
  },
  editButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  passwordButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
  },
  passwordButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 28,
    color: '#999',
    fontWeight: '300',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  readOnlyText: {
    fontSize: 16,
    color: '#666',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 10,
  },
  helperText: {
    fontSize: 13,
    color: '#999',
    marginTop: 5,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
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
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
