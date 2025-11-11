import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useBreakpoint } from '../../utils/responsive';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  useDocumentTitle('Dashboard - Hein Pharmacy');
  const insets = useSafeAreaInsets();
  const deviceType = useBreakpoint();

  const dashboardItems = [
    {
      title: t('Add New Item'),
      description: t('Add new inventory items'),
      action: () => router.push('/(tabs)/inventory?openModal=true'),
      color: '#4CAF50',
      icon: '📦',
    },
    {
      title: t('Make Sale'),
      description: t('Record new sales'),
      action: () => router.push('/(tabs)/sales?openModal=true'),
      color: '#2196F3',
      icon: '💰',
    },
    {
      title: t('View Inventory'),
      description: t('Manage your inventory'),
      action: () => router.push('/(tabs)/inventory'),
      color: '#FF9800',
      icon: '📋',
    },
    {
      title: t('Income Reports'),
      description: t('View income analytics'),
      action: () => router.push('/(tabs)/income'),
      color: '#9C27B0',
      icon: '📊',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: insets.bottom + 100 }]}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>{t('Welcome back,')}</Text>
          <Text style={styles.userName}>{(user as any)?.full_name || 'User'}</Text>
          <Text style={styles.subtitle}>{t('Hein Pharmacy Management')}</Text>
        </View>

        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>{t('Quick Actions')}</Text>
          <View style={[styles.grid, deviceType === 'desktop' || deviceType === 'largeDesktop' ? styles.gridDesktop : null]}>
            {dashboardItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.card, { backgroundColor: item.color }, deviceType === 'desktop' || deviceType === 'largeDesktop' ? styles.cardDesktop : null]}
                onPress={item.action}
                activeOpacity={0.8}
              >
                <Text style={styles.cardIcon}>{item.icon}</Text>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDescription}>{item.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
  scrollContainer: {
    padding: 20,
    paddingBottom: 20, // Base padding, additional padding added dynamically
  },
  header: {
    marginBottom: 30,
    paddingTop: 20,
  },
  welcomeText: {
    fontSize: 18,
    color: '#666',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#2196F3',
    marginTop: 5,
  },
  quickActionsContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridDesktop: {
    gap: 20,
  },
  card: {
    width: '48%',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  cardDesktop: {
    width: '23%',
    minHeight: 140,
    padding: 24,
  },
  cardIcon: {
    fontSize: 30,
    marginBottom: 10,
  },
  cardTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  cardDescription: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.9,
  },
});