import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { Redirect, Tabs, router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useBreakpoint } from '../../utils/responsive';

// Sidebar link component for desktop navigation
function SidebarLink({ icon, label, route }: { icon: IconSymbolName; label: string; route: string }) {
  return (
    <TouchableOpacity 
      style={sidebarStyles.link}
      onPress={() => router.push(route as any)}
    >
      <IconSymbol size={24} name={icon} color="#2196F3" />
      <Text style={sidebarStyles.linkText}>{label}</Text>
    </TouchableOpacity>
  );
}

const sidebarStyles = StyleSheet.create({
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  linkText: {
    color: '#222',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const deviceType = useBreakpoint();

  if (isLoading) {
    return null; // Or loading spinner
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // Calculate tab bar height including safe area
  const tabBarHeight = 60 + insets.bottom;

  if (deviceType === 'desktop' || deviceType === 'largeDesktop') {
    // Sidebar navigation for desktop
    return (
      <View style={desktopStyles.container}>
        <View style={desktopStyles.sidebar}>
          <SidebarLink icon="house.fill" label={t('Home')} route="/(tabs)/dashboard" />
          <SidebarLink icon="pills.fill" label={t('Inventory')} route="/(tabs)/inventory" />
          <SidebarLink icon="creditcard.fill" label={t('Sales')} route="/(tabs)/sales" />
          <SidebarLink icon="chart.pie.fill" label={t('Analytics')} route="/(tabs)/income" />
          <SidebarLink icon="person.circle.fill" label={t('Profile')} route="/(tabs)/profile" />
        </View>
        <View style={desktopStyles.main}>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarStyle: { display: 'none' },
            }}
          >
            <Tabs.Screen name="dashboard" />
            <Tabs.Screen name="inventory" />
            <Tabs.Screen name="sales" />
            <Tabs.Screen name="income" />
            <Tabs.Screen name="profile" />
            <Tabs.Screen name="index" options={{ href: null }} />
            <Tabs.Screen name="explore" options={{ href: null }} />
          </Tabs>
        </View>
      </View>
    );
  }
  // Mobile/tablet: keep tab bar
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#888',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          height: tabBarHeight,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t('Home'),
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: t('Inventory'),
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="pills.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: t('Sales'),
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="creditcard.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="income"
        options={{
          title: t('Analytics'),
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="chart.pie.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('Profile'),
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.circle.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const desktopStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    minHeight: '100%',
    flex: 1,
  },
  sidebar: {
    width: 220,
    backgroundColor: '#f7f7f7',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    paddingVertical: 32,
  },
  main: {
    flex: 1,
    // padding: 32,
  },
});