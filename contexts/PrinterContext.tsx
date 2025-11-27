import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

// PrinterDevice type definition
interface PrinterDevice {
  name: string;
  address: string;
}

interface PrinterContextType {
  // Saved printer info
  savedPrinter: PrinterDevice | null;
  // Connection status: 'disconnected' | 'connecting' | 'connected' | 'error'
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  // Available printers from last scan
  availablePrinters: PrinterDevice[];
  // Loading states
  isScanning: boolean;
  // Actions
  setSavedPrinter: (printer: PrinterDevice | null) => Promise<void>;
  connectToSavedPrinter: () => Promise<boolean>;
  disconnectPrinter: () => Promise<void>;
  scanForPrinters: () => Promise<PrinterDevice[]>;
  checkSavedPrinterAvailability: () => Promise<boolean>;
  clearSavedPrinter: () => Promise<void>;
}

const PRINTER_STORAGE_KEY = 'savedBluetoothPrinter';

const PrinterContext = createContext<PrinterContextType | undefined>(undefined);

// Dynamically import the appropriate service to avoid importing native modules on web
const printerServiceModule = Platform.OS === 'web' 
  ? null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  : require('../services/printerService.native');

const printerService = printerServiceModule?.default;

export const PrinterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [savedPrinter, setSavedPrinterState] = useState<PrinterDevice | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [availablePrinters, setAvailablePrinters] = useState<PrinterDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Load saved printer on mount
  useEffect(() => {
    loadSavedPrinter();
  }, []);

  const loadSavedPrinter = async () => {
    try {
      const stored = await AsyncStorage.getItem(PRINTER_STORAGE_KEY);
      if (stored) {
        const printer = JSON.parse(stored) as PrinterDevice;
        setSavedPrinterState(printer);
      }
    } catch (error) {
      console.error('Failed to load saved printer:', error);
    }
  };

  const setSavedPrinter = useCallback(async (printer: PrinterDevice | null) => {
    try {
      if (printer) {
        await AsyncStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(printer));
      } else {
        await AsyncStorage.removeItem(PRINTER_STORAGE_KEY);
      }
      setSavedPrinterState(printer);
    } catch (error) {
      console.error('Failed to save printer:', error);
    }
  }, []);

  const clearSavedPrinter = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(PRINTER_STORAGE_KEY);
      setSavedPrinterState(null);
      setConnectionStatus('disconnected');
    } catch (error) {
      console.error('Failed to clear saved printer:', error);
    }
  }, []);

  const scanForPrinters = useCallback(async (): Promise<PrinterDevice[]> => {
    if (Platform.OS === 'web' || !printerService) {
      return [];
    }

    try {
      setIsScanning(true);
      const devices = await printerService.scanPrinters();
      setAvailablePrinters(devices);
      return devices;
    } catch (error) {
      console.error('Failed to scan for printers:', error);
      return [];
    } finally {
      setIsScanning(false);
    }
  }, []);

  const checkSavedPrinterAvailability = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web' || !savedPrinter || !printerService) {
      return false;
    }

    try {
      setIsScanning(true);
      const devices = await printerService.scanPrinters();
      setAvailablePrinters(devices);
      
      // Check if saved printer is in the list
      const isAvailable = devices.some(
        (device: PrinterDevice) => device.address === savedPrinter.address
      );
      
      return isAvailable;
    } catch (error) {
      console.error('Failed to check printer availability:', error);
      return false;
    } finally {
      setIsScanning(false);
    }
  }, [savedPrinter]);

  const connectToSavedPrinter = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web' || !savedPrinter || !printerService) {
      return false;
    }

    try {
      setConnectionStatus('connecting');
      await printerService.connectToPrinter(savedPrinter.address);
      setConnectionStatus('connected');
      return true;
    } catch (error) {
      console.error('Failed to connect to saved printer:', error);
      setConnectionStatus('error');
      return false;
    }
  }, [savedPrinter]);

  const disconnectPrinter = useCallback(async () => {
    if (Platform.OS === 'web' || !printerService) {
      return;
    }

    try {
      await printerService.disconnect();
      setConnectionStatus('disconnected');
    } catch (error) {
      console.error('Failed to disconnect printer:', error);
    }
  }, []);

  const value: PrinterContextType = {
    savedPrinter,
    connectionStatus,
    availablePrinters,
    isScanning,
    setSavedPrinter,
    connectToSavedPrinter,
    disconnectPrinter,
    scanForPrinters,
    checkSavedPrinterAvailability,
    clearSavedPrinter,
  };

  return (
    <PrinterContext.Provider value={value}>
      {children}
    </PrinterContext.Provider>
  );
};

export const usePrinter = (): PrinterContextType => {
  const context = useContext(PrinterContext);
  if (!context) {
    throw new Error('usePrinter must be used within a PrinterProvider');
  }
  return context;
};

export default PrinterContext;
