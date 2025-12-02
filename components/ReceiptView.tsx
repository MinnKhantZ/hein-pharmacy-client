import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  defaultPrintFont,
  defaultPrintFontBold,
  defaultPrintFontHeavy,
  defaultPrintFontMedium,
  defaultPrintFontSemibold,
} from '../constants/customFonts';
import { DEFAULT_PRINT_LAYOUT, PrintLayoutConfig } from '../types/printLayout';
import type { ReceiptData } from '../utils/receiptFormatter';

interface ReceiptViewProps {
  data: ReceiptData;
  width?: number;
  /** Print layout configuration - if not provided, uses DEFAULT_PRINT_LAYOUT */
  layoutConfig?: PrintLayoutConfig;
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
 * 
 * All layout parameters are now configurable through PrintLayoutConfig.
 * Pass layoutConfig prop to customize, or it will use DEFAULT_PRINT_LAYOUT.
 */
const ReceiptView: React.FC<ReceiptViewProps> = ({ 
  data, 
  width, 
  layoutConfig = DEFAULT_PRINT_LAYOUT 
}) => {
  // Use config values with fallback to defaults
  const config = layoutConfig;
  
  // Base width from config, can be overridden by prop
  const paperWidth = width ?? config.paperWidth;
  
  // Scale factor for better resolution
  const scale = config.scale;
  const scaledWidth = paperWidth * scale;
  const padding = config.paddingBase * scale;
  
  // Content width available for text and table (matching agent: contentWidth = paperWidth - (padding * 2))
  const contentWidth = scaledWidth - (padding * 2);
  
  // Calculate column widths based on content width (using configurable percentages)
  const colName = Math.floor(contentWidth * config.columnWidths.name);
  const colQty = Math.floor(contentWidth * config.columnWidths.quantity);
  const colPrice = Math.floor(contentWidth * config.columnWidths.price);
  const colTotal = Math.floor(contentWidth * config.columnWidths.total);

  // Scaled font sizes from config
  const fontSize = {
    storeName: config.fontSizes.storeName * scale,
    storeInfo: config.fontSizes.storeInfo * scale,
    sectionTitle: config.fontSizes.sectionTitle * scale,
    normal: config.fontSizes.normal * scale,
    small: config.fontSizes.small * scale,
    total: config.fontSizes.total * scale,
  };

  // Margin values from config (scaled)
  const margins = {
    dividerVertical: config.margins.dividerVertical * scale,
    infoSection: config.margins.infoSection * scale,
    infoRow: config.margins.infoRow * scale,
    itemsHeaderBottom: config.margins.itemsHeaderBottom * scale,
    itemRow: config.margins.itemRow * scale,
    totalRow: config.margins.totalRow * scale,
    footerTop: config.margins.footerTop * scale,
    footerBottom: config.margins.footerBottom * scale,
  };

  // Line heights from config
  const lineHeights = config.lineHeights;

  // Generate divider line that fits the available width exactly
  // Use configurable char width ratio for divider calculation
  const dividerChar = '-';
  const charSpacePairWidth = fontSize.small * config.dividerCharWidthRatio;
  const dividerPairCount = Math.floor(contentWidth / charSpacePairWidth);
  const divider = (dividerChar + ' ').repeat(dividerPairCount).trim();

  return (
    <View style={[styles.container, { width: scaledWidth, padding: config.paddingBase * scale }]}> 
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.storeName, { fontSize: fontSize.storeName, lineHeight: fontSize.storeName * lineHeights.default, fontFamily: defaultPrintFontHeavy }]}> 
          ဟိန်း ဆေးဆိုင်
        </Text>
        <Text style={[styles.storeInfo, { fontSize: fontSize.storeInfo, marginTop: 6 * scale, lineHeight: fontSize.storeInfo * lineHeights.default, fontFamily: defaultPrintFont }]}> 
          ပြည်သူ့ဆေးရုံရှေ့၊ ချောက်မြို့
        </Text>
        <Text style={[styles.storeInfo, { fontSize: fontSize.storeInfo, marginTop: 4 * scale, lineHeight: fontSize.storeInfo * lineHeights.default, fontFamily: defaultPrintFont }]}> 
          Ph: 09774772012, 09792222248
        </Text>
      </View>

      <Text style={[styles.divider, { fontSize: fontSize.small, marginVertical: margins.dividerVertical, letterSpacing: config.dividerLetterSpacing, fontFamily: defaultPrintFont }]}> 
        {divider}
      </Text>

      {/* Sale Info */}
      <View style={[styles.infoSection, { marginVertical: margins.infoSection }]}> 
        <View style={[styles.infoRow, { marginVertical: margins.infoRow }]}> 
          <Text style={[styles.infoLabel, { fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFontMedium }]}>Receipt #:</Text>
          <Text style={[styles.infoValue, { fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFont }]}>{data.saleId}</Text>
        </View>
        <View style={[styles.infoRow, { marginVertical: margins.infoRow }]}> 
          <Text style={[styles.infoLabel, { fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFontMedium }]}>Date:</Text>
          <Text style={[styles.infoValue, { fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFont }]}>{data.saleDate}</Text>
        </View>
        {data.customerName && (
          <View style={[styles.infoRow, { marginVertical: margins.infoRow }]}> 
            <Text style={[styles.infoLabel, { fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFontMedium }]}>Customer:</Text>
            <Text style={[styles.infoValue, { fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFont }]}>{data.customerName}</Text>
          </View>
        )}
        {data.customerPhone && (
          <View style={[styles.infoRow, { marginVertical: margins.infoRow }]}> 
            <Text style={[styles.infoLabel, { fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFontMedium }]}>Phone:</Text>
            <Text style={[styles.infoValue, { fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFont }]}>{data.customerPhone}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.divider, { fontSize: fontSize.small, marginVertical: 8 * scale, letterSpacing: config.dividerLetterSpacing, fontFamily: defaultPrintFont }]}> 
        {divider}
      </Text>

