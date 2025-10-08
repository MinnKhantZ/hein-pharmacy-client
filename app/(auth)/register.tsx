import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const { t } = useTranslation();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    if (!formData.username.trim() || !formData.password.trim() || !formData.full_name.trim()) {
      Alert.alert(t('Error'), t('Please fill in required fields (username, password, full name)'));
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert(t('Error'), t('Password must be at least 6 characters long'));
      return;
    }

    setIsLoading(true);
    try {
      const result = await register({
        username: formData.username.trim(),
        password: formData.password,
        full_name: formData.full_name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
      });
      
      if (result.success) {
        Alert.alert(t('Success'), t('Registration successful! Please login.'));
        router.replace('/(auth)/login');
      } else {
        Alert.alert(t('Registration Failed'), result.error);
      }
    } catch {
      Alert.alert(t('Error'), t('An unexpected error occurred'));
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    router.push('/(auth)/login');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>{t('Create Account')}</Text>
          <Text style={styles.subtitle}>{t('Join Hein Pharmacy Management')}</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('Username')} *</Text>
            <TextInput
              style={styles.input}
              value={formData.username}
              onChangeText={(value) => handleInputChange('username', value)}
              placeholder={t('Enter username')}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('Full Name')} *</Text>
            <TextInput
              style={styles.input}
              value={formData.full_name}
              onChangeText={(value) => handleInputChange('full_name', value)}
              placeholder={t('Enter your full name')}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('Password')} *</Text>
            <TextInput
              style={styles.input}
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              placeholder={t('Enter password (min 6 characters)')}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('Email')}</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder={t('Enter email (optional)')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('Phone')}</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
              placeholder={t('Enter phone number (optional)')}
              keyboardType="phone-pad"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? t('Creating Account...') : t('Create Account')}
            </Text>
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>{t('Already have an account?')} </Text>
            <TouchableOpacity onPress={navigateToLogin}>
              <Text style={styles.loginLink}>{t('Sign In')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    color: '#666',
    fontSize: 14,
  },
  loginLink: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
});