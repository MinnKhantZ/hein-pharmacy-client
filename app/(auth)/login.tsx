import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
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
import { useAuth } from '../../contexts/AuthContext';
import { useThemeColor } from '../../hooks/use-theme-color';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useBreakpoint } from '../../utils/responsive';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useTranslation();
  const placeholderTextColor = useThemeColor({}, 'placeholder');
  const deviceType = useBreakpoint();
  useDocumentTitle('Login - Hein Pharmacy');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert(t('Error'), t('Please fill in all fields'));
      return;
    }

    setIsLoading(true);
    try {
      const result = await login({ username: username.trim(), password });
      
      if (result.success) {
        router.replace('/(tabs)');
      } else {
        Alert.alert(t('Login Failed'), result.error);
      }
    } catch {
      Alert.alert(t('Error'), t('An unexpected error occurred'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContainer,
          deviceType === 'desktop' || deviceType === 'largeDesktop' ? styles.scrollContainerDesktop : null
        ]} 
        keyboardShouldPersistTaps="handled"
      >
        <View style={[
          styles.headerContainer,
          deviceType === 'desktop' || deviceType === 'largeDesktop' ? styles.headerContainerDesktop : null
        ]}>
          <Text style={styles.title}>Hein Pharmacy</Text>
          <Text style={styles.subtitle}>Inventory & Income Manager</Text>
        </View>

        <View style={[
          styles.formContainer,
          deviceType === 'desktop' || deviceType === 'largeDesktop' ? styles.formContainerDesktop : null
        ]}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('Username')}</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder={t('Enter your username')}
              placeholderTextColor={placeholderTextColor}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('Password')}</Text>
            <TextInput
              style={[styles.input, { color: '#000' }]}
              value={password}
              onChangeText={setPassword}
              placeholder={t('Enter your password')}
              placeholderTextColor={placeholderTextColor}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? t('Signing In...') : t('Sign In')}
            </Text>
          </TouchableOpacity>

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
    fontSize: 32,
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
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
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
  scrollContainerDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
  },
  headerContainerDesktop: {
    marginBottom: 60,
  },
  formContainerDesktop: {
    width: 400,
    maxWidth: '90%',
  },
});