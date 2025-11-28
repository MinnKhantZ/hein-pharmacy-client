import { BluetoothEscposPrinter, BluetoothManager } from '@vardrz/react-native-bluetooth-escpos-printer';
import { PermissionsAndroid, Platform } from 'react-native';

export interface PrinterDevice {
  name: string;
  address: string;
}

// Paper width in dots (384 for 80mm paper at 203 DPI, 384 is standard)
const PAPER_WIDTH_80MM = 384;
const PAPER_WIDTH_58MM = 384;

// Request Bluetooth permissions for Android 12+ (API level 31+)
async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    // For Android 12+ (API level 31+), we need BLUETOOTH_SCAN and BLUETOOTH_CONNECT
    // For older versions, we need ACCESS_FINE_LOCATION for Bluetooth scanning
    const androidVersion = Platform.Version;
    
    if (androidVersion >= 31) {
      // Android 12+
      const permissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ];
      
      const results = await PermissionsAndroid.requestMultiple(permissions);
      
      const allGranted = Object.values(results).every(
        (result) => result === PermissionsAndroid.RESULTS.GRANTED
      );
      
      if (!allGranted) {
        console.warn('Bluetooth permissions not granted:', results);
        return false;
      }
      
      return true;
    } else {
      // Android 11 and below - need location permission for Bluetooth scanning
      const locationPermission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs location access to scan for Bluetooth printers.',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        }
      );
      
      return locationPermission === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (error) {
    console.error('Error requesting Bluetooth permissions:', error);
    return false;
  }
}

export interface ReceiptData {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  saleId: number;
  saleDate: string;
  customerName?: string;
  customerPhone?: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  totalAmount: number;
  paymentMethod: string;
  notes?: string;
}

class PrinterService {
  private connectedAddress: string | null = null;

  async enableBluetooth(): Promise<PrinterDevice[]> {
    try {
      const isEnabled = await BluetoothManager.isBluetoothEnabled();
      if (!isEnabled) {
        // enableBluetooth() returns array of paired devices on Android
        // Each device is a JSON string that needs to be parsed
        const pairedDevicesRaw = (await BluetoothManager.enableBluetooth()) as any;
        const paired: PrinterDevice[] = [];
        
        if (Array.isArray(pairedDevicesRaw) && pairedDevicesRaw.length > 0) {
          for (let i = 0; i < pairedDevicesRaw.length; i++) {
            try {
              paired.push(JSON.parse(pairedDevicesRaw[i]));
            } catch (e) {
              console.warn('Failed to parse device:', e);
            }
          }
        }
        return paired;
      }
      return [];
    } catch (error) {
      console.error('Failed to enable Bluetooth:', error);
      throw new Error('Please enable Bluetooth to use the printer');
    }
  }

