import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { usePrinter } from '../contexts/PrinterContext';
import { usePrintLayout } from '../contexts/PrintLayoutContext';
import { useThemeColor } from '../hooks/use-theme-color';
import type { ReceiptData } from '../utils/receiptFormatter';
import ReceiptView from './ReceiptView';

// Conditionally import view-shot only on native platforms
const ViewShot = Platform.OS !== 'web' 
  ? require('react-native-view-shot').default
  : null;

// PrinterDevice type definition
interface PrinterDevice {
  name: string;
  address: string;
}

// Dynamically import the appropriate service to avoid importing native modules on web
const printerServiceModule = Platform.OS === 'web' 
  ? require('../services/printerService.web')
  : require('../services/printerService.native');

const printerService = printerServiceModule.default;

// Button colors based on printer status
const BUTTON_COLORS = {
  notConnected: '#2196F3',    // Blue - no printer saved/selected
  connected: '#4CAF50',       // Green - printer saved and available
  connecting: '#FF9800',      // Orange - connecting in progress
  error: '#f44336',           // Red - connection error
};

interface PrintReceiptProps {
  receiptData: ReceiptData;
  buttonText?: string;
  buttonStyle?: any;
  onPrintSuccess?: () => void;
  onPrintError?: (error: string) => void;
}

