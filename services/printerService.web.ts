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

const AGENT_PORTS = [3000, 3001, 3002]; // Try multiple ports

class PrinterService {
  private agentAvailable: boolean = false;
  private agentUrl: string = '';

  constructor() {
    this.checkAgentAvailability();
  }

  /**
   * Check if the local printing agent is running (try multiple ports)
   */
  private async checkAgentAvailability(): Promise<void> {
    for (const port of AGENT_PORTS) {
      try {
        const url = `http://localhost:${port}`;
        const response = await fetch(`${url}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(2000), // 2 second timeout
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'ok') {
            this.agentAvailable = true;
            this.agentUrl = url;
            console.log('✅ Printing agent is available at:', url);
            return;
          }
        }
      } catch (error) {
        // Try next port
        continue;
      }
    }
    
    // No agent found
    this.agentAvailable = false;
    this.agentUrl = '';
    console.log('⚠️ Printing agent not available, will use browser fallback');
  }

  async enableBluetooth(): Promise<boolean> {
    await this.checkAgentAvailability();
    return true;
  }

  async scanPrinters(): Promise<PrinterDevice[]> {
    await this.checkAgentAvailability();
    return [{ name: 'ESC/POS Printer (via Agent)', address: 'agent' }];
  }

  async connectToPrinter(address: string): Promise<void> {
    await this.checkAgentAvailability();
    return;
  }

  async disconnect(): Promise<void> {
    return;
  }

  /**
   * Print receipt via local printing agent or fallback to browser print
   */
  async printReceipt(data: ReceiptData): Promise<void> {
    // Always check agent availability before printing
    await this.checkAgentAvailability();

    if (this.agentAvailable) {
      try {
        console.log('Attempting to print via agent...');
        await this.printViaAgent(data);
        console.log('Printed successfully via agent');
        return;
      } catch (error) {
        console.error('Failed to print via agent, falling back to browser print:', error);
        // Fall back to browser print if agent fails
        this.agentAvailable = false;
      }
    }

    // Fallback: Use browser print dialog
    console.log('Using browser print fallback');
    await this.printViaBrowser(data);
  }

  /**
   * Print via local printing agent (ESC/POS)
   * Uses image mode for Burmese text support
   */
  private async printViaAgent(data: ReceiptData): Promise<void> {
    if (!this.agentUrl) {
      throw new Error('Agent URL not available');
    }

    // Use image mode to support Burmese/Myanmar characters
    const printData = {
      ...data,
      useImageMode: true,
    };

    const response = await fetch(`${this.agentUrl}/print`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(printData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to print via agent');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Print failed');
    }
  }

  /**
   * Fallback: Print via browser print dialog
   * Synchronized with client native printing layout (ReceiptView.tsx)
   */
  private async printViaBrowser(data: ReceiptData): Promise<void> {
    try {
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        throw new Error('Please allow pop-ups to print receipts');
      }

      // Translate payment method to Burmese (matching client)
      const paymentMethodBurmese = data.paymentMethod === 'cash' ? 'လက်ငင်း' : 
                                   data.paymentMethod === 'credit' ? 'အကြွေး' : 
                                   data.paymentMethod.charAt(0).toUpperCase() + data.paymentMethod.slice(1);

      const receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Receipt #${data.saleId}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Myanmar:wght@400;700&display=swap');
            
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
              font-family: 'Noto Sans Myanmar', 'Pyidaungsu', 'Myanmar Text', 'Courier New', monospace;
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
              <div class="store-name">ဟိန်း ဆေးဆိုင်</div>
              <div>ပြည်သူ့ဆေးရုံရှေ့၊ ချောက်မြို့</div>
              <div>Ph: 09774772012, 09792222248</div>
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
                  <th style="width: 40%;">ပစ္စည်းအမည်</th>
                  <th class="qty" style="width: 10%;">အရေ</th>
                  <th class="price" style="width: 20%;">ဈေးနှုန်း</th>
                  <th class="total" style="width: 25%;">သင့်ငွေ</th>
                </tr>
              </thead>
              <tbody>
                ${data.items.map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td class="qty">${item.quantity}</td>
                    <td class="price">${item.unitPrice.toLocaleString()}</td>
                    <td class="total">${item.total.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="divider"></div>
            
            <div class="total-row">
              <span>စုစုပေါင်း:</span>
              <span>${data.totalAmount.toLocaleString()} Ks</span>
            </div>
            
            <div class="divider"></div>
            
            <div class="info-row">
              <span>ငွေပေးချေမှု:</span>
              <span>${paymentMethodBurmese}</span>
            </div>
            
            ${data.notes ? `
            <div style="margin-top: 10px;">
              <div><strong>မှတ်ချက်:</strong></div>
              <div>${data.notes}</div>
            </div>
            ` : ''}
            
            <div class="footer">
              <div style="margin-top: 20px;">၀ယ်ယူအားပေးမှုကိုကျေးဇူးတင်ပါသည်</div>
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
    await this.checkAgentAvailability();
    return this.agentAvailable;
  }

  /**
   * Check if printing agent is available
   */
  async isAgentAvailable(): Promise<boolean> {
    await this.checkAgentAvailability();
    return this.agentAvailable;
  }
}

export default new PrinterService();
