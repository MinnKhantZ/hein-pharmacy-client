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

// Create a client with custom retry logic for rate limiting
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 401 (unauthorized) or 403 (forbidden)
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return false;
        }
        // Retry on 429 (rate limit) and network errors, up to 3 times
        if (error?.response?.status === 429 || !error?.response) {
          return failureCount < 3;
        }
        // Default retry logic for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff, max 30s
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry mutations on 401/403
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return false;
        }
        // Retry mutations on 429 and network errors
        if (error?.response?.status === 429 || !error?.response) {
          return failureCount < 2; // Fewer retries for mutations
        }
        return false; // Don't retry other mutation errors by default
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

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
