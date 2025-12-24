import React from 'react';
import { Image, PixelRatio, StyleSheet, Text, View, ViewStyle } from 'react-native';

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
 * 
 * Divider length is automatically adjusted by clipping to fit the available width exactly
 * across different screen densities. Font scaling is disabled to prevent layout issues
 * from system font size settings.
 */
const ReceiptView: React.FC<ReceiptViewProps> = ({ 
  data, 
  width, 
  layoutConfig = DEFAULT_PRINT_LAYOUT 
}) => {
  // Use config values with fallback to defaults
  const config = layoutConfig;
  
  // Get device pixel ratio for consistent rendering across devices
  const pixelRatio = PixelRatio.get();
  
  // Adjust paper width to ensure consistent physical pixel output
  const effectivePaperWidth = config.paperWidth / pixelRatio;
  
  // Base width from config, can be overridden by prop
  const paperWidth = width ?? effectivePaperWidth;
  
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

  // Reusable Divider component
  const Divider = ({ style }: { style?: ViewStyle }) => (
    <View style={[{ width: '100%', overflow: 'hidden', marginHorizontal: 0 }, style]}>
      <Text 
        numberOfLines={1} 
        ellipsizeMode="clip" 
        style={{ fontSize: fontSize.small, fontFamily: defaultPrintFont, color: '#000000', textAlign: 'center' }} 
        allowFontScaling={false}
      >
        {"- ".repeat(100)} 
      </Text>
    </View>
  );

  // Line heights from config
  const lineHeights = config.lineHeights;

  return (
    <View style={[styles.container, { width: scaledWidth, padding: config.paddingBase * scale }]}> 
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Image 
            source={require('../assets/images/logo-black.png')} 
            style={[styles.logo, { width: 90 * scale, height: 90 * scale }]} 
            resizeMode="contain"
          />
          <View style={styles.headerText}>
            <Text style={[styles.storeName, { fontSize: fontSize.storeName, lineHeight: fontSize.storeName * lineHeights.default, fontFamily: defaultPrintFontHeavy }]} allowFontScaling={false}> 
              ဟိန်း ဆေးဆိုင်
            </Text>
            <Text style={[styles.storeInfo, { fontSize: fontSize.storeInfo, marginTop: 6 * scale, lineHeight: fontSize.storeInfo * lineHeights.default, fontFamily: defaultPrintFont }]} allowFontScaling={false}> 
              ပြည်သူ့ဆေးရုံရှေ့၊ ချောက်မြို့
            </Text>
            <Text style={[styles.storeInfo, { fontSize: fontSize.storeInfo, marginTop: 4 * scale, lineHeight: fontSize.storeInfo * lineHeights.default, fontFamily: defaultPrintFont }]} allowFontScaling={false}> 
              Ph: 09774772012, 09792222248
            </Text>
          </View>
        </View>
      </View>

      <Divider style={{ marginVertical: margins.dividerVertical }} />

      {/* Sale Info */}
      <View style={[styles.infoSection, { marginVertical: margins.infoSection }]}> 
        <View style={[styles.infoRow, { marginVertical: margins.infoRow }]}> 
          <Text style={[styles.infoLabel, { fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFontMedium }]} allowFontScaling={false}>Receipt #:</Text>
          <Text style={[styles.infoValue, { fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFont }]} allowFontScaling={false}>{data.saleId}</Text>
        </View>
        <View style={[styles.infoRow, { marginVertical: margins.infoRow }]}> 
          <Text style={[styles.infoLabel, { fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFontMedium }]} allowFontScaling={false}>Date:</Text>
          <Text style={[styles.infoValue, { fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFont }]} allowFontScaling={false}>{data.saleDate}</Text>
        </View>
        {data.customerName && (
          <View style={[styles.infoRow, { marginVertical: margins.infoRow }]}> 
            <Text style={[styles.infoLabel, { fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFontMedium }]} allowFontScaling={false}>Customer:</Text>
            <Text style={[styles.infoValue, { fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFont }]} allowFontScaling={false}>{data.customerName}</Text>
          </View>
        )}
        {data.customerPhone && (
          <View style={[styles.infoRow, { marginVertical: margins.infoRow }]}> 
            <Text style={[styles.infoLabel, { fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFontMedium }]} allowFontScaling={false}>Phone:</Text>
            <Text style={[styles.infoValue, { fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFont }]} allowFontScaling={false}>{data.customerPhone}</Text>
          </View>
        )}
      </View>

      <Divider style={{ marginVertical: 8 * scale }} />

      {/* Items Header */}
      <View style={[styles.tableRow, { marginBottom: margins.itemsHeaderBottom, paddingHorizontal: 0 }]}> 
        <Text style={[styles.tableHeader, { width: colName, fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFontSemibold }]} allowFontScaling={false}> 
          Item
        </Text>
        <Text style={[styles.tableHeader, styles.textCenter, { width: colQty, fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFontSemibold }]} allowFontScaling={false}> 
          Qty
        </Text>
        <Text style={[styles.tableHeader, styles.textRight, { width: colPrice, fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFontSemibold }]} allowFontScaling={false}> 
          Price
        </Text>
        <Text style={[styles.tableHeader, styles.textRight, { width: colTotal, fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFontSemibold }]} allowFontScaling={false}> 
          Total
        </Text>
      </View>

      <Divider style={{ marginBottom: margins.itemsHeaderBottom, paddingHorizontal: 0 }} />

      {/* Items */}
      {data.items.map((item, index) => (
        <View key={index} style={[styles.tableRow, { marginVertical: margins.itemRow, alignItems: 'flex-start', paddingHorizontal: 0 }]}> 
          <Text 
            style={[styles.tableCell, { width: colName, fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.itemName, fontFamily: defaultPrintFont }]}
            allowFontScaling={false}
          >
            {item.name}
          </Text>
          <Text style={[styles.tableCell, styles.textCenter, { width: colQty, fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.itemName, fontFamily: defaultPrintFont }]} allowFontScaling={false}> 
            {item.quantity}
          </Text>
          <Text style={[styles.tableCell, styles.textRight, { width: colPrice, fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.itemName, fontFamily: defaultPrintFont }]} allowFontScaling={false}> 
            {item.unitPrice.toLocaleString()}
          </Text>
          <Text style={[styles.tableCell, styles.textRight, { width: colTotal, fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.itemName, fontFamily: defaultPrintFont }]} allowFontScaling={false}> 
            {item.total.toLocaleString()}
          </Text>
        </View>
      ))}

      <Divider style={{ marginVertical: margins.dividerVertical }} />

      {/* Total */}
      <View style={[styles.totalRow, { marginVertical: margins.totalRow }]}> 
        <Text style={[styles.totalLabel, { fontSize: fontSize.total, lineHeight: fontSize.total * lineHeights.default, fontFamily: defaultPrintFontBold }]} allowFontScaling={false}>Total:</Text>
        <Text style={[styles.totalAmount, { fontSize: fontSize.total, lineHeight: fontSize.total * lineHeights.default, fontFamily: defaultPrintFontBold }]} allowFontScaling={false}> 
          {data.totalAmount.toLocaleString()} Ks
        </Text>
      </View>

      <Divider style={{ marginVertical: margins.infoSection }} />

      {/* Payment Method */}
      <View style={[styles.infoRow, { marginVertical: margins.itemRow }]}> 
        <Text style={[styles.infoLabel, { fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFontMedium }]} allowFontScaling={false}>Payment:</Text>
        <Text style={[styles.infoValue, { fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.default, fontFamily: defaultPrintFont }]} allowFontScaling={false}> 
          {data.paymentMethod === 'cash' ? 'Cash' : 
           data.paymentMethod === 'credit' ? 'Credit' : 
           data.paymentMethod.charAt(0).toUpperCase() + data.paymentMethod.slice(1)}
        </Text>
      </View>

      {/* Notes */}
      {data.notes && (
        <View style={[styles.notesSection, { marginTop: margins.totalRow }]}> 
          <Text style={[styles.infoText, { fontSize: fontSize.normal, lineHeight: fontSize.normal * lineHeights.itemName, fontFamily: defaultPrintFont }]} allowFontScaling={false}> 
            မှတ်ချက်: {data.notes}
          </Text>
        </View>
      )}

      {/* Footer */}
      <View style={[styles.footer, { marginTop: margins.footerTop, marginBottom: margins.footerBottom }]}> 
        <Divider style={{ marginBottom: margins.dividerVertical }} />
        <Text style={[styles.footerText, { fontSize: fontSize.storeInfo, lineHeight: fontSize.storeInfo * lineHeights.footer, fontFamily: defaultPrintFont, marginTop: 8 * scale }]} allowFontScaling={false}> 
          ၀ယ်ယူပြီးပစ္စည်းပြန်မလဲပါ
        </Text>
        <Text style={[styles.footerText, { fontSize: fontSize.storeInfo, lineHeight: fontSize.storeInfo * lineHeights.footer, fontFamily: defaultPrintFont, marginTop: 12 * scale }]} allowFontScaling={false}> 
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    top: -14,
    left: -4
  },
  headerText: {
    alignItems: 'center',
  },
  storeName: {
    color: '#000000',
    textAlign: 'center',
  },
  storeInfo: {
    color: '#000000',
    textAlign: 'center',
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
    justifyContent: 'space-between',
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
