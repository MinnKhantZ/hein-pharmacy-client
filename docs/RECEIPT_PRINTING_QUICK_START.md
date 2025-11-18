# Receipt Printing - Quick Start Guide

## For Mobile Users (iOS/Android)

### Step 1: Pair Your Bluetooth Printer
1. Turn on your Bluetooth thermal printer
2. Go to device Settings > Bluetooth
3. Find your printer in the list and tap to pair
4. Enter pairing code if required (usually 0000 or 1234)

### Step 2: Print a Receipt
1. Open the Hein Pharmacy app
2. Navigate to Sales > Select any sale
3. Scroll down and tap "Print Receipt" button
4. Select your printer from the list
5. Receipt will print automatically

### Troubleshooting Mobile
- **Printer not in list**: Make sure it's paired in Bluetooth settings first
- **Connection failed**: Check printer is on and in range (within 10 meters)
- **Garbled text**: Ensure printer supports ESC/POS commands
- **App crashes**: Rebuild app after installing printer package

## For Web Users

### Step 1: Open Sale Details
1. Navigate to any sale in the sales list
2. Click on a sale to view details

### Step 2: Print Receipt
1. Click "Print Receipt" button
2. A print preview window will open
3. Review the receipt
4. Click "Print Receipt" button in the preview, or:
   - Save as PDF (Recommended for digital records)
   - Select a physical printer from your system

### Troubleshooting Web
- **Pop-up blocked**: Allow pop-ups for the app URL
- **Preview doesn't open**: Check browser pop-up settings
- **Receipt looks wrong**: Try a different browser (Chrome recommended)

## Receipt Contents

Every receipt now includes professional formatting with:

- **Enhanced Header**: Store name prominently displayed with contact information
- **Receipt Title**: Clear "SALES RECEIPT" designation
- **Sale Information**: Receipt # (formatted as 6-digit number), date/time
- **Customer Details**: Name and phone (if provided)
- **Professional Item Table**: Item name, quantity, unit price, total with proper alignment
- **Totals Section**: Subtotal and grand total with enhanced formatting
- **Payment Info**: Payment method clearly displayed
- **Notes**: Highlighted notes section (when present)
- **QR Code**: Digital verification code for receipt authenticity
- **Footer**: Professional thank you message with contact information

## Supported Printers

### Mobile (Bluetooth)
- Any ESC/POS compatible thermal printer
- Recommended: 58mm thermal printers (32 characters wide)
- Examples:
  - Goojprt PT-210
  - Epson TM-P20
  - Zebra iMZ series
  - Any generic 58mm Bluetooth thermal printer

### Web
- Any printer connected to your computer
- PDF Save (recommended for digital receipts)
- Cloud printing services (Google Cloud Print, etc.)

## Receipt Customization

To customize receipt header information, update the `formatReceiptData` call in `app/sales-details/[id].tsx`:

```typescript
// Add store configuration
const storeConfig = {
  name: 'Your Pharmacy Name',
  address: '123 Main Street, City, State',
  phone: '+1-555-0123'
};

<PrintReceipt
  receiptData={formatReceiptData(sale, storeConfig)}
  // ... other props
/>
```

## Advanced Configuration

### Printer Paper Size
For 80mm printers, adjust column widths in `services/printerService.native.ts`:
```typescript
// Change from 32 total to 48 total for 80mm
await BluetoothEscposPrinter.printColumn(
  [24, 8, 8, 8],  // Adjust these to total 48
  // ...
);
```

### Receipt Template
Modify the receipt layout in:
- **Mobile**: `services/printerService.native.ts`
- **Web**: `services/printerService.web.ts`

## Best Practices

1. **Test First**: Always test with a single receipt before batch printing
2. **Check Paper**: Ensure printer has enough paper
3. **Battery Check**: For mobile printers, verify battery level
4. **Save Digital**: Use web version to save PDF copies
5. **Customer Copy**: Always offer to print a customer receipt

## Common Issues

### Mobile: Printer Connects But Won't Print
- Solution: Power cycle the printer
- Check: Paper is loaded correctly
- Verify: Printer supports ESC/POS protocol

### Mobile: Bluetooth Permission Denied
- Solution: Grant Bluetooth permission in app settings
- iOS: Settings > Hein Pharmacy > Bluetooth
- Android: Settings > Apps > Hein Pharmacy > Permissions

### Web: Print Preview Blank
- Solution: Allow pop-ups for the site
- Try: Different browser
- Check: JavaScript is enabled

### Receipt Text is Cut Off
- Mobile: Printer might be 58mm but code set for different width
- Web: Adjust CSS in `printerService.web.ts`

## Testing Checklist

Before deploying to production:

- [ ] Test Bluetooth pairing on real device
- [ ] Print test receipt on mobile
- [ ] Verify web printing in Chrome, Firefox, Safari
- [ ] Check receipt formatting on actual thermal printer
- [ ] Test with different sale scenarios (with/without customer info)
- [ ] Verify all receipt data fields display correctly
- [ ] Test printer error handling (printer off, out of paper)
- [ ] Confirm Bluetooth permissions work on fresh install

## Need Help?

For detailed technical documentation, see [RECEIPT_PRINTING.md](./RECEIPT_PRINTING.md)

For API integration details, see the main server documentation.
