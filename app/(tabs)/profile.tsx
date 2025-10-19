import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView style={styles.content} contentContainerStyle={[styles.scrollView, { paddingBottom: insets.bottom + 50 }]}>
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
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/../profile/edit-profile' as any)}>
            <Text style={styles.actionIcon}>✏️</Text>
            <Text style={styles.actionText}>{t('Edit Profile')}</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
          
          {/* Admin-only: Manage Owners */}
          {(user as any)?.username === 'admin' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.adminButton]} 
              onPress={() => router.push('/(tabs)/../profile/manage-owners' as any)}
            >
              <Text style={styles.actionIcon}>👥</Text>
              <Text style={styles.actionText}>{t('Manage Owners')}</Text>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/../settings' as any)}>
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
    paddingBottom: 20, // Base padding, additional padding added dynamically via insets.bottom
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
  adminButton: {
    backgroundColor: '#fff8e1',
    borderWidth: 2,
    borderColor: '#ffc107',
  },
});