  async scanPrinters(): Promise<PrinterDevice[]> {
    try {
      // First request Bluetooth permissions (required for Android 12+, location for Android 11-)
      const hasPermissions = await requestBluetoothPermissions();
      if (!hasPermissions) {
        throw new Error('Bluetooth permissions are required to scan for printers. Please grant permissions in app settings.');
      }
      
      // Ensure Bluetooth is enabled
      const isEnabled = await BluetoothManager.isBluetoothEnabled();
      if (!isEnabled) {
        // Try to enable Bluetooth, which also returns paired devices on Android
        const pairedDevicesRaw = (await BluetoothManager.enableBluetooth()) as any;
        const paired: PrinterDevice[] = [];
        
        if (Array.isArray(pairedDevicesRaw) && pairedDevicesRaw.length > 0) {
          for (let i = 0; i < pairedDevicesRaw.length; i++) {
            try {
              paired.push(JSON.parse(pairedDevicesRaw[i]));
            } catch (e) {
              console.warn('Failed to parse device:', e);
            }
          }
        }
        
        // Return paired devices if found after enabling Bluetooth
        if (paired.length > 0) {
          return paired;
        }
      }
      
      // Try scanning for devices (this returns both paired and found devices)
      try {
        console.log('Scanning for Bluetooth devices...');
        const scanResult = await (BluetoothManager as any).scanDevices();
        console.log('Scan result:', scanResult);
        
        const result = JSON.parse(scanResult);
        
        const pairedDevices: PrinterDevice[] = result.paired || [];
        const foundDevices: PrinterDevice[] = result.found || [];
        
        console.log('Paired devices:', pairedDevices);
        console.log('Found devices:', foundDevices);
        
        // Ensure all devices have a name, use address as fallback
        const normalizedPairedDevices = pairedDevices.map(device => ({
          ...device,
          name: device.name || device.address
        }));
        
        const normalizedFoundDevices = foundDevices.map(device => ({
          ...device,
          name: device.name || `Printer (${device.address})`
        }));
        
        // Combine both arrays and remove duplicates
        const allDevices = [...normalizedPairedDevices, ...normalizedFoundDevices];
        const uniqueDevices = allDevices.filter((device, index, self) =>
          index === self.findIndex((d) => d.address === device.address)
        );
        
        // If we have devices, return them
        if (uniqueDevices.length > 0) {
          return uniqueDevices;
        }
        
        // If scanDevices returned empty, the scan might still be in progress
        // or location services might be off. Return empty and show helpful message.
        console.log('No devices found from scan');
        return [];
      } catch (scanError: any) {
        // If scan fails, log the error for debugging
        console.warn('Scan failed with error:', scanError?.message || scanError);
        
        // On Android 11, if location is off, scanning will fail
        // Return empty array with a helpful message
        return [];
      }
    } catch (error: any) {
      console.error('Failed to scan printers:', error);
      
      // Provide more specific error messages
      if (error.message && error.message.includes('NOT_STARTED')) {
        throw new Error('Bluetooth scanning not available. Please pair your printer in device settings first.');
      } else if (error.message && error.message.includes('PERMISSION')) {
        throw new Error('Bluetooth permission denied. Please grant Bluetooth permissions in app settings.');
      }
      
      throw new Error('Failed to scan for printers. Please ensure Bluetooth is enabled and permissions are granted.');
    }
  }

  async connectToPrinter(address: string): Promise<void> {
    try {
      // First, try to disconnect any existing connection
      if (this.connectedAddress) {
        try {
          await BluetoothManager.disconnect(this.connectedAddress);
        } catch (disconnectError) {
          // Ignore disconnect errors, continue with new connection
          console.warn('Disconnect before reconnect failed:', disconnectError);
        }
        this.connectedAddress = null;
      }

      // Also try to disconnect the target device in case it's in a stale state
      try {
        await BluetoothManager.disconnect(address);
      } catch (disconnectError) {
        // Ignore, device might not be connected
      }

      // Small delay to ensure the disconnection is complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Now attempt to connect
      await BluetoothManager.connect(address);
      this.connectedAddress = address;
    } catch (error) {
      console.error('Failed to connect to printer:', error);
      this.connectedAddress = null;
      throw new Error('Failed to connect to printer. Please ensure the printer is on and in range.');
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.connectedAddress) {
        await BluetoothManager.disconnect(this.connectedAddress);
        this.connectedAddress = null;
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
      // Reset the address even if disconnect fails
      this.connectedAddress = null;
    }
  }

  /**
   * Print receipt as image (supports Burmese/Myanmar characters)
   * @param base64Image - Base64 encoded image data (without data:image prefix)
   * @param paperSize - Paper size in mm (58 or 80)
   */
  async printReceiptImage(base64Image: string, paperSize: 58 | 80 = 80): Promise<void> {
    try {
      // Remove data URL prefix if present
      const imageData = base64Image.replace(/^data:image\/\w+;base64,/, '');
      
      // Calculate dynamic delay based on image size
      // Estimate: ~10ms per KB for image transmission + 2s for printing + 1.5s for cutting
      const byteLength = imageData.length;
      const transmissionDelay = Math.ceil(byteLength / 1024) * 5;
      const totalDelay = transmissionDelay + 1000; // transmission + print + cut

      // Print image with proper options for 80mm (78mm printable) paper
      // Use higher width for 3x scale image to maintain quality
      // autoCut: true handles cutting after the image is fully printed
      await BluetoothEscposPrinter.printPic(imageData, {
        width: 576,
        left: 0,
        paperSize: paperSize,
        autoCut: true,
      });
      
      // Wait for image printing and auto-cut to complete
      console.log(`Waiting ${totalDelay}ms for printing (${transmissionDelay}ms transmission + 1000ms)`);
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    } catch (error) {
      console.error('Failed to print receipt image:', error);
      throw new Error('Failed to print receipt image');
    }
  }

