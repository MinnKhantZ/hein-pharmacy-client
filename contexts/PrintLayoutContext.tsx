import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
    DEFAULT_PRINT_LAYOUT,
    PRINT_LAYOUT_PRESETS,
    PrintLayoutConfig,
} from '../types/printLayout';

const PRINT_LAYOUT_STORAGE_KEY = 'printLayoutConfig';

interface PrintLayoutContextType {
  /** Current print layout configuration */
  config: PrintLayoutConfig;
  /** Whether config is still loading from storage */
  isLoading: boolean;
  /** Update a single config value using dot notation path (e.g., 'fontSizes.normal') */
  updateConfigValue: (path: string, value: number) => Promise<void>;
  /** Update multiple config values at once */
  updateConfig: (partialConfig: Partial<PrintLayoutConfig>) => Promise<void>;
  /** Reset to default configuration */
  resetToDefault: () => Promise<void>;
  /** Apply a preset configuration */
  applyPreset: (presetName: string) => Promise<void>;
  /** Get available preset names */
  getPresetNames: () => string[];
  /** Export current config as JSON string */
  exportConfig: () => string;
  /** Import config from JSON string */
  importConfig: (jsonString: string) => Promise<boolean>;
}

const PrintLayoutContext = createContext<PrintLayoutContextType | undefined>(undefined);

/**
 * Helper to set a nested value in an object using dot notation path
 */
const setNestedValue = <T extends object>(obj: T, path: string, value: number): T => {
  const keys = path.split('.');
  const result = JSON.parse(JSON.stringify(obj)) as T;
  
  let current: any = result;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    current[key] = { ...current[key] };
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
  return result;
};

/**
 * Deep merge two objects
 */
const deepMerge = <T extends object>(target: T, source: Partial<T>): T => {
  const result = { ...target };
  
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = target[key];
      
      if (
        sourceValue !== null &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        (result as any)[key] = deepMerge(targetValue as object, sourceValue as object);
      } else if (sourceValue !== undefined) {
        (result as any)[key] = sourceValue;
      }
    }
  }
  
  return result;
};

export const PrintLayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<PrintLayoutConfig>(DEFAULT_PRINT_LAYOUT);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const stored = await AsyncStorage.getItem(PRINT_LAYOUT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<PrintLayoutConfig>;
        // Merge with defaults to ensure all fields exist even if new fields are added
        const mergedConfig = deepMerge(DEFAULT_PRINT_LAYOUT, parsed);
        setConfig(mergedConfig);
      }
    } catch (error) {
      console.error('Failed to load print layout config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async (newConfig: PrintLayoutConfig) => {
    try {
      await AsyncStorage.setItem(PRINT_LAYOUT_STORAGE_KEY, JSON.stringify(newConfig));
      setConfig(newConfig);
    } catch (error) {
      console.error('Failed to save print layout config:', error);
      throw error;
    }
  };

  const updateConfigValue = useCallback(async (path: string, value: number) => {
    const newConfig = setNestedValue(config, path, value);
    await saveConfig(newConfig);
  }, [config]);

  const updateConfig = useCallback(async (partialConfig: Partial<PrintLayoutConfig>) => {
    const newConfig = deepMerge(config, partialConfig);
    await saveConfig(newConfig);
  }, [config]);

  const resetToDefault = useCallback(async () => {
    await saveConfig(DEFAULT_PRINT_LAYOUT);
  }, []);

  const applyPreset = useCallback(async (presetName: string) => {
    const preset = PRINT_LAYOUT_PRESETS[presetName];
    if (preset) {
      await saveConfig(preset);
    } else {
      throw new Error(`Unknown preset: ${presetName}`);
    }
  }, []);

  const getPresetNames = useCallback(() => {
    return Object.keys(PRINT_LAYOUT_PRESETS);
  }, []);

  const exportConfig = useCallback(() => {
    return JSON.stringify(config, null, 2);
  }, [config]);

  const importConfig = useCallback(async (jsonString: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(jsonString) as Partial<PrintLayoutConfig>;
      // Validate that it has the required structure
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Invalid config format');
      }
      // Merge with defaults to ensure all fields exist
      const mergedConfig = deepMerge(DEFAULT_PRINT_LAYOUT, parsed);
      await saveConfig(mergedConfig);
      return true;
    } catch (error) {
      console.error('Failed to import print layout config:', error);
      return false;
    }
  }, []);

  const value: PrintLayoutContextType = {
    config,
    isLoading,
    updateConfigValue,
    updateConfig,
    resetToDefault,
    applyPreset,
    getPresetNames,
    exportConfig,
    importConfig,
  };

  return (
    <PrintLayoutContext.Provider value={value}>
      {children}
    </PrintLayoutContext.Provider>
  );
};

export const usePrintLayout = (): PrintLayoutContextType => {
  const context = useContext(PrintLayoutContext);
  if (!context) {
    throw new Error('usePrintLayout must be used within a PrintLayoutProvider');
  }
  return context;
};

export default PrintLayoutContext;
