import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PrintReceipt from '../../components/PrintReceipt';
import { useThemeColor } from '../../hooks/use-theme-color';
import { inventoryAPI, salesAPI } from '../../services/api';
import { formatPrice } from '../../utils/priceFormatter';
import { useBreakpoint } from '../../utils/responsive';

// Dynamically import formatter to avoid importing native modules on web
const { formatReceiptData } = require('../../utils/receiptFormatter');

interface SaleItem {
  id: number;
  item_name: string;
  unit?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
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
  items: SaleItem[];
}

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  selling_price: number;
  owner_name: string;
  owner_id: number;
}

export default function SaleDetailsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const placeholderTextColor = useThemeColor({}, 'placeholder');
  const breakpoint = useBreakpoint();
  const isDesktop = breakpoint === 'desktop' || breakpoint === 'largeDesktop';
  
  const [sale, setSale] = useState<SaleRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [showInventorySearch, setShowInventorySearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // Edit state
  const [editItems, setEditItems] = useState<(SaleItem & { inventory_item_id?: number })[]>([]);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('cash');

  useEffect(() => {
    fetchSaleDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSaleDetails = async () => {
    try {
      setLoading(true);
      const response = await salesAPI.getSale(params.id);
      setSale(response.data);
      
      // Initialize edit state
      setEditItems(response.data.items || []);
      setEditCustomerName(response.data.customer_name || '');
      setEditCustomerPhone(response.data.customer_phone || '');
      setEditNotes(response.data.notes || '');
      setEditPaymentMethod(response.data.payment_method || 'cash');
    } catch (error) {
      Alert.alert('Error', t('Failed to fetch sale details'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchInventory = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setInventoryItems([]);
      return;
    }

    try {
      setSearching(true);
      const response = await inventoryAPI.getItems({ search: query.trim() });
      setInventoryItems(response.data.items || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const addItemToEdit = (item: InventoryItem) => {
    const existing = editItems.find(
      si => si.inventory_item_id === item.id
    );

    if (existing) {
      setEditItems(
        editItems.map(si =>
          si.inventory_item_id === item.id
            ? {
              ...si,
              quantity: si.quantity + 1,
              total_price: (si.quantity + 1) * Number(item.selling_price),
            }
            : si
        )
      );
    } else {
      setEditItems([
        ...editItems,
        {
          id: -1,
          item_name: item.name,
          quantity: 1,
          unit_price: Number(item.selling_price),
          total_price: Number(item.selling_price),
          owner_name: item.owner_name,
          owner_id: item.owner_id,
          inventory_item_id: item.id,
        },
      ]);
    }
  };

  const removeEditItem = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const updateEditItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeEditItem(index);
      return;
    }

    setEditItems(
      editItems.map((si, i) =>
        i === index
          ? {
            ...si,
            quantity: newQuantity,
            total_price: newQuantity * si.unit_price,
          }
          : si
      )
    );
  };

  const calculateEditTotal = () => {
    return editItems.reduce((sum, item) => sum + item.total_price, 0);
  };

  const handleDeleteSale = () => {
    Alert.alert(
      t('Delete Sale'),
      t('Are you sure you want to delete this sale? This action cannot be undone.'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await salesAPI.deleteSale(params.id);
              Alert.alert('Success', t('Sale deleted successfully'), [
                {
                  text: 'OK',
                  onPress: () => router.back(),
                },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || t('Failed to delete sale'));
            }
          },
        },
      ]
    );
  };

  const handleUpdateSale = async () => {
    if (editItems.length === 0) {
      Alert.alert('Error', t('Please add at least one item'));
      return;
    }

    try {
      setUpdating(true);
      const payload = {
        items: editItems.map(item => ({
          inventory_item_id: item.inventory_item_id || item.id,
          quantity: item.quantity,
        })),
        customer_name: editCustomerName.trim() || undefined,
        customer_phone: editCustomerPhone.trim() || undefined,
        payment_method: editPaymentMethod,
        notes: editNotes.trim() || undefined,
      };

      await salesAPI.updateSale(params.id, payload);
      Alert.alert('Success', t('Sale updated successfully'), [
        {
          text: 'OK',
          onPress: () => {
            setIsEditing(false);
            fetchSaleDetails();
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || t('Failed to update sale'));
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#2196F3" style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  if (!sale) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>{t('Sale not found')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={isDesktop ? styles.desktopContentContainer : undefined}
        >
          {!isEditing ? (
            // View Mode
            <>
              <View style={[styles.header, isDesktop && [styles.desktopHeader, styles.desktopFullWidthHeader]]}>
                <View>
                  <Text style={[styles.saleTitle, isDesktop && styles.desktopSaleTitle]}>{t('Sale')} #{sale.id}</Text>
                  <Text style={[styles.saleDate, isDesktop && styles.desktopSaleDate]}>
                    {new Date(sale.sale_date).toLocaleString()}
                  </Text>
                </View>
                <Text style={[styles.totalAmount, isDesktop && styles.desktopTotalAmount]}>{formatPrice(Number(sale.total_amount))}</Text>
              </View>

              <View style={[styles.contentWrapper, isDesktop && styles.desktopWrapper]}>
                <View style={[styles.mainContent, isDesktop && styles.desktopMainContent]}>
                  <View style={[styles.section, isDesktop && styles.desktopSection]}>
                    <Text style={[styles.sectionTitle, isDesktop && styles.desktopSectionTitle]}>{t('Sale Information')}</Text>
                    
                    {sale.customer_name && (
                      <View style={[styles.infoRow, isDesktop && styles.desktopInfoRow]}>
                        <Text style={[styles.infoLabel, isDesktop && styles.desktopInfoLabel]}>{t('Customer Name:')}</Text>
                        <Text style={[styles.infoValue, isDesktop && styles.desktopInfoValue]}>{sale.customer_name}</Text>
                      </View>
                    )}
                    
                    {sale.customer_phone && (
                      <View style={[styles.infoRow, isDesktop && styles.desktopInfoRow]}>
                        <Text style={[styles.infoLabel, isDesktop && styles.desktopInfoLabel]}>{t('Customer Phone:')}</Text>
                        <Text style={[styles.infoValue, isDesktop && styles.desktopInfoValue]}>{sale.customer_phone}</Text>
                      </View>
                    )}
                    
                    <View style={[styles.infoRow, isDesktop && styles.desktopInfoRow]}>
                      <Text style={[styles.infoLabel, isDesktop && styles.desktopInfoLabel]}>{t('Payment Method:')}</Text>
                      <Text style={[styles.infoValue, isDesktop && styles.desktopInfoValue]}>
                        {sale.payment_method === 'mobile' || sale.payment_method === 'mobile_wallet'
                          ? t('Mobile')
                          : sale.payment_method === 'card'
                          ? t('Card')
                          : sale.payment_method === 'credit'
                          ? t('Credit')
                          : t('Cash')}
                      </Text>
                    </View>

                    {sale.payment_method === 'credit' && (
                      <View style={[styles.infoRow, isDesktop && styles.desktopInfoRow]}>
                        <Text style={[styles.infoLabel, isDesktop && styles.desktopInfoLabel]}>{t('Status:')}</Text>
                        {sale.is_paid ? (
                          <View style={styles.paidBadge}>
                            <Text style={styles.paidBadgeText}>✓ {t('Paid')}</Text>
                          </View>
                        ) : (
                          <View style={styles.unpaidBadge}>
                            <Text style={styles.unpaidBadgeText}>◯ {t('Pending')}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {sale.notes && (
                      <View style={[styles.notesContainer, isDesktop && styles.desktopNotesContainer]}>
                        <Text style={[styles.notesLabel, isDesktop && styles.desktopNotesLabel]}>{t('Notes:')}</Text>
                        <Text style={[styles.notesText, isDesktop && styles.desktopNotesText]}>{sale.notes}</Text>
                      </View>
                    )}
                  </View>

                  <View style={[styles.section, isDesktop && styles.desktopSection]}>
                    <Text style={[styles.sectionTitle, isDesktop && styles.desktopSectionTitle]}>{t('Items')}</Text>
                    {sale.items.map((item, index) => (
                      <View key={index} style={[styles.itemRow, isDesktop && styles.desktopItemRow]}>
                        <View style={[styles.itemInfo, isDesktop && styles.desktopItemInfo]}>
                          <Text style={[styles.itemName, isDesktop && styles.desktopItemName]}>{item.item_name}</Text>
                          <Text style={[styles.itemOwner, isDesktop && styles.desktopItemOwner]}>{t('Owner')}: {item.owner_name}</Text>
                          <Text style={[styles.itemDetails, isDesktop && styles.desktopItemDetails]}>
                            {item.quantity} {item.unit || 'unit'} × {formatPrice(item.unit_price)}
                          </Text>
                        </View>
                        <Text style={[styles.itemTotal, isDesktop && styles.desktopItemTotal]}>{formatPrice(Number(item.total_price))}</Text>
                      </View>
                    ))}

                    <View style={[styles.totalRow, isDesktop && styles.desktopTotalRow]}>
                      <Text style={[styles.totalLabel, isDesktop && styles.desktopTotalLabel]}>{t('Total:')}</Text>
                      <Text style={[styles.totalValue, isDesktop && styles.desktopTotalValue]}>{formatPrice(Number(sale.total_amount))}</Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons and Print Receipt */}
                <View style={[styles.printButtonContainer, isDesktop && styles.desktopPrintButtonContainer]}>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                    <TouchableOpacity
                      style={[styles.button, styles.editButton, isDesktop && styles.desktopButton]}
                      onPress={() => setIsEditing(true)}
                    >
                      <Text style={[styles.buttonText, isDesktop && styles.desktopButtonText]}>✏️ {t('Edit')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.deleteButton, isDesktop && styles.desktopButton]}
                      onPress={handleDeleteSale}
                    >
                      <Text style={[styles.buttonText, isDesktop && styles.desktopButtonText]}>🗑️ {t('Delete')}</Text>
                    </TouchableOpacity>
                  </View>
                  <PrintReceipt
                    receiptData={formatReceiptData(sale)}
                    buttonText={t('Print Receipt')}
                    buttonStyle={[styles.printReceiptButton, isDesktop && styles.desktopPrintReceiptButton]}
                    onPrintSuccess={() => {
                      console.log('Receipt printed successfully');
                    }}
                    onPrintError={(error) => {
                      console.error('Print error:', error);
                    }}
                  />
                </View>
              </View>
            </>
          ) : (
            // Edit Mode
            <>
              <View style={[styles.editHeader, isDesktop && [styles.desktopEditHeader, styles.desktopFullWidthHeader]]}>
                <Text style={[styles.editTitle, isDesktop && styles.desktopEditTitle]}>{t('Edit Sale')} #{sale.id}</Text>
              </View>

              <View style={[styles.contentWrapper, isDesktop && styles.desktopWrapper]}>
                <View style={[styles.mainContent, isDesktop && styles.desktopMainContent]}>
                <View style={[styles.section, isDesktop && styles.desktopSection]}>
                  <Text style={[styles.sectionTitle, isDesktop && styles.desktopSectionTitle]}>{t('Customer Information')}</Text>
                  
                  <TextInput
                    style={[styles.input, isDesktop && styles.desktopInput]}
                    placeholder={t('Customer Name')}
                    value={editCustomerName}
                    onChangeText={setEditCustomerName}
                    placeholderTextColor={placeholderTextColor}
                  />
                  
                  <TextInput
                    style={[styles.input, isDesktop && styles.desktopInput]}
                    placeholder={t('Customer Phone')}
                    value={editCustomerPhone}
                    onChangeText={setEditCustomerPhone}
                    placeholderTextColor={placeholderTextColor}
                    keyboardType="phone-pad"
                  />

                  <Text style={[styles.paymentLabel, isDesktop && styles.desktopPaymentLabel]}>{t('Payment Method:')}</Text>
                  <View style={[styles.paymentMethodsContainer, isDesktop && styles.desktopPaymentMethodsContainer]}>
                    {['cash', 'mobile', 'credit'].map((method) => (
                      <TouchableOpacity
                        key={method}
                        style={[
                          styles.paymentMethodButton,
                          isDesktop && styles.desktopPaymentMethodButton,
                          editPaymentMethod === method && styles.paymentMethodButtonActive,
                        ]}
                        onPress={() => setEditPaymentMethod(method)}
                      >
                        <Text
                          style={[
                            styles.paymentMethodText,
                            isDesktop && styles.desktopPaymentMethodText,
                            editPaymentMethod === method && styles.paymentMethodTextActive,
                          ]}
                        >
                          {method === 'mobile' ? t('Mobile') : method === 'credit' ? t('Credit') : t('Cash')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput
                    style={[styles.input, styles.notesInput, isDesktop && styles.desktopNotesInput]}
                    placeholder={t('Notes')}
                    value={editNotes}
                    onChangeText={setEditNotes}
                    placeholderTextColor={placeholderTextColor}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={[styles.section, isDesktop && styles.desktopSection]}>
                  <Text style={[styles.sectionTitle, isDesktop && styles.desktopSectionTitle]}>{t('Items')}</Text>

                  {editItems.map((item, index) => (
                    <View key={index} style={[styles.editItemRow, isDesktop && styles.desktopEditItemRow]}>
                      <View style={[styles.editItemInfo, isDesktop && styles.desktopEditItemInfo]}>
                        <Text style={[styles.itemName, isDesktop && styles.desktopItemName]}>{item.item_name}</Text>
                        <Text style={[styles.itemOwner, isDesktop && styles.desktopItemOwner]}>{item.owner_name}</Text>
                        <Text style={[styles.itemDetails, isDesktop && styles.desktopItemDetails]}>
                          {formatPrice(item.unit_price)} each
                        </Text>
                      </View>
                      <View style={[styles.editItemActions, isDesktop && styles.desktopEditItemActions]}>
                        <TouchableOpacity
                          style={[styles.quantityButton, isDesktop && styles.desktopQuantityButton]}
                          onPress={() => updateEditItemQuantity(index, item.quantity - 1)}
                        >
                          <Text style={[styles.quantityButtonText, isDesktop && styles.desktopQuantityButtonText]}>−</Text>
                        </TouchableOpacity>
                        <Text style={[styles.quantityText, isDesktop && styles.desktopQuantityText]}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={[styles.quantityButton, isDesktop && styles.desktopQuantityButton]}
                          onPress={() => updateEditItemQuantity(index, item.quantity + 1)}
                        >
                          <Text style={[styles.quantityButtonText, isDesktop && styles.desktopQuantityButtonText]}>+</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.removeButton, isDesktop && styles.desktopRemoveButton]}
                          onPress={() => removeEditItem(index)}
                        >
                          <Text style={[styles.removeButtonText, isDesktop && styles.desktopRemoveButtonText]}>✕</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={[styles.itemTotalPrice, isDesktop && styles.desktopItemTotalPrice]}>
                        {formatPrice(Number(item.total_price))}
                      </Text>
                    </View>
                  ))}

                  <TouchableOpacity
                    style={[styles.addItemButton, isDesktop && styles.desktopAddItemButton]}
                    onPress={() => setShowInventorySearch(!showInventorySearch)}
                  >
                    <Text style={[styles.addItemButtonText, isDesktop && styles.desktopAddItemButtonText]}>+ {t('Add Item')}</Text>
                  </TouchableOpacity>

                  {showInventorySearch && (
                    <View style={[styles.searchContainer, isDesktop && styles.desktopSearchContainer]}>
                      <TextInput
                        style={[styles.searchInput, isDesktop && styles.desktopSearchInput]}
                        placeholder={t('Search items...')}
                        value={searchQuery}
                        onChangeText={handleSearchInventory}
                        placeholderTextColor={placeholderTextColor}
                        autoCapitalize="none"
                      />
                      {searching ? (
                        <ActivityIndicator size="small" color="#2196F3" />
                      ) : inventoryItems.length > 0 ? (
                        <ScrollView style={[styles.inventoryList, isDesktop && styles.desktopInventoryList]} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                          {inventoryItems.map((item) => (
                            <TouchableOpacity
                              key={item.id}
                              style={[styles.inventoryItem, isDesktop && styles.desktopInventoryItem]}
                              onPress={() => {
                                addItemToEdit(item);
                                setSearchQuery('');
                                setInventoryItems([]);
                              }}
                            >
                              <View style={styles.inventoryItemInfo}>
                                <Text style={[styles.inventoryItemName, isDesktop && styles.desktopInventoryItemName]}>{item.name}</Text>
                                <Text style={[styles.inventoryItemDetails, isDesktop && styles.desktopInventoryItemDetails]}>
                                  {t('Stock')}: {item.quantity} | {t('Price')}: {formatPrice(item.selling_price)}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      ) : searchQuery.trim() ? (
                        <Text style={[styles.noItemsText, isDesktop && styles.desktopNoItemsText]}>{t('No items found')}</Text>
                      ) : null}
                    </View>
                  )}

                  <View style={[styles.editTotalRow, isDesktop && styles.desktopEditTotalRow]}>
                    <Text style={[styles.totalLabel, isDesktop && styles.desktopTotalLabel]}>{t('Total:')}</Text>
                    <Text style={[styles.totalValue, isDesktop && styles.desktopTotalValue]}>{formatPrice(calculateEditTotal())}</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.editActionButtonsContainer, isDesktop && styles.desktopEditActionButtonsContainer]}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton, isDesktop && styles.desktopCancelButton]}
                  onPress={() => {
                    setIsEditing(false);
                    fetchSaleDetails();
                  }}
                  disabled={updating}
                >
                  <Text style={[styles.cancelButtonText, isDesktop && styles.desktopCancelButtonText]}>{t('Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton, isDesktop && styles.desktopSaveButton, updating && styles.disabledButton]}
                  onPress={handleUpdateSale}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={[styles.buttonText, isDesktop && styles.desktopButtonText]}>✓ {t('Save Changes')}</Text>
                  )}
                </TouchableOpacity>
              </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editHeader: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  saleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  editTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  saleDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 10,
    padding: 20,
    marginHorizontal: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  paidBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  paidBadgeText: {
    color: '#2E7D32',
    fontWeight: '600',
    fontSize: 14,
  },
  unpaidBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  unpaidBadgeText: {
    color: '#E65100',
    fontWeight: '600',
    fontSize: 14,
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemOwner: {
    fontSize: 13,
    color: '#2196F3',
    marginTop: 4,
    fontStyle: 'italic',
  },
  itemDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    marginTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  editTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    marginTop: 15,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginTop: 20,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
    marginBottom: 20,
  },
  editActionButtonsContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
    marginBottom: 30,
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  paymentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  paymentMethodsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  paymentMethodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  paymentMethodButtonActive: {
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
  editItemRow: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  editItemInfo: {
    flex: 1,
    marginRight: 10,
  },
  editItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quantityButton: {
    backgroundColor: '#e0e0e0',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
  quantityText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    minWidth: 25,
    textAlign: 'center',
  },
  removeButton: {
    backgroundColor: '#f44336',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  itemTotalPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  addItemButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  addItemButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  searchContainer: {
    marginTop: 15,
    marginBottom: 15,
  },
  inventoryList: {
    maxHeight: 250,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inventoryItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  noItemsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 15,
  },
  printButtonContainer: {
    marginTop: 20,
    marginBottom: 20,
    marginHorizontal: 10,
  },
  printReceiptButton: {
    backgroundColor: '#4CAF50',
  },
  // Desktop styles
  desktopContentContainer: {
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
  },
  desktopWrapper: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  desktopHeader: {
    paddingHorizontal: 40,
    paddingVertical: 30,
  },
  desktopFullWidthHeader: {
    width: '100%',
    maxWidth: 'none',
    alignSelf: 'stretch',
  },
  desktopSaleTitle: {
    fontSize: 32,
  },
  desktopSaleDate: {
    fontSize: 16,
    marginTop: 8,
  },
  desktopTotalAmount: {
    fontSize: 36,
  },
  mainContent: {
    // Default mobile layout
  },
  desktopMainContent: {
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: 20,
  },
  desktopSection: {
    flex: 1,
    padding: 30,
    marginHorizontal: 0,
    marginBottom: 20,
  },
  desktopSectionTitle: {
    fontSize: 20,
    marginBottom: 20,
  },
  desktopInfoRow: {
    paddingVertical: 16,
  },
  desktopInfoLabel: {
    fontSize: 17,
  },
  desktopInfoValue: {
    fontSize: 17,
  },
  desktopNotesContainer: {
    paddingTop: 16,
  },
  desktopNotesLabel: {
    fontSize: 17,
    marginBottom: 10,
  },
  desktopNotesText: {
    fontSize: 16,
    lineHeight: 24,
  },
  desktopItemRow: {
    paddingVertical: 16,
  },
  desktopItemInfo: {
    marginRight: 20,
  },
  desktopItemName: {
    fontSize: 17,
  },
  desktopItemOwner: {
    fontSize: 14,
    marginTop: 6,
  },
  desktopItemDetails: {
    fontSize: 15,
    marginTop: 6,
  },
  desktopItemTotal: {
    fontSize: 17,
  },
  desktopTotalRow: {
    paddingTop: 20,
    marginTop: 15,
  },
  desktopTotalLabel: {
    fontSize: 20,
  },
  desktopTotalValue: {
    fontSize: 24,
  },
  desktopActionButtonsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 15,
  },
  desktopButton: {
    paddingVertical: 16,
  },
  desktopButtonText: {
    fontSize: 17,
  },
  desktopPrintButtonContainer: {
    marginTop: 30,
    marginBottom: 30,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  desktopPrintReceiptButton: {
    minWidth: 200,
    paddingVertical: 16,
    paddingHorizontal: 30,
  },
  desktopEditHeader: {
    paddingHorizontal: 40,
    paddingVertical: 30,
  },
  desktopEditTitle: {
    fontSize: 32,
  },
  desktopInput: {
    padding: 14,
    fontSize: 16,
  },
  desktopPaymentLabel: {
    fontSize: 17,
    marginBottom: 12,
  },
  desktopPaymentMethodsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  desktopPaymentMethodButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  desktopPaymentMethodText: {
    fontSize: 15,
  },
  desktopNotesInput: {
    height: 100,
  },
  desktopEditItemRow: {
    padding: 16,
  },
  desktopEditItemInfo: {
    marginRight: 20,
  },
  desktopEditItemActions: {
    gap: 8,
  },
  desktopQuantityButton: {
    width: 32,
    height: 32,
  },
  desktopQuantityButtonText: {
    fontSize: 20,
  },
  desktopQuantityText: {
    fontSize: 16,
    minWidth: 30,
  },
  desktopRemoveButton: {
    width: 32,
    height: 32,
  },
  desktopRemoveButtonText: {
    fontSize: 16,
  },
  desktopItemTotalPrice: {
    fontSize: 17,
    marginLeft: 15,
  },
  desktopAddItemButton: {
    paddingVertical: 14,
  },
  desktopAddItemButtonText: {
    fontSize: 17,
  },
  desktopSearchContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  desktopSearchInput: {
    padding: 14,
    fontSize: 16,
  },
  desktopInventoryList: {
    maxHeight: 300,
  },
  desktopInventoryItem: {
    padding: 14,
  },
  desktopInventoryItemName: {
    fontSize: 16,
  },
  desktopInventoryItemDetails: {
    fontSize: 14,
    marginTop: 6,
  },
  desktopNoItemsText: {
    fontSize: 15,
    paddingVertical: 20,
  },
  desktopEditTotalRow: {
    paddingTop: 20,
    marginTop: 20,
  },
  desktopEditActionButtonsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    gap: 15,
  },
  desktopCancelButton: {
    paddingVertical: 16,
  },
  desktopSaveButton: {
    paddingVertical: 16,
  },
  desktopCancelButtonText: {
    fontSize: 17,
  },
});