      {/* Items Header */}
      <View style={[styles.tableRow, { marginBottom: margins.itemsHeaderBottom, paddingHorizontal: 0 }]}> 
        <Text style={[styles.tableHeader, { width: colName, fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFontSemibold }]}> 
          ပစ္စည်းအမည်
        </Text>
        <Text style={[styles.tableHeader, styles.textCenter, { width: colQty, fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFontSemibold }]}> 
          ဦးရေ
        </Text>
        <Text style={[styles.tableHeader, styles.textRight, { width: colPrice, fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFontSemibold }]}> 
          ဈေးနှုန်း
        </Text>
        <Text style={[styles.tableHeader, styles.textRight, { width: colTotal, fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFontSemibold }]}> 
          သင့်ငွေ
        </Text>
      </View>

      <Text style={[styles.divider, { fontSize: fontSize.small, marginBottom: margins.itemsHeaderBottom, marginHorizontal: 0, paddingHorizontal: 0, letterSpacing: config.dividerLetterSpacing, fontFamily: defaultPrintFont }]}> 
        {divider}
      </Text>

      {/* Items */}
      {data.items.map((item, index) => (
        <View key={index} style={[styles.tableRow, { marginVertical: margins.itemRow, alignItems: 'flex-start', paddingHorizontal: 0 }]}> 
          <Text 
            style={[styles.tableCell, { width: colName, fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.itemName, fontFamily: defaultPrintFont }]}
          >
            {item.name}
          </Text>
          <Text style={[styles.tableCell, styles.textCenter, { width: colQty, fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.itemName, fontFamily: defaultPrintFont }]}> 
            {item.quantity}
          </Text>
          <Text style={[styles.tableCell, styles.textRight, { width: colPrice, fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.itemName, fontFamily: defaultPrintFont }]}> 
            {item.unitPrice.toLocaleString()}
          </Text>
          <Text style={[styles.tableCell, styles.textRight, { width: colTotal, fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.itemName, fontFamily: defaultPrintFont }]}> 
            {item.total.toLocaleString()}
          </Text>
        </View>
      ))}

      <Text style={[styles.divider, { fontSize: fontSize.small, marginVertical: margins.dividerVertical, letterSpacing: config.dividerLetterSpacing, fontFamily: defaultPrintFont }]}> 
        {divider}
      </Text>

      {/* Total */}
      <View style={[styles.totalRow, { marginVertical: margins.totalRow }]}> 
        <Text style={[styles.totalLabel, { fontSize: fontSize.total, lineHeight: fontSize.total * lineHeights.default, fontFamily: defaultPrintFontBold }]}>စုစုပေါင်း:</Text>
        <Text style={[styles.totalAmount, { fontSize: fontSize.total, lineHeight: fontSize.total * lineHeights.default, fontFamily: defaultPrintFontBold }]}> 
          {data.totalAmount.toLocaleString()} Ks
        </Text>
      </View>

      <Text style={[styles.divider, { fontSize: fontSize.small, marginVertical: margins.infoSection, letterSpacing: config.dividerLetterSpacing, fontFamily: defaultPrintFont }]}> 
        {divider}
      </Text>

      {/* Payment Method */}
      <View style={[styles.infoRow, { marginVertical: margins.itemRow }]}> 
        <Text style={[styles.infoLabel, { fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFontMedium }]}>ငွေပေးချေမှု:</Text>
        <Text style={[styles.infoValue, { fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFont }]}> 
          {data.paymentMethod === 'cash' ? 'လက်ငင်း' : 
           data.paymentMethod === 'credit' ? 'အကြွေး' : 
           data.paymentMethod.charAt(0).toUpperCase() + data.paymentMethod.slice(1)}
        </Text>
      </View>

      {/* Notes */}
      {data.notes && (
        <View style={[styles.notesSection, { marginTop: margins.totalRow }]}> 
          <Text style={[styles.infoText, { fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.itemName, fontFamily: defaultPrintFont }]}> 
            မှတ်ချက်: {data.notes}
          </Text>
        </View>
      )}

      {/* Footer */}
      <View style={[styles.footer, { marginTop: margins.footerTop, marginBottom: margins.footerBottom }]}> 
        <Text style={[styles.divider, { fontSize: fontSize.small, marginBottom: margins.dividerVertical, letterSpacing: config.dividerLetterSpacing, fontFamily: defaultPrintFont }]}> 
          {divider}
        </Text>
        <Text style={[styles.footerText, { fontSize: fontSize.storeInfo, lineHeight: fontSize.storeInfo * lineHeights.footer, fontFamily: defaultPrintFont }]}> 
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
