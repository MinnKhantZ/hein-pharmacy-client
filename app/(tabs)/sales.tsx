import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { salesAPI, inventoryAPI } from '../../services/api';
import { formatPrice } from '../../utils/priceFormatter';
import { useTranslation } from 'react-i18next';

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  selling_price: number;
  owner_name: string;
  owner_id: number;
}

interface SaleItem {
  inventory_item_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
  owner_name: string;
  owner_id: number;
}

interface SaleRecord {
  id: number;
  total_amount: number;
  payment_method: string;
  customer_name: string | null;
  customer_phone: string | null;
  notes: string | null;
  sale_date: string;
  items: {
    id: number;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    owner_name: string;
  }[];
}

export default function SalesScreen() {
  const { t } = useTranslation();
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  
  // Sales history state
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetchSalesHistory();
  }, []);

  useEffect(() => {
    if (showSaleModal) {
      fetchInventory();
    }
  }, [showSaleModal]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await inventoryAPI.getItems({});
      setInventoryItems(response.data.items || []);
      setLoading(false);
    } catch {
      Alert.alert('Error', t('Failed to fetch inventory items'));
      setLoading(false);
    }
  };

  const fetchSalesHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await salesAPI.getSales({ limit: 50 });
      setSalesHistory(response.data.sales || []);
      setLoadingHistory(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching sales:', error);
      setLoadingHistory(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSalesHistory();
  };

  const addItemToSale = (item: InventoryItem) => {
    const existing = saleItems.find(si => si.inventory_item_id === item.id);
    
    if (existing) {
      if (existing.quantity >= item.quantity) {
        Alert.alert('Error', t('Not enough stock available'));
        return;
      }
      setSaleItems(saleItems.map(si => 
        si.inventory_item_id === item.id
          ? { ...si, quantity: si.quantity + 1, total: Number((si.quantity + 1) * si.unit_price) }
          : si
      ));
    } else {
      setSaleItems([...saleItems, {
        inventory_item_id: item.id,
        name: item.name,
        quantity: 1,
        unit_price: Number(item.selling_price),
        total: Number(item.selling_price),
        owner_name: item.owner_name,
        owner_id: item.owner_id,
      }]);
    }
  };

  const removeItemFromSale = (itemId: number) => {
    setSaleItems(saleItems.filter(si => si.inventory_item_id !== itemId));
  };

  const updateQuantity = (itemId: number, newQuantity: number) => {
    const inventoryItem = inventoryItems.find(item => item.id === itemId);
    if (!inventoryItem) return;

    if (newQuantity <= 0) {
      removeItemFromSale(itemId);
      return;
    }

    if (newQuantity > inventoryItem.quantity) {
      Alert.alert('Error', t('Not enough stock available'));
      return;
    }

    setSaleItems(saleItems.map(si =>
      si.inventory_item_id === itemId
        ? { ...si, quantity: newQuantity, total: Number(newQuantity * si.unit_price) }
        : si
    ));
  };

  const calculateTotal = () => {
    return saleItems.reduce((sum, item) => sum + item.total, 0);
  };

  const handleSubmitSale = async () => {
    if (saleItems.length === 0) {
      Alert.alert('Error', t('Please add items to the sale'));
      return;
    }

    try {
      const payload = {
        items: saleItems.map(item => ({
          inventory_item_id: item.inventory_item_id,
          quantity: item.quantity,
        })),
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
      };

      await salesAPI.createSale(payload);
      Alert.alert('Success', t('Sale recorded successfully'), [
        {
          text: 'OK',
          onPress: () => {
            // Reset form
            setSaleItems([]);
            setCustomerName('');
            setCustomerPhone('');
            setPaymentMethod('cash');
            setNotes('');
            setSearchQuery('');
            setShowSaleModal(false);
            // Refresh sales history
            fetchSalesHistory();
          }
        }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || t('Failed to record sale'));
    }
  };

  const filteredInventory = inventoryItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('Sales')}</Text>
        <TouchableOpacity
          style={styles.newSaleButton}
          onPress={() => setShowSaleModal(true)}
        >
          <Text style={styles.newSaleButtonText}>{t('+ New Sale')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loadingHistory ? (
          <ActivityIndicator size="large" color="#2196F3" style={{ marginTop: 50 }} />
        ) : salesHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('No sales records yet')}</Text>
            <Text style={styles.emptySubtext}>
              {t('Record your first sale by clicking the "New Sale" button above')}
            </Text>
          </View>
        ) : (
          <View style={styles.salesList}>
            {salesHistory.map((sale) => (
              <View key={sale.id} style={styles.saleCard}>
                <View style={styles.saleHeader}>
                  <Text style={styles.saleId}>{t('Sale #')}{sale.id}</Text>
                  <Text style={styles.saleAmount}>{formatPrice(Number(sale.total_amount))}</Text>
                </View>
                <Text style={styles.saleDate}>
                  {new Date(sale.sale_date).toLocaleString()}
                </Text>
                {sale.customer_name && (
                  <Text style={styles.saleCustomer}>{t('Customer:')} {sale.customer_name}</Text>
                )}
                <Text style={styles.salePayment}>
                  {t('Payment:')} {sale.payment_method === 'mobile_wallet' ? t('Mobile Wallet') : t('Cash')}
                </Text>
                <View style={styles.saleItemsList}>
                  <Text style={styles.itemsTitle}>{t('Items:')}</Text>
                  {sale.items.map((item) => (
                    <View key={item.id} style={styles.saleItemRow}>
                      <Text style={styles.saleItemName}>
                        {item.item_name} × {item.quantity}
                      </Text>
                      <Text style={styles.saleItemPrice}>{formatPrice(Number(item.total_price))}</Text>
                    </View>
                  ))}
                </View>
                {sale.notes && (
                  <Text style={styles.saleNotes}>{t('Note:')} {sale.notes}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={showSaleModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('New Sale')}</Text>
            <TouchableOpacity onPress={() => setShowSaleModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            {/* Search and Add Items Section - Moved to top */}
            <View style={styles.inventorySection}>
              <Text style={styles.sectionTitle}>{t('Search & Add Items')}</Text>
              <TextInput
                style={styles.searchInput}
                placeholder={t('Search inventory by name or category...')}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {searchQuery.trim() ? (
                <ScrollView style={styles.inventoryList} nestedScrollEnabled>
                  {loading ? (
                    <ActivityIndicator size="large" color="#2196F3" style={{ marginTop: 20 }} />
                  ) : filteredInventory.length === 0 ? (
                    <Text style={styles.emptyText}>{t('No items found')}</Text>
                  ) : (
                    filteredInventory.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.inventoryItem}
                        onPress={() => addItemToSale(item)}
                      >
                        <View style={styles.inventoryItemInfo}>
                          <Text style={styles.inventoryItemName}>{item.name}</Text>
                          <Text style={styles.inventoryItemDetails}>
                            {t('Owner:')} {item.owner_name}
                          </Text>
                          <Text style={styles.inventoryItemDetails}>
                            {item.category} • Stock: {item.quantity} • {formatPrice(item.selling_price)}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.addButton}
                          onPress={() => addItemToSale(item)}
                        >
                          <Text style={styles.addButtonText}>+</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              ) : (
                <View style={styles.inventoryPlaceholder}>
                  <Text style={styles.placeholderText}>🔍</Text>
                  <Text style={styles.placeholderText}>{t('Start typing to search items')}</Text>
                </View>
              )}
            </View>

            {/* Cart Section */}
            <View style={styles.saleItemsSection}>
              <Text style={styles.sectionTitle}>{t('Cart')} ({saleItems.length} {t('items')})</Text>
              {saleItems.length === 0 ? (
                <Text style={styles.emptyText}>{t('No items in cart')}</Text>
              ) : (
                <View>
                  {saleItems.map((item) => (
                    <View key={item.inventory_item_id} style={styles.cartItem}>
                      <View style={styles.cartItemInfo}>
                        <Text style={styles.cartItemName}>{item.name}</Text>
                        <Text style={styles.cartItemOwner}>{t('Owner:')} {item.owner_name}</Text>
                        <Text style={styles.cartItemPrice}>
                          {formatPrice(item.unit_price)} × {item.quantity} = {formatPrice(item.total)}
                        </Text>
                      </View>
                      <View style={styles.cartItemActions}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(item.inventory_item_id, item.quantity - 1)}
                        >
                          <Text style={styles.quantityButtonText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(item.inventory_item_id, item.quantity + 1)}
                        >
                          <Text style={styles.quantityButtonText}>+</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => removeItemFromSale(item.inventory_item_id)}
                        >
                          <Text style={styles.removeButtonText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>{t('Total:')}</Text>
                    <Text style={styles.totalAmount}>{formatPrice(calculateTotal())}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Customer Information Section */}
            <View style={styles.customerInfoSection}>
              <Text style={styles.sectionTitle}>{t('Customer Information (Optional)')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('Customer Name')}
                value={customerName}
                onChangeText={setCustomerName}
              />
              <TextInput
                style={styles.input}
                placeholder={t('Customer Phone')}
                value={customerPhone}
                onChangeText={setCustomerPhone}
                keyboardType="phone-pad"
              />
              <View style={styles.paymentMethods}>
                {['cash', 'mobile_wallet'].map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.paymentMethodButton,
                      paymentMethod === method && styles.paymentMethodActive,
                    ]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text
                      style={[
                        styles.paymentMethodText,
                        paymentMethod === method && styles.paymentMethodTextActive,
                      ]}
                    >
                      {method === 'mobile_wallet' ? t('Mobile Wallet') : t('Cash')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder={t('Notes')}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButtonModal]}
              onPress={() => setShowSaleModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.submitButton]}
              onPress={handleSubmitSale}
            >
              <Text style={styles.submitButtonText}>{t('Complete Sale')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  newSaleButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  newSaleButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
  salesList: {
    padding: 15,
  },
  saleCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  saleId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  saleAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  saleDate: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  saleCustomer: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  salePayment: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  saleItemsList: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 10,
    marginTop: 4,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  saleItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  saleItemName: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  saleItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  saleNotes: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 28,
    color: '#666',
  },
  saleItemsSection: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  cartList: {
    maxHeight: 150,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  cartItemOwner: {
    fontSize: 13,
    color: '#2196F3',
    marginTop: 2,
    fontStyle: 'italic',
  },
  cartItemPrice: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    backgroundColor: '#e0e0e0',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 20,
    color: '#333',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    minWidth: 30,
    textAlign: 'center',
  },
  removeButton: {
    backgroundColor: '#f44336',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    marginTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  customerInfoSection: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  notesInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  paymentMethodButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  paymentMethodActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  paymentMethodTextActive: {
    color: 'white',
  },
  inventorySection: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inventoryList: {
    maxHeight: 300,
  },
  inventoryPlaceholder: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
  inventoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inventoryItemInfo: {
    flex: 1,
  },
  inventoryItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  inventoryItemDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButtonModal: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});