const PrintReceipt: React.FC<PrintReceiptProps> = ({
  receiptData,
  buttonText,
  buttonStyle,
  onPrintSuccess,
  onPrintError,
}) => {
  const { t } = useTranslation();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = '#e0e0e0';

  // Printer context
  const {
    savedPrinter,
    setSavedPrinter,
    clearSavedPrinter,
  } = usePrinter();

  // Print layout configuration
  const { config: printLayoutConfig } = usePrintLayout();

  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [printing, setPrinting] = useState(false);
  
  // Ref for capturing receipt view as image
  const receiptRef = useRef<any>(null);

  // Get button color based on printer status
  const getButtonColor = () => {
    if (Platform.OS === 'web') {
      return BUTTON_COLORS.notConnected;
    }
    
    if (connecting) {
      return BUTTON_COLORS.connecting;
    }
    
    if (savedPrinter) {
      return BUTTON_COLORS.connected;
    }
    
    return BUTTON_COLORS.notConnected;
  };

  // Get button text based on printer status
  const getButtonText = () => {
    if (buttonText) return buttonText;
    
    if (Platform.OS === 'web') {
      return t('Print Receipt');
    }
    
    if (savedPrinter) {
      return `${t('Print')} (${savedPrinter.name})`;
    }
    
    return t('Print Receipt');
  };

  // Capture receipt as image using ViewShot component
  const captureReceipt = async (): Promise<string | null> => {
    if (receiptRef.current && receiptRef.current.capture) {
      try {
        // ViewShot.capture() returns base64 directly when result: 'base64'
        const base64 = await receiptRef.current.capture();
        return base64;
      } catch (error) {
        console.error('Failed to capture receipt:', error);
        return null;
      }
    }
    return null;
  };

  const handlePrintPress = async () => {
    if (Platform.OS === 'web') {
      // For web, print directly without modal
      try {
        setPrinting(true);
        await printerService.printReceipt(receiptData);
        onPrintSuccess?.();
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to print receipt';
        Alert.alert('Print Error', errorMessage);
        onPrintError?.(errorMessage);
      } finally {
        setPrinting(false);
      }
    } else if (savedPrinter) {
      // If we have a saved printer, print directly without checking availability
      await printWithSavedPrinter();
    } else {
      // For mobile without saved printer, show printer selection modal
      setShowPrinterModal(true);
      scanForPrinters();
    }
  };

  // Print using saved printer without showing modal
  const printWithSavedPrinter = async () => {
    if (!savedPrinter) return;
    
    try {
      setConnecting(true);
      
      // Connect to saved printer
      await printerService.connectToPrinter(savedPrinter.address);
      
      // Print receipt as image
      setPrinting(true);
      
      const base64Image = await captureReceipt();
      console.log('Captured image length:', base64Image?.length || 0);
      if (base64Image) {
        await printerService.printReceiptImage(base64Image, 80);
      } else {
        await printerService.printReceipt(receiptData);
      }
      
      Alert.alert('Success', 'Receipt printed successfully!');
      onPrintSuccess?.();
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to print receipt';
      
      // If printing with saved printer fails, offer to select a new printer
      Alert.alert(
        'Print Error',
        `${errorMessage}\n\nWould you like to select a different printer?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Select Printer', 
            onPress: () => {
              setShowPrinterModal(true);
              scanForPrinters();
            }
          },
          {
            text: 'Clear Saved Printer',
            style: 'destructive',
            onPress: async () => {
              await clearSavedPrinter();
            }
          }
        ]
      );
      onPrintError?.(errorMessage);
    } finally {
      // Always try to disconnect
      try {
        await printerService.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      setConnecting(false);
      setPrinting(false);
    }
  };

  const scanForPrinters = async () => {
    try {
      setScanning(true);
      const devices = await printerService.scanPrinters();
      console.log('Devices returned from scanPrinters:', devices);
      setPrinters(devices);
      
      if (devices.length === 0) {
        Alert.alert(
          'No Printers Found',
          'Please check:\n\n' +
          '1. Bluetooth is ON\n' +
          '2. Location/GPS is ON (required for Bluetooth scanning)\n' +
          '3. Printer is paired in Settings > Bluetooth\n' +
          '4. Location permission is granted for this app',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: scanForPrinters },
          ]
        );
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to scan for printers';
      Alert.alert(
        'Scan Error', 
        errorMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: scanForPrinters },
        ]
      );
    } finally {
      setScanning(false);
    }
  };

  const handlePrinterSelect = async (printer: PrinterDevice) => {
    try {
      setConnecting(true);
      
      // Connect to printer
      await printerService.connectToPrinter(printer.address);
      
      // Save the printer for future use
      await setSavedPrinter(printer);
      
      // Print receipt as image to support Burmese characters
      setPrinting(true);
      
      const base64Image = await captureReceipt();
      console.log('Captured image length:', base64Image?.length || 0);
      if (base64Image) {
        // Print the image
        await printerService.printReceiptImage(base64Image, 80);
      } else {
        // Fallback to text-based printing if view-shot is not available
        await printerService.printReceipt(receiptData);
      }
      
      setShowPrinterModal(false);
      Alert.alert('Success', `Receipt printed successfully!\n\n"${printer.name}" has been saved as your default printer.`);
      onPrintSuccess?.();
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to print receipt';
      Alert.alert('Print Error', errorMessage);
      onPrintError?.(errorMessage);
    } finally {
      // Always try to disconnect
      try {
        await printerService.disconnect();
      } catch (e) {
        // Ignore disconnect errors in cleanup
      }
      setConnecting(false);
      setPrinting(false);
    }
  };

  const renderPrinterItem = ({ item }: { item: PrinterDevice }) => {
    const isSavedPrinter = savedPrinter?.address === item.address;
    
    return (
      <TouchableOpacity
        style={[
          styles.printerItem, 
          { borderColor: isSavedPrinter ? BUTTON_COLORS.connected : borderColor },
          isSavedPrinter && styles.savedPrinterItem
        ]}
        onPress={() => handlePrinterSelect(item)}
        disabled={connecting || printing}
      >
        <View style={styles.printerItemContent}>
          <View style={styles.printerInfo}>
            <Text style={[styles.printerName, { color: textColor }]}>{item.name}</Text>
            <Text style={[styles.printerAddress, { color: textColor, opacity: 0.6 }]}>
              {item.address}
            </Text>
          </View>
          {isSavedPrinter && (
            <View style={styles.savedBadge}>
              <Text style={styles.savedBadgeText}>{t('Saved')}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      {/* Hidden receipt view for image capture - only on native platforms */}
      {Platform.OS !== 'web' && ViewShot && (
        <View style={styles.hiddenContainer}>
          <ViewShot
            ref={receiptRef}
            options={{
              format: 'png',
              quality: 1,
              result: 'base64',
            }}
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <ReceiptView data={receiptData} width={printLayoutConfig.paperWidth} layoutConfig={printLayoutConfig} />
          </ViewShot>
        </View>
      )}
      
      <View style={styles.buttonContainer}>
        {/* Preview Button - Commented out */}
        {/*
        <TouchableOpacity
          style={[
            styles.previewButton,
            buttonStyle
          ]}
          onPress={() => setShowPreviewModal(true)}
        >
          <Text style={styles.previewButtonText}>
            👁️ {t('Preview')}
          </Text>
        </TouchableOpacity>
        */}

        {/* Print Button */}
        <TouchableOpacity
          style={[
            styles.printButton, 
            { backgroundColor: getButtonColor() },
            buttonStyle
          ]}
          onPress={handlePrintPress}
          onLongPress={() => {
            if (Platform.OS !== 'web') {
              // Long press to change printer
              setShowPrinterModal(true);
              scanForPrinters();
            }
          }}
          disabled={printing || connecting}
        >
          {printing || connecting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.printButtonText}>
              {getButtonText()}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {Platform.OS !== 'web' && (
        <Modal
          visible={showPrinterModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPrinterModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: textColor }]}>
                    {t('Select Printer')}
                  </Text>
                  {savedPrinter && (
                    <Text style={[styles.modalSubtitle, { color: textColor, opacity: 0.7 }]}>
                      {t('Current')}: {savedPrinter.name}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => setShowPrinterModal(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1, overflow: 'hidden' }}>
              {scanning ? (
                <View style={styles.centerContent}>
                  <ActivityIndicator size="large" color="#2196F3" />
                  <Text style={[styles.scanningText, { color: textColor }]}>
                    {t('Scanning for printers...')}
                  </Text>
                </View>
              ) : connecting || printing ? (
                <View style={styles.centerContent}>
                  <ActivityIndicator size="large" color="#2196F3" />
                  <Text style={[styles.scanningText, { color: textColor }]}>
                    {printing ? t('Printing...') : t('Connecting...')}
                  </Text>
                </View>
              ) : printers.length > 0 ? (
                <FlatList
                  data={printers}
                  renderItem={renderPrinterItem}
                  keyExtractor={(item) => item.address}
                  style={styles.printerList}
                  scrollEnabled={true}
                />
              ) : (
                <View style={styles.centerContent}>
                  <Text style={[styles.noPrintersText, { color: textColor }]}>
                    {t('No printers found')}
                  </Text>
                </View>
              )}
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.retryButton, { borderColor }]}
                  onPress={scanForPrinters}
                  disabled={scanning || connecting || printing}
                >
                  <Text style={[styles.retryButtonText, { color: textColor }]}>
                    {t('Retry Scan')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowPrinterModal(false)}
                  disabled={connecting || printing}
                >
                  <Text style={styles.cancelButtonText}>{t('Cancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Preview Modal */}
      <Modal
        visible={showPreviewModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPreviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  {t('Receipt Preview')}
                </Text>
                <Text style={[styles.modalSubtitle, { color: textColor, opacity: 0.7 }]}>
                  {t('How your receipt will appear when printed')}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowPreviewModal(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.previewContainer}>
              <ReceiptView 
                data={receiptData} 
                width={printLayoutConfig.paperWidth} 
                layoutConfig={{
                  ...printLayoutConfig,
                  scale: 0.5, // Use smaller scale for more compact preview
                }} 
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPreviewModal(false)}
              >
                <Text style={styles.cancelButtonText}>{t('Close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    top: -10000,
    left: -10000,
    opacity: 0,
    pointerEvents: 'none',
    zIndex: -9999,
    backgroundColor: '#FFFFFF',
  },
  printButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  printButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    height: '80%',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    flex: 0,
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  scanningText: {
    marginTop: 15,
    fontSize: 16,
  },
  noPrintersText: {
    fontSize: 16,
    textAlign: 'center',
  },
  printerList: {
    flex: 1,
  },
  printerItem: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  savedPrinterItem: {
    borderWidth: 2,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  printerItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  printerInfo: {
    flex: 1,
  },
  savedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 10,
  },
  savedBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  printerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  printerAddress: {
    fontSize: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  retryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f44336',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  previewButton: {
    flex: 1,
    backgroundColor: '#666',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  previewButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginVertical: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
});

export default PrintReceipt;
