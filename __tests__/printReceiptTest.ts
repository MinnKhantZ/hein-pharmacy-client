// Test receipt printing functionality
// This file demonstrates how to test the print feature in development

import type { ReceiptData } from '../services/printerService.native';
import { formatReceiptData } from '../utils/receiptFormatter';

// Sample sale data for testing
export const mockSaleData = {
  id: 12345,
  total_amount: 45000,
  payment_method: 'cash',
  is_paid: true,
  paid_date: new Date().toISOString(),
  customer_name: 'John Doe',
  customer_phone: '+95 9 123 456 789',
  notes: 'Thank you for your purchase!',
  sale_date: new Date().toISOString(),
  items: [
    {
      item_name: 'Paracetamol 500mg',
      quantity: 2,
      unit_price: 5000,
      total_price: 10000,
    },
    {
      item_name: 'Amoxicillin 250mg',
      quantity: 1,
      unit_price: 15000,
      total_price: 15000,
    },
    {
      item_name: 'Vitamin C 1000mg',
      quantity: 4,
      unit_price: 5000,
      total_price: 20000,
    },
  ],
};

// Generate test receipt data
export const testReceiptData: ReceiptData = {
  storeName: 'Hein Pharmacy',
  storeAddress: '123 Main Street, Yangon',
  storePhone: '+95 9 987 654 321',
  saleId: 12345,
  saleDate: new Date().toLocaleString(),
  customerName: 'John Doe',
  customerPhone: '+95 9 123 456 789',
  items: [
    {
      name: 'Paracetamol 500mg',
      quantity: 2,
      unitPrice: 5000,
      total: 10000,
    },
    {
      name: 'Amoxicillin 250mg',
      quantity: 1,
      unitPrice: 15000,
      total: 15000,
    },
    {
      name: 'Vitamin C 1000mg',
      quantity: 4,
      unitPrice: 5000,
      total: 20000,
    },
  ],
  totalAmount: 45000,
  paymentMethod: 'cash',
  notes: 'Thank you for your purchase!',
};

// Test with formatted sale data
export const testFormattedReceipt = formatReceiptData(mockSaleData);

// Test receipt without optional fields
export const minimalReceiptData: ReceiptData = {
  storeName: 'Hein Pharmacy',
  saleId: 12346,
  saleDate: new Date().toLocaleString(),
  items: [
    {
      name: 'Aspirin 100mg',
      quantity: 1,
      unitPrice: 3000,
      total: 3000,
    },
  ],
  totalAmount: 3000,
  paymentMethod: 'mobile',
};

// Test with long item names (to test truncation)
export const longNameReceiptData: ReceiptData = {
  storeName: 'Hein Pharmacy',
  saleId: 12347,
  saleDate: new Date().toLocaleString(),
  items: [
    {
      name: 'Very Long Medicine Name That Should Be Truncated',
      quantity: 1,
      unitPrice: 10000,
      total: 10000,
    },
    {
      name: 'Short Med',
      quantity: 2,
      unitPrice: 5000,
      total: 10000,
    },
  ],
  totalAmount: 20000,
  paymentMethod: 'credit',
  notes: 'This is a very long note that should also be handled properly in the receipt formatting and should wrap correctly without cutting off important information.',
};

// Test with many items (to test pagination/scrolling)
export const manyItemsReceiptData: ReceiptData = {
  storeName: 'Hein Pharmacy',
  saleId: 12348,
  saleDate: new Date().toLocaleString(),
  customerName: 'Jane Smith',
  items: Array.from({ length: 10 }, (_, i) => ({
    name: `Medicine Item ${i + 1}`,
    quantity: Math.floor(Math.random() * 5) + 1,
    unitPrice: (i + 1) * 1000,
    total: (Math.floor(Math.random() * 5) + 1) * ((i + 1) * 1000),
  })),
  totalAmount: 0, // Will be calculated
  paymentMethod: 'cash',
};

// Calculate total for many items receipt
manyItemsReceiptData.totalAmount = manyItemsReceiptData.items.reduce(
  (sum, item) => sum + item.total,
  0
);

// Export test function for easy usage
export const getTestReceipt = (type: 'full' | 'minimal' | 'long' | 'many' = 'full'): ReceiptData => {
  switch (type) {
    case 'minimal':
      return minimalReceiptData;
    case 'long':
      return longNameReceiptData;
    case 'many':
      return manyItemsReceiptData;
    default:
      return testReceiptData;
  }
};

// Usage example in a component:
// import { getTestReceipt } from '../__tests__/printReceiptTest';
// <PrintReceipt receiptData={getTestReceipt('full')} />
