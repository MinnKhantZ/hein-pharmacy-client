import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '../../contexts/NotificationContext';
import { useThemeColor } from '../../hooks/use-theme-color';
import { inventoryAPI, salesAPI } from '../../services/api';
import { formatPrice } from '../../utils/priceFormatter';

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
  is_paid: boolean;
  paid_date: string | null;
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
  const placeholderTextColor = useThemeColor({}, 'placeholder');
  const { expoPushToken } = useNotifications();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ openModal?: string }>();
  const router = useRouter();
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  
  // Sales history state
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const LIMIT = 20;
  
  // Search, filter, and sort states
  const [salesSearch, setSalesSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('sale_date');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [showFilters, setShowFilters] = useState(false);

  const fetchInventory = React.useCallback(async (search: string = '') => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (search.trim()) {
        params.search = search.trim();
      }
      
      const response = await inventoryAPI.getItems(params);
      setInventoryItems(response.data.items || []);
      setLoading(false);
    } catch {
      Alert.alert('Error', t('Failed to fetch inventory items'));
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSalesHistory(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const shouldOpenModal = Array.isArray(params.openModal)
      ? params.openModal.includes('true')
      : params.openModal === 'true';

    if (!shouldOpenModal) {
      return;
    }

    const timer = setTimeout(() => {
      setShowSaleModal(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [params.openModal]);

  // Debounced search and filter/sort effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchSalesHistory(1, false);
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesSearch, paymentFilter, sortBy, sortOrder]);

  useEffect(() => {
    if (showSaleModal && searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        fetchInventory(searchQuery);
      }, 500); // Debounce for 500ms

      return () => clearTimeout(timeoutId);
    } else if (showSaleModal && !searchQuery.trim()) {
      setInventoryItems([]);
    }
  }, [searchQuery, showSaleModal, fetchInventory]);

  const fetchSalesHistory = React.useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoadingHistory(true);
      }
      
      const params: any = { 
        page: pageNum, 
        limit: LIMIT,
        sortBy: sortBy,
        sortOrder: sortOrder
      };
      
      if (salesSearch.trim()) {
        params.search = salesSearch.trim();
      }
      
      if (paymentFilter !== 'all') {
        params.payment_method = paymentFilter;
      }
      
      const response = await salesAPI.getSales(params);
      
      const newSales = response.data.sales || [];
      
      if (append) {
        setSalesHistory(prev => [...prev, ...newSales]);
      } else {
        setSalesHistory(newSales);
      }
      
      setPage(pageNum);
      setTotalPages(response.data.pagination?.pages || 1);
      setLoadingHistory(false);
      setRefreshing(false);
      setLoadingMore(false);
    } catch (error) {
      console.error('Error fetching sales:', error);
      setLoadingHistory(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [LIMIT, sortBy, sortOrder, salesSearch, paymentFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchSalesHistory(1, false);
  };

  const handleLoadMoreSales = () => {
    if (loadingMore || page >= totalPages) return;
    fetchSalesHistory(page + 1, true);
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
      setSubmitting(true);
      const payload = {
        items: saleItems.map(item => ({
          inventory_item_id: item.inventory_item_id,
          quantity: item.quantity,
        })),
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
        device_push_token: expoPushToken || undefined, // Include device push token to exclude from notifications
      };

      await salesAPI.createSale(payload);
      setSubmitting(false);
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
            setPage(1);
            fetchSalesHistory(1, false);
          }
        }
      ]);
    } catch (error: any) {
      setSubmitting(false);
      Alert.alert('Error', error.response?.data?.error || t('Failed to record sale'));
    }
  };

  const handleMarkAsPaid = async (saleId: number) => {
    Alert.alert(
      t('Mark as Paid'),
      t('Are you sure you want to mark this sale as paid? This will add it to the income for the original sale date.'),
      [
        {
          text: t('Cancel'),
          style: 'cancel'
        },
        {
          text: t('Mark as Paid'),
          onPress: async () => {
            try {
              await salesAPI.markAsPaid(saleId);
              Alert.alert('Success', t('Sale marked as paid successfully'));
              // Refresh sales history
              fetchSalesHistory(page, false);
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || t('Failed to mark sale as paid'));
            }
          }
        }
      ]
    );
  };

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

      {/* Search and Filter Section */}
      <View style={styles.filterSection}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('Search by customer name, phone, or item...')}
          value={salesSearch}
          onChangeText={setSalesSearch}
          placeholderTextColor={placeholderTextColor}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.filterToggleButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterToggleText}>
            {showFilters ? '▲ ' + t('Hide Filters') : '▼ ' + t('Show Filters')}
          </Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          {/* Payment Method Filter */}
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>{t('Payment:')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
              {['all', 'cash', 'mobile', 'credit'].map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.filterOption,
                    paymentFilter === method && styles.filterOptionActive,
                  ]}
                  onPress={() => setPaymentFilter(method)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      paymentFilter === method && styles.filterOptionTextActive,
                    ]}
                  >
                    {method === 'all' ? t('All') : method === 'mobile' ? t('Mobile') : method === 'credit' ? t('Credit') : t('Cash')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Sort Options */}
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>{t('Sort by:')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
              {[
                { value: 'sale_date', label: t('Date') },
                { value: 'total_amount', label: t('Amount') },
                { value: 'customer_name', label: t('Customer') },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterOption,
                    sortBy === option.value && styles.filterOptionActive,
                  ]}
                  onPress={() => setSortBy(option.value)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      sortBy === option.value && styles.filterOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.sortOrderButton}
                onPress={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
              >
                <Text style={styles.sortOrderText}>
                  {sortOrder === 'ASC' ? '↑' : '↓'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}

      {loadingHistory ? (
        <ActivityIndicator size="large" color="#2196F3" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={salesHistory}
          renderItem={({ item: sale }) => (
            <TouchableOpacity 
              style={styles.saleCard}
              onPress={() => router.push({ pathname: '/sales-details/[id]', params: { id: sale.id } })}
            >
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
              {sale.customer_phone && (
                <Text style={styles.saleCustomer}>{t('Phone:')} {sale.customer_phone}</Text>
              )}
              <Text style={styles.salePayment}>
                {t('Payment:')} {sale.payment_method === 'mobile' || sale.payment_method === 'mobile_wallet' ? t('Mobile') : sale.payment_method === 'card' ? t('Card') : sale.payment_method === 'credit' ? t('Credit') : t('Cash')}
              </Text>
              
              {/* Payment Status - Show only for credit sales */}
              {sale.payment_method === 'credit' && (
                <View style={styles.paymentStatusContainer}>
                  {sale.is_paid ? (
                    <View style={styles.paidBadge}>
                      <Text style={styles.paidBadgeText}>✓ {t('Paid')}</Text>
                      {sale.paid_date && (
                        <Text style={styles.paidDateText}>
                          {t('Paid on:')} {new Date(sale.paid_date).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.markAsPaidButton}
                      onPress={() => {
                        handleMarkAsPaid(sale.id);
                      }}
                    >
                      <Text style={styles.markAsPaidText}>☐ {t('Mark as Paid')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              
              <View style={styles.saleItemsList}>
                <Text style={styles.itemsTitle}>
                  {t('Items:')} ({sale.items.length})
                </Text>
                {sale.items.slice(0, 2).map((item) => (
                  <View key={item.id} style={styles.saleItemRow}>
                    <Text style={styles.saleItemName} numberOfLines={1}>
                      {item.item_name} × {item.quantity}
                    </Text>
                    <Text style={styles.saleItemPrice}>{formatPrice(Number(item.total_price))}</Text>
                  </View>
                ))}
                {sale.items.length > 2 && (
                  <View style={styles.moreItemsRow}>
                    <Text style={styles.moreItemsText}>
                      + {sale.items.length - 2} {t('more item')}
                      {sale.items.length - 2 !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>
              {sale.notes && (
                <Text style={styles.saleNotes} numberOfLines={2}>{t('Note:')} {sale.notes}</Text>
              )}
              
              <View style={styles.viewDetailsFooter}>
                <Text style={styles.viewDetailsText}>{t('Tap to view details')} →</Text>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('No sales records yet')}</Text>
              <Text style={styles.emptySubtext}>
                {t('Record your first sale by clicking the "New Sale" button above')}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          onEndReached={handleLoadMoreSales}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color="#2196F3" style={{ marginVertical: 20 }} />
            ) : null
          }
          contentContainerStyle={[styles.scrollView, { paddingBottom: insets.bottom + 50, paddingTop: 15 }]}
        />
      )}

      <Modal visible={showSaleModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
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
                placeholderTextColor={placeholderTextColor}
                autoCapitalize="none"
              />
              {searchQuery.trim() ? (
                <ScrollView style={styles.inventoryList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {loading ? (
                    <ActivityIndicator size="large" color="#2196F3" style={{ marginTop: 20 }} />
                  ) : inventoryItems.length === 0 ? (
                    <Text style={styles.emptyText}>{t('No items found')}</Text>
                  ) : (
                    inventoryItems.map((item) => (
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
                placeholderTextColor={placeholderTextColor}
              />
              <TextInput
                style={styles.input}
                placeholder={t('Customer Phone')}
                value={customerPhone}
                onChangeText={setCustomerPhone}
                placeholderTextColor={placeholderTextColor}
                keyboardType="phone-pad"
              />
              <View style={styles.paymentMethods}>
                {['cash', 'mobile', 'credit'].map((method) => (
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
                      {method === 'mobile' ? t('Mobile') : method === 'credit' ? t('Credit') : t('Cash')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder={t('Notes')}
                value={notes}
                onChangeText={setNotes}
                placeholderTextColor={placeholderTextColor}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButtonModal]}
              onPress={() => setShowSaleModal(false)}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>{t('Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmitSale}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>{t('Complete Sale')}</Text>
              )}
            </TouchableOpacity>
          </View>
          </KeyboardAvoidingView>
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
  scrollView: {
    paddingBottom: 20, // Base padding, additional padding added dynamically
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
  moreItemsRow: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  moreItemsText: {
    fontSize: 13,
    color: '#2196F3',
    fontStyle: 'italic',
    fontWeight: '600',
  },
  viewDetailsFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 13,
    color: '#2196F3',
    fontWeight: '600',
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
  submitButtonDisabled: {
    backgroundColor: '#9E9E9E',
    opacity: 0.7,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  filterSection: {
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterToggleButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  filterToggleText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  filtersContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterRow: {
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterOptionActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#666',
  },
  filterOptionTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  sortOrderButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  },
  sortOrderText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  paymentStatusContainer: {
    marginTop: 10,
    marginBottom: 5,
  },
  paidBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  paidBadgeText: {
    color: '#2E7D32',
    fontWeight: '600',
    fontSize: 14,
  },
  paidDateText: {
    color: '#66BB6A',
    fontSize: 12,
    marginTop: 2,
  },
  markAsPaidButton: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  markAsPaidText: {
    color: '#E65100',
    fontWeight: '600',
    fontSize: 14,
  },
});