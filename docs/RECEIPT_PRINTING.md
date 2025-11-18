# Sales Receipt Printing Feature

## Overview
This feature enables printing sales receipts on both mobile and web platforms using Bluetooth thermal printers for mobile devices and the browser's print dialog for web.

## Implementation Files

### Core Services
- **`services/printerService.native.ts`** - Bluetooth ESC/POS printer implementation for iOS/Android
- **`services/printerService.web.ts`** - Browser-based printing implementation for web
- **`services/printerService.ts`** - Platform selector (exports appropriate service)

### Components
- **`components/PrintReceipt.tsx`** - Reusable component with printer selection modal and print button

### Utilities
- **`utils/receiptFormatter.ts`** - Formats sale data for receipt printing
- **`types/react-native-bluetooth-escpos-printer.d.ts`** - TypeScript declarations for printer library

### Integration Points
- **`app/sales-details/[id].tsx`** - Print button added to sale details view

## Features

### Mobile (iOS/Android)
- Bluetooth printer discovery and pairing
- ESC/POS command-based thermal printing
- Printer connection modal with device selection
- Enhanced receipt formatting for thermal printers (32-column width)
- Professional layout with:
  - **Header**: Store name with larger font, address, phone
  - **Receipt Title**: "SALES RECEIPT" prominently displayed
  - **Sale Information**: Receipt # (padded to 6 digits), date/time, customer details
  - **Item Table**: Name, quantity, unit price, total with improved alignment
  - **Totals Section**: Subtotal and grand total with enhanced formatting
  - **Payment Info**: Payment method with professional styling
  - **Notes**: Highlighted notes section when present
  - **QR Code**: Digital verification QR code with receipt number
  - **Footer**: Professional thank you message and contact info
- Support for:
  - Store header (name, address, phone)
  - Sale information (ID, date, customer details)
  - Item table with quantities and prices
  - Payment method display
  - Notes section
  - QR code for digital verification
  - Enhanced thank you message

### Web
- Browser print dialog integration
- Professional HTML receipt formatting with modern CSS
- Print-optimized styling (80mm paper width)
- Enhanced visual design with:
  - **Professional Header**: Store branding with colored borders
  - **Receipt Title**: Prominent "SALES RECEIPT" section
  - **Structured Info**: Well-organized sale and customer information
  - **Item Table**: Clean table layout with proper alignment
  - **Totals Section**: Highlighted total area with subtotal breakdown
  - **Payment Info**: Clearly marked payment method
  - **Notes**: Highlighted notes section with background
  - **QR Code**: Digital verification QR code
  - **Footer**: Professional messaging with contact information
- Auto-trigger print dialog
- Responsive receipt design
- Same information as mobile receipts

## Usage

### Basic Usage
```tsx
import PrintReceipt from '../../components/PrintReceipt';
import { formatReceiptData } from '../../utils/receiptFormatter';

// In your component
<PrintReceipt
  receiptData={formatReceiptData(saleRecord)}
  buttonText="Print Receipt"
  onPrintSuccess={() => console.log('Printed')}
  onPrintError={(error) => console.error(error)}
/>
```

### Custom Styling
```tsx
<PrintReceipt
  receiptData={receiptData}
  buttonStyle={styles.customPrintButton}
  buttonText="🖨️ Print"
/>
```

## Receipt Data Format

```typescript
interface ReceiptData {
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
```

## Mobile Setup Requirements

### Android
1. Add Bluetooth permissions to `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
```

2. Pair your Bluetooth thermal printer in device settings before using

### iOS
1. Add Bluetooth usage description to `Info.plist`:
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app needs Bluetooth to connect to thermal printers</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>This app needs Bluetooth to connect to thermal printers</string>
```

2. Ensure printer is in pairing mode and paired via iOS Settings

## Dependencies

### NPM Packages
- `react-native-bluetooth-escpos-printer` - Bluetooth thermal printer support for mobile

### Native Dependencies
The package includes native modules. After installation, rebuild your app:
```bash
# For iOS
cd ios && pod install && cd ..
npx expo run:ios

# For Android
npx expo run:android
```

## Configuration

### Store Information
Update store details in `receiptFormatter.ts`:
```typescript
return {
  storeName: 'Your Store Name',
  storeAddress: 'Your Store Address',
  storePhone: 'Your Phone Number',
  // ... rest of data
};
```

### Printer Settings
Adjust column widths and formatting in `printerService.native.ts`:
```typescript
// Adjust column widths (must total to 32 for standard 58mm printers)
await BluetoothEscposPrinter.printColumn(
  [16, 4, 4, 8],  // Column widths
  // ...
);
```

## Troubleshooting

### Mobile
1. **Printer not found**: Ensure Bluetooth is enabled and printer is paired in device settings
2. **Connection timeout**: Check printer is powered on and in range
3. **Garbled output**: Verify printer encoding settings match (default UTF-8)
4. **Text cut off**: Adjust column widths to fit 32-character thermal printer width

### Web
1. **Pop-up blocked**: Allow pop-ups for the app domain
2. **Print dialog doesn't appear**: Check browser settings allow print
3. **Receipt looks wrong**: Browser may need print CSS adjustments

## Testing

### Test on Mobile
1. Pair a Bluetooth thermal printer with your device
2. Navigate to any sale details page
3. Tap "Print Receipt" button
4. Select your printer from the list
5. Verify receipt prints correctly

### Test on Web
1. Open any sale details page in a browser
2. Click "Print Receipt" button
3. Verify print preview appears
4. Test actual printing or save as PDF

## Future Enhancements
- Store settings management for receipt header
- Receipt template customization
- Logo printing support
- Multiple receipt formats (80mm, 58mm)
- Print queue management
- Printer settings persistence
- Auto-reconnect to last used printer
- Receipt email/SMS sharing
- Digital receipt verification via QR code scanning

## Notes
- The component automatically handles platform differences
- Bluetooth permissions must be granted on first use
- Web printing uses standard browser capabilities
- Receipt width optimized for 58mm thermal printers (32 chars)
- All monetary values formatted using the app's `formatPrice` utility
