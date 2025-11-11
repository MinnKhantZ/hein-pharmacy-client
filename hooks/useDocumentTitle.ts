import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { Platform } from 'react-native';

/**
 * Hook to set the document title on web platform
 * Includes platform check to ensure it only runs on web
 * Uses useFocusEffect to ensure title updates when tab is focused
 * @param title - The title to set in the browser tab
 */
export function useDocumentTitle(title: string) {
  useFocusEffect(
    useCallback(() => {
      // Only run on web platform
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.title = title;
      }
    }, [title])
  );
}
