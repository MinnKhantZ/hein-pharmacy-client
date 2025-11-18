// Receipt data type definition (shared between platforms)
export interface ReceiptData {
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

interface SaleItem {
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface SaleRecord {
  id: number;
  total_amount: number;
  payment_method: string;
  is_paid: boolean;
  paid_date: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  notes: string | null;
  sale_date: string;
  items: SaleItem[];
}

export const formatReceiptData = (sale: SaleRecord, storeConfig?: {
  name?: string;
  address?: string;
  phone?: string;
}): ReceiptData => {
  // Format the sale date
  const saleDate = new Date(sale.sale_date);
  const formattedDate = saleDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Format items with better precision handling
  const items = sale.items.map(item => ({
    name: item.item_name,
    quantity: item.quantity,
    unitPrice: Number(item.unit_price),
    total: Number(item.total_price),
  }));

  return {
    storeName: storeConfig?.name || 'Hein Pharmacy',
    storeAddress: storeConfig?.address,
    storePhone: storeConfig?.phone,
    saleId: sale.id,
    saleDate: formattedDate,
    customerName: sale.customer_name || undefined,
    customerPhone: sale.customer_phone || undefined,
    items,
    totalAmount: Number(sale.total_amount),
    paymentMethod: sale.payment_method,
    notes: sale.notes || undefined,
  };
};

export const validateReceiptData = (data: ReceiptData): boolean => {
  if (!data.storeName || !data.saleId || !data.saleDate) {
    return false;
  }

  if (!data.items || data.items.length === 0) {
    return false;
  }

  if (data.totalAmount <= 0) {
    return false;
  }

  return true;
};
