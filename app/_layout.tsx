import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import 'react-native-reanimated';
import '../i18n';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { PrinterProvider } from '../contexts/PrinterContext';
import { PrintLayoutProvider } from '../contexts/PrintLayoutContext';
import { useAppUpdates } from '../hooks/useAppUpdates';
import { useLoadCustomFonts } from '../hooks/useLoadCustomFonts';
import { useBreakpoint } from '../utils/responsive';

// Create a client
const queryClient = new QueryClient();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const deviceType = useBreakpoint();
  const fontsLoaded = useLoadCustomFonts();
  
  // Initialize OTA updates - this will check for updates on app launch
  useAppUpdates();

  if (!fontsLoaded) {
    // Optionally, show a splash or loader here
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationProvider>
            <PrinterProvider>
              <PrintLayoutProvider>
                <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                  <View
                    style={
                      deviceType === 'desktop' || deviceType === 'largeDesktop'
                        ? styles.desktopContainer
                        : styles.mobileContainer
                    }
                  >
                    <Stack>
                      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                      <Stack.Screen name="settings" options={{ headerShown: false }} />
                      <Stack.Screen name="profile" options={{ headerShown: false }} />
                      <Stack.Screen
                        name="income-details"
                        options={{
                          title: t('All Records'),
                          headerShown: true,
                        }}
                      />
                      <Stack.Screen
                        name="sales-details"
                        options={{
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                    </Stack>
                    <StatusBar style="auto" />
                  </View>
                </ThemeProvider>
              </PrintLayoutProvider>
            </PrinterProvider>
          </NotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  desktopContainer: {
    width: '100%',
    backgroundColor: '#fff',
    minHeight: '100%',
  },
  mobileContainer: {
    flex: 1,
  },
});
