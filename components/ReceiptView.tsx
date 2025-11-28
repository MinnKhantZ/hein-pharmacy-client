import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  defaultPrintFont,
  defaultPrintFontBold,
  defaultPrintFontHeavy,
  defaultPrintFontMedium,
  defaultPrintFontSemibold,
} from '../constants/customFonts';
import type { ReceiptData } from '../utils/receiptFormatter';

interface ReceiptViewProps {
  data: ReceiptData;
  width?: number;
}

/**
 * ReceiptView - Renders receipt content as a View that can be captured as an image.
 * This is used to support Burmese/Myanmar characters which don't print correctly
 * as text strings in ESC/POS commands.
 * 
 * For 78mm paper at 203 DPI: ~576 dots width
 * For better resolution, we render at 3x scale and let the printer scale down
 * This provides crisp, high-resolution text output
 * 
 * Layout synced with printing-agent/src/services/receiptImageGenerator.js
 */
const ReceiptView: React.FC<ReceiptViewProps> = ({ data, width = 576 }) => {
  // Scale factor for better resolution (3x for high-resolution crisp text)
  const scale = 3;
  const scaledWidth = width * scale;
  const padding = 12 * scale;
  
  // Content width available for text and table (matching agent: contentWidth = paperWidth - (padding * 2))
  const contentWidth = scaledWidth - (padding * 2);
  
  // Calculate column widths based on content width (matching agent's column percentages)
  const colName = Math.floor(contentWidth * 0.45);
  const colQty = Math.floor(contentWidth * 0.10);
  const colPrice = Math.floor(contentWidth * 0.20);
  const colTotal = Math.floor(contentWidth * 0.23);

  // Scaled font sizes - significantly larger for better readability on thermal paper
  const fontSize = {
    storeName: 42 * scale,      // Large bold store name
    storeInfo: 21 * scale,      // Store address/phone
    sectionTitle: 21 * scale,   // Section headers
    normal: 21 * scale,         // Regular text and item names
    small: 18 * scale,          // Smaller info like dividers
    total: 28 * scale,          // Large total amount
  };

  // Generate divider line that fits the available width exactly
  // Use monospace-like calculation: divider with spacing "- - - - -"
  // This matches the agent's spaced divider pattern
  const dividerChar = '-';
  // For monospace at this font size, estimate character width
  // Using empirical ratio: each "- " pair takes roughly fontSize.small * 0.6
  const charSpacePairWidth = fontSize.small * 0.7;
  const dividerPairCount = Math.floor(contentWidth / charSpacePairWidth);
  const divider = (dividerChar + ' ').repeat(dividerPairCount).trim();

  return (
    <View style={[styles.container, { width: scaledWidth, padding: 12 * scale }]}> 
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.storeName, { fontSize: fontSize.storeName, lineHeight: fontSize.storeName * 1.3, fontFamily: defaultPrintFontHeavy }]}> 
          ဟိန်း ဆေးဆိုင်
        </Text>
        <Text style={[styles.storeInfo, { fontSize: fontSize.storeInfo, marginTop: 6 * scale, lineHeight: fontSize.storeInfo * 1.3, fontFamily: defaultPrintFont }]}> 
          ပြည်သူ့ဆေးရုံရှေ့၊ ချောက်မြို့
        </Text>
        <Text style={[styles.storeInfo, { fontSize: fontSize.storeInfo, marginTop: 4 * scale, lineHeight: fontSize.storeInfo * 1.3, fontFamily: defaultPrintFont }]}> 
          Ph: 09774772012, 09792222248
        </Text>
      </View>

      <Text style={[styles.divider, { fontSize: fontSize.small, marginVertical: 10 * scale, fontFamily: defaultPrintFont }]}> 
        {divider}
      </Text>

      {/* Sale Info */}
      <View style={[styles.infoSection, { marginVertical: 6 * scale }]}> 
        <View style={[styles.infoRow, { marginVertical: 3 * scale }]}> 
          <Text style={[styles.infoLabel, { fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3, fontFamily: defaultPrintFontMedium }]}>Receipt #:</Text>
          <Text style={[styles.infoValue, { fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3, fontFamily: defaultPrintFont }]}>{data.saleId}</Text>
        </View>
        <View style={[styles.infoRow, { marginVertical: 3 * scale }]}> 
          <Text style={[styles.infoLabel, { fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3, fontFamily: defaultPrintFontMedium }]}>Date:</Text>
          <Text style={[styles.infoValue, { fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3, fontFamily: defaultPrintFont }]}>{data.saleDate}</Text>
        </View>
        {data.customerName && (
          <View style={[styles.infoRow, { marginVertical: 3 * scale }]}> 
            <Text style={[styles.infoLabel, { fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3, fontFamily: defaultPrintFontMedium }]}>Customer:</Text>
            <Text style={[styles.infoValue, { fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3, fontFamily: defaultPrintFont }]}>{data.customerName}</Text>
          </View>
        )}
        {data.customerPhone && (
          <View style={[styles.infoRow, { marginVertical: 3 * scale }]}> 
            <Text style={[styles.infoLabel, { fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3, fontFamily: defaultPrintFontMedium }]}>Phone:</Text>
            <Text style={[styles.infoValue, { fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3, fontFamily: defaultPrintFont }]}>{data.customerPhone}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.divider, { fontSize: fontSize.small, marginVertical: 8 * scale, fontFamily: defaultPrintFont }]}> 
        {divider}
      </Text>

      {/* Items Header */}
      <View style={[styles.tableRow, { marginBottom: 6 * scale, paddingHorizontal: 0 }]}> 
        <Text style={[styles.tableHeader, { width: colName, fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3, fontFamily: defaultPrintFontSemibold }]}> 
          ပစ္စည်းအမည်
        </Text>
        <Text style={[styles.tableHeader, styles.textCenter, { width: colQty, fontSize: fontSize.small, lineHeight: fontSize.small * 1.3, fontFamily: defaultPrintFontSemibold }]}> 
          ဦးရေ
        </Text>
        <Text style={[styles.tableHeader, styles.textRight, { width: colPrice, fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3, fontFamily: defaultPrintFontSemibold }]}> 
          ဈေးနှုန်း
        </Text>
        <Text style={[styles.tableHeader, styles.textRight, { width: colTotal, fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3, fontFamily: defaultPrintFontSemibold }]}> 
          သင့်ငွေ
        </Text>
      </View>

      <Text style={[styles.divider, { fontSize: fontSize.small, marginBottom: 6 * scale, marginHorizontal: 0, paddingHorizontal: 0, fontFamily: defaultPrintFont }]}> 
        {divider}
      </Text>

      {/* Items */}
      {data.items.map((item, index) => (
        <View key={index} style={[styles.tableRow, { marginVertical: 4 * scale, alignItems: 'flex-start', paddingHorizontal: 0 }]}> 
          <Text 
            style={[styles.tableCell, { width: colName, fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.4, fontFamily: defaultPrintFont }]}
          >
            {item.name}
          </Text>
          <Text style={[styles.tableCell, styles.textCenter, { width: colQty, fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.4, fontFamily: defaultPrintFont }]}> 
            {item.quantity}
          </Text>
          <Text style={[styles.tableCell, styles.textRight, { width: colPrice, fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.4, fontFamily: defaultPrintFont }]}> 
            {item.unitPrice.toLocaleString()}
          </Text>
          <Text style={[styles.tableCell, styles.textRight, { width: colTotal, fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.4, fontFamily: defaultPrintFont }]}> 
            {item.total.toLocaleString()}
          </Text>
        </View>
      ))}

      <Text style={[styles.divider, { fontSize: fontSize.small, marginVertical: 10 * scale, fontFamily: defaultPrintFont }]}> 
        {divider}
      </Text>

      {/* Total */}
      <View style={[styles.totalRow, { marginVertical: 8 * scale }]}> 
        <Text style={[styles.totalLabel, { fontSize: fontSize.total, lineHeight: fontSize.total * 1.3, fontFamily: defaultPrintFontBold }]}>စုစုပေါင်း:</Text>
        <Text style={[styles.totalAmount, { fontSize: fontSize.total, lineHeight: fontSize.total * 1.3, fontFamily: defaultPrintFontBold }]}> 
          {data.totalAmount.toLocaleString()} Ks
        </Text>
      </View>

      <Text style={[styles.divider, { fontSize: fontSize.small, marginVertical: 6 * scale, fontFamily: defaultPrintFont }]}> 
        {divider}
      </Text>

      {/* Payment Method */}
      <View style={[styles.infoRow, { marginVertical: 4 * scale }]}> 
        <Text style={[styles.infoLabel, { fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3, fontFamily: defaultPrintFontMedium }]}>ငွေပေးချေမှု:</Text>
        <Text style={[styles.infoValue, { fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3, fontFamily: defaultPrintFont }]}> 
          {data.paymentMethod === 'cash' ? 'လက်ငင်း' : 
           data.paymentMethod === 'credit' ? 'အကြွေး' : 
           data.paymentMethod.charAt(0).toUpperCase() + data.paymentMethod.slice(1)}
        </Text>
      </View>

      {/* Notes */}
      {data.notes && (
        <View style={[styles.notesSection, { marginTop: 8 * scale }]}> 
          <Text style={[styles.infoText, { fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.4, fontFamily: defaultPrintFont }]}> 
            မှတ်ချက်: {data.notes}
          </Text>
        </View>
      )}

      {/* Footer */}
      <View style={[styles.footer, { marginTop: 14 * scale, marginBottom: 40 * scale }]}> 
        <Text style={[styles.divider, { fontSize: fontSize.small, marginBottom: 10 * scale, fontFamily: defaultPrintFont }]}> 
          {divider}
        </Text>
        <Text style={[styles.footerText, { fontSize: fontSize.storeInfo, lineHeight: fontSize.storeInfo * 1.4, fontFamily: defaultPrintFont }]}> 
          ၀ယ်ယူအားပေးမှုကိုကျေးဇူးတင်ပါသည်
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  storeName: {
    color: '#000000',
    textAlign: 'center',
  },
  storeInfo: {
    color: '#000000',
    textAlign: 'center',
  },
  divider: {
    color: '#000000',
    textAlign: 'center',
    letterSpacing: -1,
    marginHorizontal: 0,
  },
  infoSection: {},
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  infoLabel: {
    color: '#000000',
  },
  infoValue: {
    color: '#000000',
  },
  infoText: {
    color: '#000000',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 0,
  },
  tableHeader: {
    color: '#000000',
  },
  tableCell: {
    color: '#000000',
  },
  textCenter: {
    textAlign: 'center',
  },
  textRight: {
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    color: '#000000',
  },
  totalAmount: {
    color: '#000000',
  },
  notesSection: {},
  footer: {
    alignItems: 'center',
  },
  footerText: {
    color: '#000000',
    textAlign: 'center',
  },
});

export default ReceiptView;
