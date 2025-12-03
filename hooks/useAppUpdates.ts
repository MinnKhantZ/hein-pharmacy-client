import * as Updates from 'expo-updates';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

export interface UpdateStatus {
  isChecking: boolean;
  isDownloading: boolean;
  isUpdateAvailable: boolean;
  isUpdatePending: boolean;
  downloadProgress: number;
  lastCheckTime: Date | null;
  error: Error | null;
}

export function useAppUpdates() {
  const [status, setStatus] = useState<UpdateStatus>({
    isChecking: false,
    isDownloading: false,
    isUpdateAvailable: false,
    isUpdatePending: false,
    downloadProgress: 0,
    lastCheckTime: null,
    error: null,
  });

  // Check if we're in a context where updates can work
  const isUpdatesAvailable = !__DEV__ && Updates.isEnabled;

  const checkForUpdate = useCallback(async () => {
    if (!isUpdatesAvailable) {
      console.log('[Updates] Skipping update check - updates not available in dev mode');
      return null;
    }

    setStatus(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      const update = await Updates.checkForUpdateAsync();
      
      setStatus(prev => ({
        ...prev,
        isChecking: false,
        isUpdateAvailable: update.isAvailable,
        lastCheckTime: new Date(),
      }));

      console.log('[Updates] Check result:', update.isAvailable ? 'Update available' : 'No update');
      return update;
    } catch (error) {
      console.error('[Updates] Check failed:', error);
      setStatus(prev => ({
        ...prev,
        isChecking: false,
        error: error as Error,
        lastCheckTime: new Date(),
      }));
      return null;
    }
  }, [isUpdatesAvailable]);

  const downloadUpdate = useCallback(async () => {
    if (!isUpdatesAvailable) {
      return null;
    }

    setStatus(prev => ({ ...prev, isDownloading: true, downloadProgress: 0, error: null }));

    try {
      const result = await Updates.fetchUpdateAsync();
      
      setStatus(prev => ({
        ...prev,
        isDownloading: false,
        isUpdatePending: result.isNew,
        downloadProgress: 100,
      }));

      console.log('[Updates] Download result:', result.isNew ? 'New update downloaded' : 'No new update');
      return result;
    } catch (error) {
      console.error('[Updates] Download failed:', error);
      setStatus(prev => ({
        ...prev,
        isDownloading: false,
        error: error as Error,
      }));
      return null;
    }
  }, [isUpdatesAvailable]);

  const applyUpdate = useCallback(async () => {
    try {
      console.log('[Updates] Reloading app to apply update...');
      await Updates.reloadAsync();
    } catch (error) {
      console.error('[Updates] Reload failed:', error);
      setStatus(prev => ({ ...prev, error: error as Error }));
    }
  }, []);

  const checkAndPromptUpdate = useCallback(async (options?: { 
    silent?: boolean;
    forceCheck?: boolean;
    alertTitle?: string;
    alertMessage?: string;
    updateButtonText?: string;
    laterButtonText?: string;
  }) => {
    if (!isUpdatesAvailable) {
      return;
    }

    const { 
      silent = false, 
      alertTitle = 'Update Available',
      alertMessage = 'A new version of the app is available. Would you like to update now?',
      updateButtonText = 'Update Now',
      laterButtonText = 'Later',
    } = options || {};

    try {
      const update = await checkForUpdate();
      
      if (update?.isAvailable) {
        const downloadResult = await downloadUpdate();
        
        if (downloadResult?.isNew) {
          if (!silent) {
            Alert.alert(
              alertTitle,
              alertMessage,
              [
                {
                  text: laterButtonText,
                  style: 'cancel',
                },
                {
                  text: updateButtonText,
                  onPress: applyUpdate,
                },
              ],
              { cancelable: true }
            );
          }
        }
      }
    } catch (error) {
      console.error('[Updates] Check and prompt failed:', error);
    }
  }, [isUpdatesAvailable, checkForUpdate, downloadUpdate, applyUpdate]);

  // Auto-check on mount (for production builds)
  useEffect(() => {
    if (isUpdatesAvailable) {
      // Small delay to let app initialize first
      const timer = setTimeout(() => {
        checkAndPromptUpdate({ silent: false });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isUpdatesAvailable, checkAndPromptUpdate]);

  // Get current update info
  const currentUpdateInfo = {
    updateId: Updates.updateId,
    channel: Updates.channel,
    runtimeVersion: Updates.runtimeVersion,
    createdAt: Updates.createdAt,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
  };

  return {
    ...status,
    isUpdatesAvailable,
    currentUpdateInfo,
    checkForUpdate,
    downloadUpdate,
    applyUpdate,
    checkAndPromptUpdate,
  };
}

export default useAppUpdates;
