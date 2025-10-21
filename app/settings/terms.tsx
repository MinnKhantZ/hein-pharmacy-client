import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TermsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollView, { paddingBottom: Math.max(insets.bottom, 20) }]}
      >
        <View style={styles.termsContainer}>
          <Text style={styles.termsTitle}>{t('About Hein Pharmacy')}</Text>
          <Text style={styles.termsText}>{t('A comprehensive pharmacy management system')}</Text>

          <Text style={styles.termsTitle}>{t('Terms of Service')}</Text>
          <Text style={styles.termsText}>
            {t('Terms of Service Content')}
          </Text>

          <Text style={styles.termsTitle}>{t('Privacy Policy')}</Text>
          <Text style={styles.termsText}>
            {t('Privacy Policy Content')}
          </Text>

          <Text style={styles.termsTitle}>{t('Data Security')}</Text>
          <Text style={styles.termsText}>
            {t('Data Security Content')}
          </Text>

          <Text style={styles.termsTitle}>{t('Contact Us')}</Text>
          <Text style={styles.termsText}>{t('Support Contact')}</Text>

          <Text style={styles.termsVersion}>{t('Version')} 1.0.0</Text>
          <Text style={styles.termsDate}>{t('Last Updated')}: October 21, 2025</Text>
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
  },
  scrollView: {
    padding: 20,
  },
  termsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  termsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 24,
    marginBottom: 12,
  },
  termsText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  termsVersion: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 32,
  },
  termsDate: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
});
