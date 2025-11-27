import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
 */
const ReceiptView: React.FC<ReceiptViewProps> = ({ data, width = 576 }) => {
  // Scale factor for better resolution (3x for high-resolution crisp text)
  const scale = 3;
  const scaledWidth = width * scale;
  
  // Calculate column widths for items table (adjusted for 78mm paper)
  // Item name gets more space, other columns are compact
  const colName = Math.floor(scaledWidth * 0.40);
  const colQty = Math.floor(scaledWidth * 0.10);
  const colPrice = Math.floor(scaledWidth * 0.20);
  const colTotal = Math.floor(scaledWidth * 0.25);

  // Scaled font sizes - significantly larger for better readability on thermal paper
  const fontSize = {
    storeName: 36 * scale,      // Large bold store name
    storeInfo: 18 * scale,      // Store address/phone
    sectionTitle: 18 * scale,   // Section headers
    normal: 18 * scale,         // Regular text and item names
    small: 16 * scale,          // Smaller info like dividers
    total: 24 * scale,          // Large total amount
  };

  // Generate divider line that fits the width
  const dividerChar = '═';
  const thinDividerChar = '─';
  // Adjust divider length based on font size for proper fit
  const dividerLength = Math.floor(scaledWidth / (fontSize.small * 0.72));
  const divider = dividerChar.repeat(dividerLength);
  const thinDivider = thinDividerChar.repeat(dividerLength);

  return (
    <View style={[styles.container, { width: scaledWidth, padding: 12 * scale }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.storeName, { fontSize: fontSize.storeName, lineHeight: fontSize.storeName * 1.3 }]}>
          ဟိန်း ဆေးဆိုင်
        </Text>
        <Text style={[styles.storeInfo, { fontSize: fontSize.storeInfo, marginTop: 6 * scale, lineHeight: fontSize.storeInfo * 1.3 }]}>
          ပြည်သူ့ဆေးရုံရှေ့၊ ချောက်မြို့
        </Text>
        <Text style={[styles.storeInfo, { fontSize: fontSize.storeInfo, marginTop: 4 * scale, lineHeight: fontSize.storeInfo * 1.3 }]}>
          Ph: 09774772012, 09792222248
        </Text>
      </View>

      <Text style={[styles.divider, { fontSize: fontSize.small, marginVertical: 10 * scale }]}>
        {divider}
      </Text>

      {/* Sale Info */}
      <View style={[styles.infoSection, { marginVertical: 6 * scale }]}>
        <View style={[styles.infoRow, { marginVertical: 3 * scale }]}>
          <Text style={[styles.infoLabel, { fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3 }]}>Receipt #:</Text>
          <Text style={[styles.infoValue, { fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3 }]}>{data.saleId}</Text>
        </View>
        <View style={[styles.infoRow, { marginVertical: 3 * scale }]}>
          <Text style={[styles.infoLabel, { fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3 }]}>Date:</Text>
          <Text style={[styles.infoValue, { fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3 }]}>{data.saleDate}</Text>
        </View>
        {data.customerName && (
          <View style={[styles.infoRow, { marginVertical: 3 * scale }]}>
            <Text style={[styles.infoLabel, { fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3 }]}>Customer:</Text>
            <Text style={[styles.infoValue, { fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3 }]}>{data.customerName}</Text>
          </View>
        )}
        {data.customerPhone && (
          <View style={[styles.infoRow, { marginVertical: 3 * scale }]}>
            <Text style={[styles.infoLabel, { fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3 }]}>Phone:</Text>
            <Text style={[styles.infoValue, { fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3 }]}>{data.customerPhone}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.divider, { fontSize: fontSize.small, marginVertical: 8 * scale }]}>
        {divider}
      </Text>

      {/* Items Header */}
      <View style={[styles.tableRow, { marginBottom: 6 * scale }]}>
        <Text style={[styles.tableHeader, { width: colName, fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3 }]}>
          ပစ္စည်းအမည်
        </Text>
        <Text style={[styles.tableHeader, styles.textCenter, { width: colQty, fontSize: fontSize.small, lineHeight: fontSize.small * 1.3 }]}>
          အရေ
        </Text>
        <Text style={[styles.tableHeader, styles.textRight, { width: colPrice, fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3 }]}>
          ဈေးနှုန်း
        </Text>
        <Text style={[styles.tableHeader, styles.textRight, { width: colTotal, fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3 }]}>
          သင့်ငွေ
        </Text>
      </View>

      <Text style={[styles.divider, { fontSize: fontSize.small, marginBottom: 6 * scale }]}>
        {thinDivider}
      </Text>

      {/* Items */}
      {data.items.map((item, index) => (
        <View key={index} style={[styles.tableRow, { marginVertical: 4 * scale }]}>
          <Text 
            style={[styles.tableCell, { width: colName, fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.4 }]} 
            numberOfLines={2}
          >
            {item.name}
          </Text>
          <Text style={[styles.tableCell, styles.textCenter, { width: colQty, fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.4 }]}>
            {item.quantity}
          </Text>
          <Text style={[styles.tableCell, styles.textRight, { width: colPrice, fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.4 }]}>
            {item.unitPrice.toLocaleString()}
          </Text>
          <Text style={[styles.tableCell, styles.textRight, { width: colTotal, fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.4 }]}>
            {item.total.toLocaleString()}
          </Text>
        </View>
      ))}

      <Text style={[styles.divider, { fontSize: fontSize.small, marginVertical: 10 * scale }]}>
        {divider}
      </Text>

      {/* Total */}
      <View style={[styles.totalRow, { marginVertical: 8 * scale }]}>
        <Text style={[styles.totalLabel, { fontSize: fontSize.total, lineHeight: fontSize.total * 1.3 }]}>စုစုပေါင်း:</Text>
        <Text style={[styles.totalAmount, { fontSize: fontSize.total, lineHeight: fontSize.total * 1.3 }]}>
          {data.totalAmount.toLocaleString()} Ks
        </Text>
      </View>

      <Text style={[styles.divider, { fontSize: fontSize.small, marginVertical: 6 * scale }]}>
        {thinDivider}
      </Text>

      {/* Payment Method */}
      <View style={[styles.infoRow, { marginVertical: 4 * scale }]}>
        <Text style={[styles.infoLabel, { fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3 }]}>ငွေပေးချေမှု:</Text>
        <Text style={[styles.infoValue, { fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.3 }]}>
          {data.paymentMethod === 'cash' ? 'လက်ငင်း' : 
           data.paymentMethod === 'credit' ? 'အကြွေး' : 
           data.paymentMethod.charAt(0).toUpperCase() + data.paymentMethod.slice(1)}
        </Text>
      </View>

      {/* Notes */}
      {data.notes && (
        <View style={[styles.notesSection, { marginTop: 8 * scale }]}>
          <Text style={[styles.infoText, { fontSize: fontSize.normal, lineHeight: fontSize.normal * 1.4 }]}>
            မှတ်ချက်: {data.notes}
          </Text>
        </View>
      )}

      {/* Footer */}
      <View style={[styles.footer, { marginTop: 14 * scale }]}>
        <Text style={[styles.divider, { fontSize: fontSize.small, marginBottom: 10 * scale }]}>
          {divider}
        </Text>
        <Text style={[styles.footerText, { fontSize: fontSize.storeInfo, lineHeight: fontSize.storeInfo * 1.4 }]}>
          ၀ယ်ယူအားပေးမှုကိုကျေးဇူးတင်ပါသည်
        </Text>
        <Text style={[styles.divider, { fontSize: fontSize.small, marginTop: 10 * scale }]}>
          {divider}
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
    fontWeight: 'bold',
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
  },
  infoSection: {},
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  infoLabel: {
    color: '#000000',
    fontWeight: '500',
  },
  infoValue: {
    color: '#000000',
  },
  infoText: {
    color: '#000000',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeader: {
    fontWeight: 'bold',
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
    fontWeight: 'bold',
    color: '#000000',
  },
  totalAmount: {
    fontWeight: 'bold',
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
