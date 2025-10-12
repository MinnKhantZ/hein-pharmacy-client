import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../contexts/AuthContext';
import { authAPI, inventoryAPI } from '../../services/api';
import { formatPrice } from '../../utils/priceFormatter';

interface InventoryItem {
  id: number;
  name: string;
  description: string;
  category: string;
  quantity: number;
  unit_price: number;
  selling_price: number;
  minimum_stock: number;
  owner_name: string;
  owner_id: number;
}

interface Owner {
  id: number;
  username: string;
  full_name: string;
}

export default function InventoryScreen() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user } = useContext(AuthContext) as { user: { username: string; id: number } | null };
  const { t } = useTranslation();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  // Filter states
  const [filterOwner, setFilterOwner] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Sort states
  type SortOption = 'name' | 'stock_asc' | 'stock_desc' | 'price_asc' | 'price_desc' | 'recent';
  const [sortBy, setSortBy] = useState<SortOption>('name');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    quantity: '',
    unit_price: '',
    selling_price: '',
    minimum_stock: '',
    owner_id: '',
  });

  useEffect(() => {
    fetchItems();
    fetchOwners(); // Everyone can access owners now
    fetchCategories();
  }, []);

  useEffect(() => {
    let filtered = items;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.category?.toLowerCase().includes(query)
      );
    }
    
    // Apply owner filter
    if (filterOwner) {
      filtered = filtered.filter((item) => item.owner_id.toString() === filterOwner);
    }
    
    // Apply category filter
    if (filterCategory) {
      filtered = filtered.filter((item) => item.category === filterCategory);
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'stock_asc':
          return a.quantity - b.quantity;
        case 'stock_desc':
          return b.quantity - a.quantity;
        case 'price_asc':
          return a.selling_price - b.selling_price;
        case 'price_desc':
          return b.selling_price - a.selling_price;
        case 'recent':
          // Assuming newer items have higher IDs
          return b.id - a.id;
        default:
          return 0;
      }
    });
    
    setFilteredItems(sorted);
  }, [searchQuery, items, filterOwner, filterCategory, sortBy]);

  const fetchItems = async () => {
    try {
      const response = await inventoryAPI.getItems({});
      setItems(response.data.items || []);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching items:', error);
      Alert.alert('Error', t('Failed to fetch inventory items'));
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchOwners = async () => {
    try {
      const response = await authAPI.getAllOwners();
      setOwners(response.data.owners || []);
    } catch (error) {
      console.error('Error fetching owners:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await inventoryAPI.getCategories();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchItems();
    fetchOwners();
    fetchCategories();
  };

  const openAddModal = () => {
    setSelectedItem(null);
    setFormData({
      name: '',
      description: '',
      category: '',
      quantity: '',
      unit_price: '',
      selling_price: '',
      minimum_stock: '10',
      owner_id: '',
    });
    setShowAddModal(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      category: item.category || '',
      quantity: item.quantity.toString(),
      unit_price: item.unit_price.toString(),
      selling_price: item.selling_price.toString(),
      minimum_stock: item.minimum_stock.toString(),
      owner_id: item.owner_id?.toString() || '',
    });
    setShowAddModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.quantity || !formData.unit_price || !formData.selling_price) {
      Alert.alert('Error', t('Please fill in all required fields'));
      return;
    }

    if (!formData.owner_id) {
      Alert.alert('Error', t('Please select an owner'));
      return;
    }

    try {
      const payload: any = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        quantity: parseInt(formData.quantity),
        unit_price: parseFloat(formData.unit_price),
        selling_price: parseFloat(formData.selling_price),
        minimum_stock: parseInt(formData.minimum_stock || '0'),
        owner_id: parseInt(formData.owner_id),
      };

      if (selectedItem) {
        await inventoryAPI.updateItem(selectedItem.id, payload);
        Alert.alert('Success', t('Item updated successfully'));
      } else {
        await inventoryAPI.createItem(payload);
        Alert.alert('Success', t('Item added successfully'));
      }

      setShowAddModal(false);
      fetchItems();
      fetchCategories(); // Refresh categories in case a new one was added
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || t('Failed to save item'));
    }
  };

  const handleDelete = (item: InventoryItem) => {
    Alert.alert(
      t('Delete Item'),
      `${t('Are you sure you want to delete')} ${item.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await inventoryAPI.deleteItem(item.id);
              Alert.alert('Success', t('Item deleted successfully'));
              fetchItems();
            } catch {
              Alert.alert('Error', t('Failed to delete item'));
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#2196F3" style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('Inventory')}</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>{t('+ Add Item')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('Search items...')}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterButtonText}>
            {showFilters ? '▲ Hide Filters' : '▼ Show Filters'}
          </Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>{t('Sort by')}</Text>
            <View style={styles.filterPickerContainer}>
              <RNPickerSelect
                value={sortBy}
                onValueChange={(value: SortOption) => setSortBy(value)}
                items={[
                  { label: t('Name (A-Z)'), value: 'name' },
                  { label: t('Stock (Low to High)'), value: 'stock_asc' },
                  { label: t('Stock (High to Low)'), value: 'stock_desc' },
                  { label: t('Price (Low to High)'), value: 'price_asc' },
                  { label: t('Price (High to Low)'), value: 'price_desc' },
                  { label: t('Recently Added'), value: 'recent' },
                ]}
                style={{
                  inputIOS: styles.filterPicker,
                  inputAndroid: styles.filterPicker,
                  inputWeb: styles.filterPicker,
                }}
              />
            </View>
          </View>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>{t('Filter by Owner')}</Text>
            <View style={styles.filterPickerContainer}>
              <RNPickerSelect
                value={filterOwner}
                onValueChange={(value: string) => setFilterOwner(value)}
                items={[
                  { label: t('All Owners'), value: '' },
                  ...owners.map((owner) => ({
                    label: owner.full_name,
                    value: owner.id.toString(),
                  })),
                ]}
                style={{
                  inputIOS: styles.filterPicker,
                  inputAndroid: styles.filterPicker,
                  inputWeb: styles.filterPicker,
                }}
              />
            </View>
          </View>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>{t('Filter by Category')}</Text>
            <View style={styles.filterPickerContainer}>
              <RNPickerSelect
                value={filterCategory}
                onValueChange={(value: string) => setFilterCategory(value)}
                items={[
                  { label: t('All Categories'), value: '' },
                  ...categories.map((cat) => ({
                    label: cat,
                    value: cat,
                  })),
                ]}
                style={{
                  inputIOS: styles.filterPicker,
                  inputAndroid: styles.filterPicker,
                  inputWeb: styles.filterPicker,
                }}
              />
            </View>
          </View>
          {(filterOwner || filterCategory) && (
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={() => {
                setFilterOwner('');
                setFilterCategory('');
              }}
            >
              <Text style={styles.clearFiltersText}>{t('Clear Filters')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('No items found')}</Text>
          </View>
        ) : (
          filteredItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.itemCard,
                item.quantity <= item.minimum_stock && styles.lowStockCard,
              ]}
              onPress={() => openEditModal(item)}
            >
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.quantity <= item.minimum_stock && (
                  <View style={styles.lowStockBadge}>
                    <Text style={styles.lowStockText}>{t('Low Stock')}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.itemCategory}>{item.category}</Text>
              <Text style={styles.itemDescription}>{item.description}</Text>
              <View style={styles.itemDetails}>
                <Text style={styles.detailText}>{t('Qty:')} {item.quantity}</Text>
                <Text style={styles.detailText}>{t('Price:')} {formatPrice(item.selling_price)}</Text>
                <Text style={styles.detailText}>{t('Owner:')} {item.owner_name}</Text>
              </View>
              <View style={styles.itemActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openEditModal(item)}
                >
                  <Text style={styles.editButtonText}>{t('Edit Item')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(item)}
                >
                  <Text style={styles.deleteButtonText}>{t('Delete Item')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedItem ? t('Edit Item') : t('Add New Item')}
            </Text>
            
            <ScrollView>
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>{t('Owner')}</Text>
                <RNPickerSelect
                  value={formData.owner_id}
                  onValueChange={(value: string) => setFormData({ ...formData, owner_id: value })}
                  items={owners.map((owner) => ({
                    label: owner.full_name,
                    value: owner.id.toString(),
                  }))}
                  placeholder={{ label: t('Select Owner'), value: '' }}
                  style={{
                    inputIOS: styles.pickerInput,
                    inputAndroid: styles.pickerInput,
                    inputWeb: styles.pickerInput,
                  }}
                />
              </View>
              
              <TextInput
                style={styles.input}
                placeholder={t('Item Name *')}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
              
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>{t('Category')}</Text>
                <RNPickerSelect
                  value={formData.category}
                  onValueChange={(value: string) => setFormData({ ...formData, category: value })}
                  items={categories.map((cat) => ({
                    label: cat,
                    value: cat,
                  }))}
                  placeholder={{ label: t('Select or type below'), value: '' }}
                  style={{
                    inputIOS: styles.pickerInput,
                    inputAndroid: styles.pickerInput,
                    inputWeb: styles.pickerInput,
                  }}
                />
                <TextInput
                  style={[styles.input, { marginTop: 5 }]}
                  placeholder={t('Or type new category')}
                  value={formData.category}
                  onChangeText={(text) => setFormData({ ...formData, category: text })}
                />
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t('Description')}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={3}
              />
              <TextInput
                style={styles.input}
                placeholder={t('Quantity *')}
                value={formData.quantity}
                onChangeText={(text) => setFormData({ ...formData, quantity: text })}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder={t('Unit Price *')}
                value={formData.unit_price}
                onChangeText={(text) => setFormData({ ...formData, unit_price: text })}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={styles.input}
                placeholder={t('Selling Price *')}
                value={formData.selling_price}
                onChangeText={(text) => setFormData({ ...formData, selling_price: text })}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={styles.input}
                placeholder={t('Minimum Stock')}
                value={formData.minimum_stock}
                onChangeText={(text) => setFormData({ ...formData, minimum_stock: text })}
                keyboardType="numeric"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSubmit}
              >
                <Text style={styles.saveButtonText}>{t('Save Item')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  addButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  searchContainer: {
    padding: 15,
    backgroundColor: 'white',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
    paddingBottom: 100, // Extra padding for tab bar
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  itemCard: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  lowStockCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  lowStockBadge: {
    backgroundColor: '#f44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  lowStockText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  itemCategory: {
    fontSize: 14,
    color: '#2196F3',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  editButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  editButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#2196F3',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  pickerContainer: {
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    fontWeight: '600',
  },
  picker: {
    marginHorizontal: 8,
  },
  pickerInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  filterButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  filterButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  filtersContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterRow: {
    marginBottom: 15,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  filterPickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  filterPicker: {
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  clearFiltersButton: {
    backgroundColor: '#f44336',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearFiltersText: {
    color: 'white',
    fontWeight: '600',
  },
  pickerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  manageButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  manageButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  ownerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  ownerName: {
    fontSize: 16,
    color: '#333',
  },
  deleteOwnerButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  deleteOwnerText: {
    color: 'white',
    fontWeight: '600',
  },
});