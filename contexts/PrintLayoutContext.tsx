import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import { deviceAPI } from "../services/api";
import notificationService from "../services/notificationService";
import { DEFAULT_PRINT_LAYOUT, PrintLayoutConfig } from "../types/printLayout";
import { useAuth } from "./AuthContext";

interface PrintLayoutContextType {
  /** Current print layout configuration */
  config: PrintLayoutConfig;
  /** Whether config is still loading from server */
  isLoading: boolean;
  /** Reload configuration from server */
  reloadConfig: () => Promise<void>;
  /** Persist configuration to server and update context state */
  saveConfig: (newConfig: PrintLayoutConfig) => Promise<void>;
}

const PrintLayoutContext = createContext<PrintLayoutContextType | undefined>(
  undefined,
);

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
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === "object" &&
        !Array.isArray(targetValue)
      ) {
        (result as any)[key] = deepMerge(
          targetValue as object,
          sourceValue as object,
        );
      } else if (sourceValue !== undefined) {
        (result as any)[key] = sourceValue;
      }
    }
  }

  return result;
};

export const PrintLayoutProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuth();
  const [config, setConfig] = useState<PrintLayoutConfig>(DEFAULT_PRINT_LAYOUT);
  const [isLoading, setIsLoading] = useState(true);

  const reloadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!isAuthenticated) {
        setConfig(DEFAULT_PRINT_LAYOUT);
        return;
      }

      const pushToken = await notificationService.getStoredPushToken();
      const deviceId = notificationService.getStableDeviceId();
      if (!pushToken && !deviceId) {
        // Device not registered (yet) - fall back to default
        setConfig(DEFAULT_PRINT_LAYOUT);
        return;
      }

      const response = await deviceAPI.getPrintLayoutConfig(
        pushToken,
        deviceId,
      );
      const serverConfig = response?.data?.device?.print_layout_config;

      if (serverConfig && typeof serverConfig === "object") {
        setConfig(deepMerge(DEFAULT_PRINT_LAYOUT, serverConfig));
      } else {
        setConfig(DEFAULT_PRINT_LAYOUT);
      }
    } catch (error) {
      console.error("Failed to load print layout config from server:", error);
      setConfig(DEFAULT_PRINT_LAYOUT);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const saveConfig = useCallback(
    async (newConfig: PrintLayoutConfig) => {
      if (!isAuthenticated) {
        throw new Error("Not authenticated");
      }

      const pushToken = await notificationService.getStoredPushToken();
      const deviceId = notificationService.getStableDeviceId();
      if (!pushToken && !deviceId) {
        throw new Error("No identification available for this device");
      }

      // Ensure any newly-added fields exist
      const mergedConfig = deepMerge(DEFAULT_PRINT_LAYOUT, newConfig);
      await deviceAPI.updatePrintLayoutConfig(
        pushToken,
        mergedConfig,
        deviceId,
      );
      setConfig(mergedConfig);
    },
    [isAuthenticated],
  );

  // Load config when auth state changes
  useEffect(() => {
    reloadConfig();
  }, [reloadConfig]);

  const value: PrintLayoutContextType = {
    config,
    isLoading,
    reloadConfig,
    saveConfig,
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
    throw new Error("usePrintLayout must be used within a PrintLayoutProvider");
  }
  return context;
};

export default PrintLayoutContext;
