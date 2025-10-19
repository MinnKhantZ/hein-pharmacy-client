import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';

export default function EditProfileScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
  });

  // Initialize form with user data
  React.useEffect(() => {
    const userData = user as any;
    setEditForm({
      full_name: userData?.full_name || '',
      email: userData?.email || '',
      phone: userData?.phone || '',
    });
  }, [user]);

  const handleUpdateProfile = async () => {
    try {
      setIsSubmitting(true);
      await authAPI.updateProfile(editForm);
      Alert.alert(t('Success'), t('Profile updated successfully'));
    } catch (error: any) {
      Alert.alert(t('Error'), error.response?.data?.error || t('Failed to update profile'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.content} contentContainerStyle={[styles.scrollView, { paddingBottom: Math.max(insets.bottom, 20) }]}>
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
        </ScrollView>

        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleUpdateProfile} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveButtonText}>{t('Update Profile')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingTop: 20,
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
  actions: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
