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
import { authAPI } from '../../services/api';

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollView}>
          <Text style={styles.label}>
            {t('Current Password')} *
          </Text>
          <TextInput
            style={styles.input}
            value={passwordForm.currentPassword}
            onChangeText={(text) =>
              setPasswordForm({ ...passwordForm, currentPassword: text })
            }
            placeholder={t('Enter current password')}
            secureTextEntry
          />

          <Text style={styles.label}>
            {t('New Password')} *
          </Text>
          <TextInput
            style={styles.input}
            value={passwordForm.newPassword}
            onChangeText={(text) =>
              setPasswordForm({ ...passwordForm, newPassword: text })
            }
            placeholder={t('Enter new password')}
            secureTextEntry
          />

          <Text style={styles.label}>
            {t('Confirm New Password')} *
          </Text>
          <TextInput
            style={styles.input}
            value={passwordForm.confirmPassword}
            onChangeText={(text) =>
              setPasswordForm({ ...passwordForm, confirmPassword: text })
            }
            placeholder={t('Confirm new password')}
            secureTextEntry
          />
        </ScrollView>

        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
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
    paddingBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
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
    backgroundColor: '#2196F3',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
