import { useCallback } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { inventoryAPI } from '../services/api';

/**
 * Custom hook to monitor inventory and send low stock alerts
 */
export function useInventoryNotifications() {
  const { sendLowStockAlert, notificationSettings } = useNotifications();

  // Check inventory for low stock items
  const checkLowStockItems = useCallback(async () => {
    if (!notificationSettings.lowStockAlerts) {
      return;
    }

    try {
      const response = await inventoryAPI.getLowStockItems();
      const lowStockItems = response.data.items || [];

      // Send notification for each low stock item
      for (const item of lowStockItems) {
        await sendLowStockAlert(
          item.item_name,
          item.quantity,
          item.min_stock_level
        );
      }

      return lowStockItems.length;
    } catch (error) {
      console.error('Error checking low stock items:', error);
      return 0;
    }
  }, [sendLowStockAlert, notificationSettings.lowStockAlerts]);

  // Check for low stock when item is updated
  const checkItemStock = useCallback(async (item: any) => {
    if (!notificationSettings.lowStockAlerts) {
      return;
    }

    const { item_name, quantity, min_stock_level } = item;
    
    // Check if item is below minimum stock level
    if (quantity <= min_stock_level) {
      await sendLowStockAlert(item_name, quantity, min_stock_level);
    }
  }, [sendLowStockAlert, notificationSettings.lowStockAlerts]);

  return {
    checkLowStockItems,
    checkItemStock,
  };
}

/**
 * Custom hook to send daily sales notifications
 */
export function useSalesNotifications() {
  const { sendDailySalesNotification, notificationSettings } = useNotifications();

  // Send daily sales summary
  const sendDailySummary = useCallback(async (salesData: any) => {
    if (!notificationSettings.salesNotifications) {
      return;
    }

    const { totalSales, totalIncome, itemCount } = salesData;
    
    await sendDailySalesNotification(totalSales, totalIncome, itemCount);
  }, [sendDailySalesNotification, notificationSettings.salesNotifications]);

  return {
    sendDailySummary,
  };
}
