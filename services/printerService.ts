// This file exports the appropriate printer service based on platform
import { Platform } from 'react-native';

// Import types from native file (both have identical type definitions)
import type { PrinterDevice as NativePrinterDevice, ReceiptData as NativeReceiptData } from './printerService.native';

// Re-export types
export type PrinterDevice = NativePrinterDevice;
export type ReceiptData = NativeReceiptData;

// Export the platform-specific service
const printerService = Platform.OS === 'web'
  ? require('./printerService.web').default
  : require('./printerService.native').default;

export default printerService;
