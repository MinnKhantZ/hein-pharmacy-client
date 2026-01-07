/**
 * Print Layout Configuration Types
 * 
 * These types define the configurable parameters for receipt printing.
 * All values can be adjusted to fine-tune the print output without code changes.
 */

/**
 * Font size multipliers for different text elements
 * Base sizes are multiplied by scale factor, then these multipliers are applied
 */
export interface PrintFontSizes {
  /** Store name at the top (default: 42) */
  storeName: number;
  /** Store address and phone (default: 21) */
  storeInfo: number;
  /** Section headers (default: 21) */
  sectionTitle: number;
  /** Regular text and item names (default: 21) */
  normal: number;
  /** Smaller info like dividers (default: 18) */
  small: number;
  /** Large total amount (default: 28) */
  total: number;
}

/**
 * Column width percentages for the items table
 * These should add up to approximately 1.0 (100%)
 */
export interface PrintColumnWidths {
  /** Item name column (default: 0.38 = 38%) */
  name: number;
  /** Unit column (default: 0.15 = 15%) */
  unit: number;
  /** Quantity column (default: 0.09 = 9%) */
  quantity: number;
  /** Unit price column (default: 0.18 = 18%) */
  price: number;
  /** Total column (default: 0.20 = 20%) */
  total: number;
}

/**
 * Margin multipliers for different sections
 * These are multiplied by scale factor
 */
export interface PrintMargins {
  /** Vertical margin for dividers (default: 10) */
  dividerVertical: number;
  /** Vertical margin for info sections (default: 6) */
  infoSection: number;
  /** Vertical margin for info rows (default: 3) */
  infoRow: number;
  /** Bottom margin for items header (default: 6) */
  itemsHeaderBottom: number;
  /** Vertical margin for item rows (default: 4) */
  itemRow: number;
  /** Vertical margin for total row (default: 8) */
  totalRow: number;
  /** Top margin for footer (default: 14) */
  footerTop: number;
  /** Bottom margin for footer (default: 40) */
  footerBottom: number;
}

/**
 * Line height multipliers for different text elements
 */
export interface PrintLineHeights {
  /** Default line height multiplier (default: 1.3) */
  default: number;
  /** Line height for item names that may wrap (default: 1.4) */
  itemName: number;
  /** Line height for footer text (default: 1.4) */
  footer: number;
}

/**
 * Complete print layout configuration
 */
export interface PrintLayoutConfig {
  /** Base width in dots for 78mm paper at 203 DPI (default: 576) */
  paperWidth: number;
  
  /** Scale factor for high-resolution rendering (default: 3) */
  scale: number;
  
  /** Padding multiplier - base is 12, multiplied by scale (default: 12) */
  paddingBase: number;
  
  /** Font sizes (before scale multiplication) */
  fontSizes: PrintFontSizes;
  
  /** Column width percentages */
  columnWidths: PrintColumnWidths;
  
  /** Margin values (before scale multiplication) */
  margins: PrintMargins;
  
  /** Line height multipliers */
  lineHeights: PrintLineHeights;
}

/**
 * Default print layout configuration
 * These values match the current hardcoded values in ReceiptView.tsx
 */
export const DEFAULT_PRINT_LAYOUT: PrintLayoutConfig = {
  paperWidth: 576,
  scale: 3,
  paddingBase: 12,
  fontSizes: {
    storeName: 42,
    storeInfo: 21,
    sectionTitle: 21,
    normal: 21,
    small: 18,
    total: 28,
  },
  columnWidths: {
    name: 0.40,
    quantity: 0.10,
    unit: 0.10,
    price: 0.20,
    total: 0.20,
  },
  margins: {
    dividerVertical: 10,
    infoSection: 6,
    infoRow: 3,
    itemsHeaderBottom: 6,
    itemRow: 4,
    totalRow: 8,
    footerTop: 14,
    footerBottom: 40,
  },
  lineHeights: {
    default: 1.3,
    itemName: 1.4,
    footer: 1.4,
  },
};

/**
 * Preset configurations for different printer types or paper sizes
 */
export const PRINT_LAYOUT_PRESETS: Record<string, PrintLayoutConfig> = {
  default: DEFAULT_PRINT_LAYOUT,
  compact: {
    ...DEFAULT_PRINT_LAYOUT,
    scale: 2,
    fontSizes: {
      storeName: 36,
      storeInfo: 18,
      sectionTitle: 18,
      normal: 18,
      small: 16,
      total: 24,
    },
    margins: {
      ...DEFAULT_PRINT_LAYOUT.margins,
      dividerVertical: 8,
      footerBottom: 30,
    },
  },
  large: {
    ...DEFAULT_PRINT_LAYOUT,
    scale: 4,
    fontSizes: {
      storeName: 48,
      storeInfo: 24,
      sectionTitle: 24,
      normal: 24,
      small: 20,
      total: 32,
    },
    margins: {
      ...DEFAULT_PRINT_LAYOUT.margins,
      dividerVertical: 12,
      footerBottom: 50,
    },
  },
};
