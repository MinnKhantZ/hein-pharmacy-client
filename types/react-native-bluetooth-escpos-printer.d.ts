declare module 'react-native-bluetooth-escpos-printer' {
  export interface PrinterDevice {
    name: string;
    address: string;
  }

  export interface PrintOptions {
    encoding?: string;
    codepage?: number;
    widthtimes?: number;
    heigthtimes?: number;
    fonttype?: number;
  }

  export class BluetoothManager {
    static isBluetoothEnabled(): Promise<boolean>;
    static enableBluetooth(): Promise<void>;
    static pairedDevices(): Promise<string>;
    static connect(address: string): Promise<void>;
    static disconnect(): Promise<void>;
  }

  export class BluetoothEscposPrinter {
    static ALIGN: {
      LEFT: number;
      CENTER: number;
      RIGHT: number;
    };
    
    static printerAlign(align: number): Promise<void>;
    static printText(text: string, options?: PrintOptions): Promise<void>;
    static printColumn(
      widths: number[],
      aligns: number[],
      texts: string[],
      options?: PrintOptions
    ): Promise<void>;
  }
}
