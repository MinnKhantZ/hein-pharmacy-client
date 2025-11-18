export interface PrinterDevice {
  name: string;
  address: string;
}

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

class PrinterService {
  async enableBluetooth(): Promise<boolean> {
    // For web, we'll use the browser's print dialog
    return true;
  }

  async scanPrinters(): Promise<PrinterDevice[]> {
    // For web, return a default printer option
    return [{ name: 'Browser Print', address: 'browser' }];
  }

  async connectToPrinter(address: string): Promise<void> {
    // No connection needed for web
    return;
  }

  async disconnect(): Promise<void> {
    // No disconnection needed for web
    return;
  }

  async printReceipt(data: ReceiptData): Promise<void> {
    try {
      // Create a print-friendly HTML receipt
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        throw new Error('Please allow pop-ups to print receipts');
      }

      const paymentMethodText = data.paymentMethod.charAt(0).toUpperCase() + data.paymentMethod.slice(1);

      const receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Receipt #${data.saleId}</title>
          <style>
            @media print {
              body {
                margin: 0;
                padding: 20px;
              }
              .no-print {
                display: none;
              }
            }
            
            body {
              font-family: 'Courier New', monospace;
              max-width: 80mm;
              margin: 0 auto;
              padding: 20px;
            }
            
            .receipt {
              font-size: 12px;
            }
            
            .header {
              text-align: center;
              margin-bottom: 10px;
            }
            
            .store-name {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            
            .divider {
              border-top: 1px dashed #000;
              margin: 10px 0;
            }
            
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
            }
            
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
            }
            
            .items-table th {
              text-align: left;
              border-bottom: 1px solid #000;
              padding: 5px 0;
            }
            
            .items-table td {
              padding: 3px 0;
            }
            
            .items-table .qty,
            .items-table .price,
            .items-table .total {
              text-align: right;
            }
            
            .total-row {
              display: flex;
              justify-content: space-between;
              font-size: 16px;
              font-weight: bold;
              margin: 10px 0;
            }
            
            .footer {
              text-align: center;
              margin-top: 20px;
            }
            
            .print-button {
              background-color: #2196F3;
              color: white;
              padding: 10px 20px;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-size: 14px;
              margin: 20px auto;
              display: block;
            }
            
            .print-button:hover {
              background-color: #1976D2;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="store-name">${data.storeName}</div>
              ${data.storeAddress ? `<div>${data.storeAddress}</div>` : ''}
              ${data.storePhone ? `<div>Tel: ${data.storePhone}</div>` : ''}
            </div>
            
            <div class="divider"></div>
            
            <div class="info-row">
              <span>Receipt #:</span>
              <span>${data.saleId}</span>
            </div>
            <div class="info-row">
              <span>Date:</span>
              <span>${data.saleDate}</span>
            </div>
            ${data.customerName ? `
            <div class="info-row">
              <span>Customer:</span>
              <span>${data.customerName}</span>
            </div>
            ` : ''}
            ${data.customerPhone ? `
            <div class="info-row">
              <span>Phone:</span>
              <span>${data.customerPhone}</span>
            </div>
            ` : ''}
            
            <div class="divider"></div>
            
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 45%;">Item</th>
                  <th class="qty" style="width: 15%;">Qty</th>
                  <th class="price" style="width: 20%;">Price</th>
                  <th class="total" style="width: 20%;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${data.items.map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td class="qty">${item.quantity}</td>
                    <td class="price">${item.unitPrice.toFixed(0)}</td>
                    <td class="total">${item.total.toFixed(0)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="divider"></div>
            
            <div class="total-row">
              <span>TOTAL:</span>
              <span>${data.totalAmount.toFixed(0)}</span>
            </div>
            
            <div class="divider"></div>
            
            <div class="info-row">
              <span>Payment Method:</span>
              <span>${paymentMethodText}</span>
            </div>
            
            ${data.notes ? `
            <div style="margin-top: 10px;">
              <div><strong>Notes:</strong></div>
              <div>${data.notes}</div>
            </div>
            ` : ''}
            
            <div class="footer">
              <div style="margin-top: 20px;">Thank you for your business!</div>
            </div>
          </div>
          
          <button class="print-button no-print" onclick="window.print();">Print Receipt</button>
          
          <script>
            // Auto-print after a short delay
            setTimeout(() => {
              window.print();
            }, 500);
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(receiptHTML);
      printWindow.document.close();
    } catch (error) {
      console.error('Failed to print receipt:', error);
      throw new Error('Failed to print receipt');
    }
  }

  async isConnected(): Promise<boolean> {
    return true; // Always "connected" for web
  }
}

export default new PrinterService();
