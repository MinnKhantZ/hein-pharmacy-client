import React, { useState } from 'react';
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
import { useThemeColor } from '../hooks/use-theme-color';
import type { ReceiptData } from '../utils/receiptFormatter';

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

  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [printing, setPrinting] = useState(false);

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
    } else {
      // For mobile, show printer selection modal
      setShowPrinterModal(true);
      scanForPrinters();
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
      
      // Print receipt
      setPrinting(true);
      await printerService.printReceipt(receiptData);
      
      setShowPrinterModal(false);
      Alert.alert('Success', 'Receipt printed successfully!');
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

  const renderPrinterItem = ({ item }: { item: PrinterDevice }) => (
    <TouchableOpacity
      style={[styles.printerItem, { borderColor }]}
      onPress={() => handlePrinterSelect(item)}
      disabled={connecting || printing}
    >
      <Text style={[styles.printerName, { color: textColor }]}>{item.name}</Text>
      <Text style={[styles.printerAddress, { color: textColor, opacity: 0.6 }]}>
        {item.address}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.printButton, buttonStyle]}
        onPress={handlePrintPress}
        disabled={printing}
      >
        {printing ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text style={styles.printButtonText}>
            {buttonText || t('Print Receipt')}
          </Text>
        )}
      </TouchableOpacity>

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
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  {t('Select Printer')}
                </Text>
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
    </>
  );
};

const styles = StyleSheet.create({
  printButton: {
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
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
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
});

export default PrintReceipt;
