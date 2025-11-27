# Burmese/Myanmar Text Printing Support

This document explains how Burmese (Myanmar) text printing is handled in both the native client and the printing agent.

## Problem

ESC/POS thermal printers use text commands that don't support Unicode characters like Burmese script. When Burmese text is sent as string commands, the printer outputs garbage characters or question marks.

## Solution

Instead of sending text strings to the printer, we render the receipt as an image with proper font rendering, then print the image. This approach works because:

1. The image is rendered using system fonts that support Myanmar script
2. The printer receives raw bitmap data instead of character codes
3. Any Unicode text will display correctly as long as the rendering system has appropriate fonts

## Native Client (React Native)

### How It Works

1. **ReceiptView Component** (`components/ReceiptView.tsx`): A React Native View component that renders the receipt layout with proper text styling.

2. **View Capture**: Uses `react-native-view-shot` to capture the ReceiptView as a PNG image (base64 encoded).

3. **Image Printing**: Uses `BluetoothEscposPrinter.printPic()` to send the image to the thermal printer.

### Dependencies

```bash
npm install react-native-view-shot
```

### Key Files

- `components/ReceiptView.tsx` - Receipt layout component
- `components/PrintReceipt.tsx` - Print button with image capture
- `services/printerService.native.ts` - Native printer service with `printReceiptImage()` method

### Usage

The `PrintReceipt` component automatically:
1. Renders a hidden `ReceiptView` off-screen
2. Captures it as an image when printing
3. Sends the image to the printer

## Printing Agent (Electron)

### How It Works

1. **Canvas Rendering**: Uses the `canvas` npm package to render receipt content to an image.

2. **Myanmar Font Support**: The system tries to load Myanmar fonts from:
   - Windows system fonts (`C:/Windows/Fonts/`)
   - Bundled fonts (`assets/fonts/`)

3. **ESC/POS Image Printing**: Uses `escpos` library's raster image printing.

### Dependencies

```bash
npm install canvas
```

### Key Files

- `src/services/receiptImageGenerator.js` - Generates receipt images using Canvas
- `src/services/printerService.js` - Updated with `printReceiptAsImage()` and `printReceiptImage()` methods
- `src/services/serverService.js` - API endpoints for image printing

### Font Setup

For best Burmese text rendering, install Myanmar fonts:

1. **Option 1: System Fonts** (Recommended)
   - Install Noto Sans Myanmar or Pyidaungsu font on Windows
   - The agent will automatically detect and use them

2. **Option 2: Bundled Fonts**
   - Place font files in `assets/fonts/`:
     - `NotoSansMyanmar-Regular.ttf`
     - `Pyidaungsu-Regular.ttf`

### API Endpoints

#### Print with Image Mode
```
POST /print
Content-Type: application/json

{
  "saleId": 123,
  "storeName": "ဟိန်းဆေးဆိုင်",
  "useImageMode": true,
  ...
}
```

#### Print Pre-rendered Image
```
POST /print-image
Content-Type: application/json

{
  "image": "<base64-encoded-png>",
  "saleId": 123
}
```

## Troubleshooting

### Burmese Text Still Shows as Boxes/Symbols

1. **Check font installation**: Ensure Myanmar fonts are installed on the system
2. **Verify font registration**: Check console logs for "Registered Myanmar font" message
3. **Try installing Noto Sans Myanmar**: Available from Google Fonts

### Image Too Small/Large

Adjust the `paperWidth` option:
- 80mm paper: 576 pixels
- 58mm paper: 384 pixels

### Print Quality Issues

1. Ensure the image is generated at printer's native DPI (usually 203 DPI)
2. Use black and white images for best results
3. Avoid anti-aliasing for text (thermal printers are monochrome)

## Testing

### Test Burmese Text
Create a receipt with Burmese store name and item names:

```javascript
const testReceipt = {
  storeName: "ဟိန်းဆေးဆိုင်",
  items: [
    { name: "ပါရာစီတေမော", quantity: 2, unitPrice: 500, total: 1000 },
    { name: "ဗီတာမင်စီ", quantity: 1, unitPrice: 1500, total: 1500 },
  ],
  // ... other fields
};
```

### Verify Image Output
For debugging, you can save the generated image:

```javascript
const fs = require('fs');
const generator = new ReceiptImageGenerator();
const buffer = generator.generateReceiptImage(testReceipt);
fs.writeFileSync('test-receipt.png', buffer);
```