  /**
   * Print receipt using text commands (legacy method - doesn't support Burmese)
   * @deprecated Use printReceiptImage for Burmese text support
   */
  async printReceipt(data: ReceiptData): Promise<void> {
    try {
      // Print header
      await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
      await BluetoothEscposPrinter.printText(data.storeName + '\n', {
        encoding: 'UTF-8',
        codepage: 0,
        widthtimes: 1,
        heigthtimes: 1,
        fonttype: 1,
      });

      if (data.storeAddress) {
        await BluetoothEscposPrinter.printText(data.storeAddress + '\n', {});
      }

      if (data.storePhone) {
        await BluetoothEscposPrinter.printText('Tel: ' + data.storePhone + '\n', {});
      }

      await BluetoothEscposPrinter.printText('================================\n', {});
      
      // Print sale info
      await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);
      await BluetoothEscposPrinter.printText(`Receipt #: ${data.saleId}\n`, {});
      await BluetoothEscposPrinter.printText(`Date: ${data.saleDate}\n`, {});
      
      if (data.customerName) {
        await BluetoothEscposPrinter.printText(`Customer: ${data.customerName}\n`, {});
      }
      
      if (data.customerPhone) {
        await BluetoothEscposPrinter.printText(`Phone: ${data.customerPhone}\n`, {});
      }

      await BluetoothEscposPrinter.printText('================================\n', {});
      
      // Print items header
      await BluetoothEscposPrinter.printColumn(
        [16, 4, 4, 8],
        [
          BluetoothEscposPrinter.ALIGN.LEFT,
          BluetoothEscposPrinter.ALIGN.CENTER,
          BluetoothEscposPrinter.ALIGN.RIGHT,
          BluetoothEscposPrinter.ALIGN.RIGHT,
        ],
        ['Item', 'Qty', 'Price', 'Total'],
        {}
      );
      
      await BluetoothEscposPrinter.printText('--------------------------------\n', {});

      // Print items
      for (const item of data.items) {
        await BluetoothEscposPrinter.printColumn(
          [16, 4, 4, 8],
          [
            BluetoothEscposPrinter.ALIGN.LEFT,
            BluetoothEscposPrinter.ALIGN.CENTER,
            BluetoothEscposPrinter.ALIGN.RIGHT,
            BluetoothEscposPrinter.ALIGN.RIGHT,
          ],
          [
            item.name.length > 16 ? item.name.substring(0, 13) + '...' : item.name,
            item.quantity.toString(),
            item.unitPrice.toFixed(0),
            item.total.toFixed(0),
          ],
          {}
        );
      }

      await BluetoothEscposPrinter.printText('================================\n', {});
      
      // Print total
      await BluetoothEscposPrinter.printColumn(
        [24, 8],
        [BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.RIGHT],
        ['TOTAL:', data.totalAmount.toFixed(0)],
        { widthtimes: 1, heigthtimes: 1 }
      );

      await BluetoothEscposPrinter.printText('--------------------------------\n', {});
      
      // Print payment method
      const paymentMethodText = data.paymentMethod.charAt(0).toUpperCase() + data.paymentMethod.slice(1);
      await BluetoothEscposPrinter.printText(`Payment Method: ${paymentMethodText}\n`, {});

      // Print notes if present
      if (data.notes) {
        await BluetoothEscposPrinter.printText('\n', {});
        await BluetoothEscposPrinter.printText('Notes: ' + data.notes + '\n', {});
      }

      // Print footer
      await BluetoothEscposPrinter.printText('\n', {});
      await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
      await BluetoothEscposPrinter.printText('Thank you for your business!\n', {});
      await BluetoothEscposPrinter.printText('================================\n', {});
      
      // Feed paper and cut
      await BluetoothEscposPrinter.printText('\n\n\n', {});
      
      // Trigger auto cutter
      await BluetoothEscposPrinter.cutOnePoint();
      
    } catch (error) {
      console.error('Failed to print receipt:', error);
      throw new Error('Failed to print receipt');
    }
  }

  async isConnected(): Promise<boolean> {
    // There's no direct isConnected method in the library
    return true; // Assume connected if no error thrown in previous operations
  }
}

export default new PrinterService();
