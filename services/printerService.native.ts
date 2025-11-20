import { BluetoothEscposPrinter, BluetoothManager } from '@vardrz/react-native-bluetooth-escpos-printer';

export interface PrinterDevice {
  name: string;
  address: string;
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
      // First ensure Bluetooth is enabled
      const isEnabled = await BluetoothManager.isBluetoothEnabled();
      if (!isEnabled) {
        // Try to enable Bluetooth, which also returns paired devices
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
        
        // Return paired devices if user enabled Bluetooth
        if (paired.length > 0) {
          return paired;
        }
      }
      
      // Try scanning for new devices
      try {
        const scanResult = await (BluetoothManager as any).scanDevices();
        const result = JSON.parse(scanResult);
        
        const pairedDevices: PrinterDevice[] = result.paired || [];
        const foundDevices: PrinterDevice[] = result.found || [];
        
        // Combine both arrays and remove duplicates
        const allDevices = [...pairedDevices, ...foundDevices];
        const uniqueDevices = allDevices.filter((device, index, self) =>
          index === self.findIndex((d) => d.address === device.address)
        );
        
        return uniqueDevices;
      } catch (scanError: any) {
        // If scan fails, return empty array and let user know to pair devices
        console.warn('Scan failed:', scanError);
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
      await BluetoothManager.connect(address);
    } catch (error) {
      console.error('Failed to connect to printer:', error);
      throw new Error('Failed to connect to printer');
    }
  }

  async disconnect(): Promise<void> {
    try {
      await BluetoothManager.disconnect();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  }

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
      
      // Feed paper
      await BluetoothEscposPrinter.printText('\n\n\n', {});
      
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
