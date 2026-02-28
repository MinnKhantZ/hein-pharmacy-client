import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import OwnerSelector from "../../components/OwnerSelector";
import SearchableDropdown from "../../components/SearchableDropdown";
import { AuthContext } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import { useThemeColor } from "../../hooks/use-theme-color";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { authAPI, inventoryAPI, unitConversionAPI } from "../../services/api";
import { formatPrice } from "../../utils/priceFormatter";
import { useBreakpoint } from "../../utils/responsive";

interface InventoryItem {
  id: number;
  name: string;
  description: string;
  category: string;
  unit: string;
  quantity: number;
  unit_price: number;
  selling_price: number;
  minimum_stock: number;
  owner_name: string;
  owner_id: number;
  expiry_date?: string | null;
}

interface UnitConversion {
  id: number;
  base_item_id: number;
  package_item_id: number;
  conversion_rate: number;
  base_item_name: string;
  base_item_unit: string;
  base_item_quantity: number;
  package_item_name: string;
  package_item_unit: string;
  package_item_quantity: number;
}

interface Owner {
  id: number;
  username: string;
  full_name: string;
}

export default function InventoryScreen() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user } = useContext(AuthContext) as {
    user: { username: string; id: number } | null;
  };
  const { t } = useTranslation();
  const placeholderTextColor = useThemeColor({}, "placeholder");
  const params = useLocalSearchParams<{ openModal?: string }>();
  const deviceType = useBreakpoint();
  const { notificationSettings } = useNotifications();
  useDocumentTitle("Inventory - Hein Pharmacy");
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Filter states
  const [filterOwner, setFilterOwner] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // Sort states
  type SortOption =
    | "name"
    | "stock_asc"
    | "stock_desc"
    | "price_asc"
    | "price_desc"
    | "expiry_asc"
    | "expiry_desc"
    | "recent";
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const sortOptions: { label: string; value: SortOption }[] = [
    { label: t("Name (A-Z)"), value: "name" },
    { label: t("Stock (Low to High)"), value: "stock_asc" },
    { label: t("Stock (High to Low)"), value: "stock_desc" },
    { label: t("Price (Low to High)"), value: "price_asc" },
    { label: t("Price (High to Low)"), value: "price_desc" },
    { label: t("Expiry Date (Soonest First)"), value: "expiry_asc" },
    { label: t("Expiry Date (Latest First)"), value: "expiry_desc" },
    { label: t("Recently Added"), value: "recent" },
  ];
  const selectedSortLabel =
    sortOptions.find((option) => option.value === sortBy)?.label ||
    t("Name (A-Z)");

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingItems, setLoadingItems] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const LIMIT = 20;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    unit: "",
    quantity: "",
    unit_price: "",
    selling_price: "",
    minimum_stock: "",
    expiry_date: "",
    owner_id: "",
  });

  // Unit conversion states
  const [conversions, setConversions] = useState<UnitConversion[]>([]);
  const [showAddConversion, setShowAddConversion] = useState(false);
  const [conversionSearchQuery, setConversionSearchQuery] = useState("");
  const [conversionSearchResults, setConversionSearchResults] = useState<
    InventoryItem[]
  >([]);
  const [conversionSearchLoading, setConversionSearchLoading] = useState(false);
  const [selectedConversionItem, setSelectedConversionItem] =
    useState<InventoryItem | null>(null);
  const [conversionRole, setConversionRole] = useState<"base" | "package">(
    "base",
  );
  const [conversionRate, setConversionRate] = useState("");
  const [savingConversion, setSavingConversion] = useState(false);
  const [tempConversions, setTempConversions] = useState<any[]>([]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDaysUntilExpiry = (expiryDate?: string | null) => {
    if (!expiryDate) return null;

    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    // Handle various date formats more robustly
    let dateStr = expiryDate.trim();
    if (!dateStr.includes("T") && dateStr.includes("-")) {
      // YYYY-MM-DD -> YYYY-MM-DDT00:00:00 for local time parsing
      dateStr = `${dateStr}T00:00:00`;
    }

    const target = new Date(dateStr);

    if (Number.isNaN(target.getTime())) {
      return null;
    }

    // Set target to start of its day for accurate day counting
    const targetStartOfDay = new Date(
      target.getFullYear(),
      target.getMonth(),
      target.getDate(),
    );

    const diffMs = targetStartOfDay.getTime() - startOfToday.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const isInExpiryWindow = (expiryDate?: string | null) => {
    const daysUntilExpiry = getDaysUntilExpiry(expiryDate);
    if (daysUntilExpiry === null) return false;

    // Convert to number safely as it might come as a string from storage
    const daysBefore =
      notificationSettings?.expiryAlertDaysBefore !== undefined
        ? parseInt(String(notificationSettings.expiryAlertDaysBefore), 10)
        : 30;

    const safeDaysBefore = Number.isNaN(daysBefore)
      ? 30
      : Math.max(0, daysBefore);

    return daysUntilExpiry >= 0 && daysUntilExpiry <= safeDaysBefore;
  };

  const fetchItems = React.useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoadingItems(true);
        }
        // Don't show full-screen loading, only list loading indicators

        // Map sort options to server-side parameters
        const sortMapping: Record<
          SortOption,
          { sortBy: string; sortOrder: string }
        > = {
          name: { sortBy: "name", sortOrder: "ASC" },
          stock_asc: { sortBy: "quantity", sortOrder: "ASC" },
          stock_desc: { sortBy: "quantity", sortOrder: "DESC" },
          price_asc: { sortBy: "selling_price", sortOrder: "ASC" },
          price_desc: { sortBy: "selling_price", sortOrder: "DESC" },
          expiry_asc: { sortBy: "expiry_date", sortOrder: "ASC" },
          expiry_desc: { sortBy: "expiry_date", sortOrder: "DESC" },
          recent: { sortBy: "created_at", sortOrder: "DESC" },
        };

        const sortParams = sortMapping[sortBy];

        const params: any = {
          ...sortParams,
          page: pageNum,
          limit: LIMIT,
        };

        // Add search parameter
        if (searchQuery.trim()) {
          params.search = searchQuery.trim();
        }

        // Add filter parameters
        if (filterOwner) {
          params.owner_id = filterOwner;
        }

        if (filterCategory) {
          params.category = filterCategory;
        }

        const response = await inventoryAPI.getItems(params);
        const newItems = response.data.items || [];

        if (append) {
          setFilteredItems((prev) => [...prev, ...newItems]);
        } else {
          setFilteredItems(newItems);
        }

        setPage(pageNum);
        setTotalPages(response.data.pagination?.pages || 1);
        setRefreshing(false);
        setLoadingMore(false);
        setLoadingItems(false);
      } catch (error) {
        console.error("Error fetching items:", error);
        Alert.alert(t("Error"), t("Failed to fetch inventory items"));
        setRefreshing(false);
        setLoadingMore(false);
        setLoadingItems(false);
      }
    },
    [searchQuery, filterOwner, filterCategory, sortBy, t, LIMIT],
  );

  useEffect(() => {
    fetchOwners();
    fetchCategories();
  }, []);

  // Handle navigation parameter to open modal
  useEffect(() => {
    if (params.openModal === "true") {
      // Small delay to ensure owners and categories are loaded
      const timer = setTimeout(() => {
        openAddModal();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [params.openModal]);

  // Fetch items when filters or sort changes - reset to page 1
  useEffect(() => {
    setPage(1);
    fetchItems(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filterOwner, filterCategory, sortBy]);

  const fetchOwners = async () => {
    try {
      const response = await authAPI.getAllOwners();
      setOwners(response.data.owners || []);
    } catch (error) {
      console.error("Error fetching owners:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await inventoryAPI.getCategories();
      setCategories(response.data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchItems(1, false);
    fetchOwners();
    fetchCategories();
  };

  const handleLoadMore = () => {
    if (loadingMore || page >= totalPages) return;
    fetchItems(page + 1, true);
  };

  const openAddModal = () => {
    setSelectedItem(null);
    setFormData({
      name: "",
      description: "",
      category: "",
      unit: "",
      quantity: "",
      unit_price: "",
      selling_price: "",
      minimum_stock: "",
      expiry_date: "",
      owner_id: "",
    });
    setConversions([]);
    setTempConversions([]);
    resetConversionForm();
    setShowAddModal(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      category: item.category || "",
      unit: item.unit || "unit",
      quantity: Math.floor(Number(item.quantity)).toString(),
      unit_price: item.unit_price.toString(),
      selling_price: item.selling_price.toString(),
      minimum_stock: Math.floor(Number(item.minimum_stock)).toString(),
      expiry_date: item.expiry_date || "",
      owner_id: item.owner_id?.toString() || "",
    });
    setShowAddModal(true);
    fetchConversions(item.id);
  };

  const fetchConversions = async (itemId: number) => {
    try {
      const response = await unitConversionAPI.getConversions({
        item_id: itemId,
      });
      setConversions(response.data || []);
    } catch (error) {
      console.error("Error fetching conversions:", error);
    }
  };

  const searchConversionItems = async (query: string) => {
    if (!query.trim()) {
      setConversionSearchResults([]);
      return;
    }
    try {
      setConversionSearchLoading(true);
      const response = await inventoryAPI.getItems({
        search: query,
        limit: 10,
      });
      // Filter out the current item being edited
      const filtered = (response.data.items || []).filter(
        (item: InventoryItem) => item.id !== selectedItem?.id,
      );
      setConversionSearchResults(filtered);
    } catch (error) {
      console.error("Error searching items:", error);
    } finally {
      setConversionSearchLoading(false);
    }
  };

  const resetConversionForm = () => {
    setShowAddConversion(false);
    setConversionSearchQuery("");
    setConversionSearchResults([]);
    setSelectedConversionItem(null);
    setConversionRole("base");
    setConversionRate("");
  };

  const handleSaveConversion = async () => {
    if (!selectedConversionItem || !conversionRate) {
      Alert.alert(t("Error"), t("Please fill in all fields"));
      return;
    }

    const rate = parseFloat(conversionRate);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert(t("Error"), t("Conversion rate must be a positive number"));
      return;
    }

    const currentQty = selectedItem
      ? Number(selectedItem.quantity)
      : Number(formData.quantity || 0);
    const otherQty = Number(selectedConversionItem.quantity);
    const bothHaveStock = currentQty > 0 && otherQty > 0;

    const calculateSyncedQty = (source: "new" | "linked") => {
      if (source === "new") return currentQty.toString();

      const rate = parseFloat(conversionRate);
      if (conversionRole === "base") {
        // Current item is base, other is package: base qty = package qty * rate
        return Math.floor(otherQty * rate).toString();
      } else {
        // Current item is package, other is base: package qty = base qty / rate
        return Math.floor(otherQty / rate).toString();
      }
    };

    if (!selectedItem) {
      // We are creating a new item, save conversion to temp state
      if (bothHaveStock) {
        Alert.alert(
          t("Sync Quantities"),
          t(
            "Both items have existing stock. Which item's quantity should be used as the source to sync?",
          ),
          [
            {
              text: `${formData.name || t("New Item")} (${Math.floor(currentQty)} ${formData.unit || t("unit")})`,
              onPress: () => {
                setTempConversions([
                  ...tempConversions,
                  {
                    id: Date.now().toString(),
                    linkedItem: selectedConversionItem,
                    role: conversionRole,
                    rate: rate,
                    syncSource: "new",
                  },
                ]);
                resetConversionForm();
              },
            },
            {
              text: `${selectedConversionItem.name} (${Math.floor(otherQty)} ${selectedConversionItem.unit})`,
              onPress: () => {
                setFormData({
                  ...formData,
                  quantity: calculateSyncedQty("linked"),
                  expiry_date:
                    selectedConversionItem.expiry_date || formData.expiry_date,
                });
                setTempConversions([
                  ...tempConversions,
                  {
                    id: Date.now().toString(),
                    linkedItem: selectedConversionItem,
                    role: conversionRole,
                    rate: rate,
                    syncSource: "linked",
                  },
                ]);
                resetConversionForm();
              },
            },
            {
              text: t("Don't Sync"),
              style: "cancel",
              onPress: () => {
                setTempConversions([
                  ...tempConversions,
                  {
                    id: Date.now().toString(),
                    linkedItem: selectedConversionItem,
                    role: conversionRole,
                    rate: rate,
                    syncSource: "none",
                  },
                ]);
                resetConversionForm();
              },
            },
          ],
        );
      } else {
        const syncSource =
          currentQty > 0 ? "new" : otherQty > 0 ? "linked" : "none";

        if (syncSource === "linked") {
          setFormData({
            ...formData,
            quantity: calculateSyncedQty("linked"),
            expiry_date:
              selectedConversionItem.expiry_date || formData.expiry_date,
          });
        }

        setTempConversions([
          ...tempConversions,
          {
            id: Date.now().toString(),
            linkedItem: selectedConversionItem,
            role: conversionRole,
            rate: rate,
            syncSource: syncSource,
          },
        ]);
        resetConversionForm();
      }
      return;
    }

    // Determine base and package based on user choice
    // conversionRole = what the CURRENT item (selectedItem) is
    const baseItemId =
      conversionRole === "base" ? selectedItem.id : selectedConversionItem.id;
    const packageItemId =
      conversionRole === "package"
        ? selectedItem.id
        : selectedConversionItem.id;

    if (bothHaveStock) {
      // Ask user which quantity to use for sync
      Alert.alert(
        t("Sync Quantities"),
        t(
          "Both items have existing stock. Which item's quantity should be used as the source to sync?",
        ),
        [
          {
            text: `${selectedItem.name} (${Math.floor(currentQty)} ${selectedItem.unit})`,
            onPress: () =>
              doSaveConversion(
                baseItemId,
                packageItemId,
                rate,
                selectedItem.id,
              ),
          },
          {
            text: `${selectedConversionItem.name} (${Math.floor(otherQty)} ${selectedConversionItem.unit})`,
            onPress: () => {
              setFormData({
                ...formData,
                quantity: calculateSyncedQty("linked"),
                expiry_date:
                  selectedConversionItem.expiry_date || formData.expiry_date,
              });
              doSaveConversion(
                baseItemId,
                packageItemId,
                rate,
                selectedConversionItem.id,
              );
            },
          },
          {
            text: t("Don't Sync"),
            style: "cancel",
            onPress: () =>
              doSaveConversion(baseItemId, packageItemId, rate, undefined),
          },
        ],
      );
    } else {
      // Only one or neither has stock, auto-sync from the one that has stock
      const syncSource =
        currentQty > 0
          ? selectedItem.id
          : otherQty > 0
            ? selectedConversionItem.id
            : undefined;

      if (syncSource === selectedConversionItem.id) {
        setFormData({
          ...formData,
          quantity: calculateSyncedQty("linked"),
          expiry_date:
            selectedConversionItem.expiry_date || formData.expiry_date,
        });
      }

      await doSaveConversion(baseItemId, packageItemId, rate, syncSource);
    }
  };

  const doSaveConversion = async (
    baseItemId: number,
    packageItemId: number,
    rate: number,
    syncSourceItemId: number | undefined,
  ) => {
    try {
      setSavingConversion(true);
      await unitConversionAPI.createConversion({
        base_item_id: baseItemId,
        package_item_id: packageItemId,
        conversion_rate: rate,
        sync_source_item_id: syncSourceItemId,
      });
      Alert.alert(t("Success"), t("Unit conversion added successfully"));
      resetConversionForm();
      if (selectedItem) {
        fetchConversions(selectedItem.id);
        // Refresh items list since quantities may have changed
        fetchItems(1, false);
      }
    } catch (error: any) {
      Alert.alert(
        t("Error"),
        error.response?.data?.error || t("Failed to save conversion"),
      );
    } finally {
      setSavingConversion(false);
    }
  };

  const handleDeleteConversion = (conversion: UnitConversion) => {
    Alert.alert(
      t("Delete Conversion"),
      `${t("Are you sure you want to remove the conversion between")} ${conversion.base_item_name} ${t("and")} ${conversion.package_item_name}?`,
      [
        { text: t("Cancel"), style: "cancel" },
        {
          text: t("Delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await unitConversionAPI.deleteConversion(conversion.id);
              if (selectedItem) fetchConversions(selectedItem.id);
            } catch {
              Alert.alert(t("Error"), t("Failed to delete conversion"));
            }
          },
        },
      ],
    );
  };

  const handleSubmit = async () => {
    if (
      !formData.name ||
      !formData.quantity ||
      !formData.unit_price ||
      !formData.selling_price
    ) {
      Alert.alert(t("Error"), t("Please fill in all required fields"));
      return;
    }

    if (!formData.owner_id) {
      Alert.alert(t("Error"), t("Please select an owner"));
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        unit: formData.unit,
        quantity: parseInt(formData.quantity),
        unit_price: parseFloat(formData.unit_price),
        selling_price: parseFloat(formData.selling_price),
        minimum_stock: parseInt(formData.minimum_stock || "0"),
        expiry_date: formData.expiry_date.trim()
          ? formData.expiry_date.trim()
          : null,
        owner_id: parseInt(formData.owner_id),
      };

      if (selectedItem) {
        await inventoryAPI.updateItem(selectedItem.id, payload);
        Alert.alert(t("Success"), t("Item updated successfully"));
      } else {
        const response = await inventoryAPI.createItem(payload);
        const newItemId = response.data.item.id;

        // Create temp conversions
        if (tempConversions.length > 0) {
          for (const conv of tempConversions) {
            const baseItemId =
              conv.role === "base" ? newItemId : conv.linkedItem.id;
            const packageItemId =
              conv.role === "package" ? newItemId : conv.linkedItem.id;

            let syncSourceItemId = undefined;
            if (conv.syncSource === "new") {
              syncSourceItemId = newItemId;
            } else if (conv.syncSource === "linked") {
              syncSourceItemId = conv.linkedItem.id;
            }

            try {
              await unitConversionAPI.createConversion({
                base_item_id: baseItemId,
                package_item_id: packageItemId,
                conversion_rate: conv.rate,
                sync_source_item_id: syncSourceItemId,
              });
            } catch (convError) {
              console.error("Error creating conversion:", convError);
              // We don't stop the process, just log it
            }
          }
        }

        Alert.alert(t("Success"), t("Item added successfully"));
      }

      setSubmitting(false);
      setShowAddModal(false);
      setPage(1);
      fetchItems(1, false);
      fetchCategories(); // Refresh categories in case a new one was added
    } catch (error: any) {
      setSubmitting(false);
      Alert.alert(
        t("Error"),
        error.response?.data?.error || t("Failed to save item"),
      );
    }
  };

  const handleDelete = (item: InventoryItem) => {
    Alert.alert(
      t("Delete Item"),
      `${t("Are you sure you want to delete")} ${item.name}?`,
      [
        { text: t("Cancel"), style: "cancel" },
        {
          text: t("Delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await inventoryAPI.deleteItem(item.id);
              Alert.alert(t("Success"), t("Item deleted successfully"));
              setPage(1);
              fetchItems(1, false);
            } catch {
              Alert.alert(t("Error"), t("Failed to delete item"));
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("Inventory")}</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>{t("+ Add Item")}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t("Search items...")}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={placeholderTextColor}
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterButtonText}>
            {showFilters ? t("Hide Filters") : t("Show Filters")}
          </Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>{t("Sort by")}</Text>
            <SearchableDropdown
              placeholder={t("Sort by")}
              options={sortOptions.map((option) => option.label)}
              selectedValue={selectedSortLabel}
              onValueChange={(value: string) => {
                const selectedSort = sortOptions.find(
                  (option) => option.label === value,
                )?.value;
                if (selectedSort) {
                  setSortBy(selectedSort);
                }
              }}
              allowNew={false}
            />
          </View>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>{t("Filter by Owner")}</Text>
            <OwnerSelector
              placeholder={t("All Owners")}
              options={[
                {
                  id: 0,
                  username: "all",
                  full_name: t("All Owners"),
                },
                ...owners,
              ]}
              selectedValue={filterOwner || "0"}
              onValueChange={(value: string) =>
                setFilterOwner(value === "0" ? "" : value)
              }
            />
          </View>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>{t("Filter by Category")}</Text>
            <SearchableDropdown
              placeholder={t("All Categories")}
              options={categories}
              selectedValue={filterCategory}
              onValueChange={setFilterCategory}
              allowNew={false}
            />
          </View>
          {(filterOwner || filterCategory) && (
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={() => {
                setFilterOwner("");
                setFilterCategory("");
              }}
            >
              <Text style={styles.clearFiltersText}>{t("Clear Filters")}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {loadingItems ? (
        <ActivityIndicator
          size="large"
          color="#2196F3"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={filteredItems}
          numColumns={
            deviceType === "desktop" || deviceType === "largeDesktop" ? 2 : 1
          }
          key={
            deviceType === "desktop" || deviceType === "largeDesktop"
              ? "desktop"
              : "mobile"
          }
          renderItem={({ item }) => {
            const isLowStock = item.quantity <= item.minimum_stock;
            const isExpiringSoon = isInExpiryWindow(item.expiry_date);
            const daysUntilExpiry = getDaysUntilExpiry(item.expiry_date);

            return (
              <TouchableOpacity
                style={[
                  styles.itemCard,
                  isLowStock && isExpiringSoon
                    ? styles.lowStockAndExpiryCard
                    : isLowStock
                      ? styles.lowStockCard
                      : isExpiringSoon
                        ? styles.expiringSoonCard
                        : null,
                  (deviceType === "desktop" || deviceType === "largeDesktop") &&
                    styles.itemCardDesktop,
                ]}
                onPress={() => openEditModal(item)}
              >
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {isLowStock && (
                    <View style={styles.lowStockBadge}>
                      <Text style={styles.lowStockText}>{t("Low Stock")}</Text>
                    </View>
                  )}
                  {isExpiringSoon && (
                    <View style={styles.expiringSoonBadge}>
                      <Text style={styles.expiringSoonText}>
                        {t("Expiring Soon")}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.itemCategory}>{item.category}</Text>
                <Text style={styles.itemDescription}>{item.description}</Text>
                <View style={styles.itemDetails}>
                  <Text style={styles.detailText}>
                    {t("Qty:")} {Math.floor(Number(item.quantity))} {item.unit}
                  </Text>
                  <Text style={styles.detailText}>
                    {t("Price:")} {formatPrice(item.selling_price)}
                  </Text>
                  <Text style={styles.detailText}>
                    {t("Owner:")} {item.owner_name}
                  </Text>
                </View>
                {!!item.expiry_date && (
                  <Text style={styles.expiryText}>
                    {t("Expiry Date:")} {formatDate(item.expiry_date)}
                    {daysUntilExpiry !== null
                      ? ` (${daysUntilExpiry} ${t("day(s) left")})`
                      : ""}
                  </Text>
                )}
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openEditModal(item)}
                  >
                    <Text style={styles.editButtonText}>{t("Edit Item")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item)}
                  >
                    <Text style={styles.deleteButtonText}>
                      {t("Delete Item")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t("No items found")}</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                size="small"
                color="#2196F3"
                style={{ marginVertical: 20 }}
              />
            ) : null
          }
          contentContainerStyle={[
            styles.flatListContent,
            { paddingBottom: 70 },
          ]}
        />
      )}

      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {selectedItem ? t("Edit Item") : t("Add New Item")}
              </Text>

              <ScrollView>
                <OwnerSelector
                  placeholder={t("Select Owner")}
                  options={owners}
                  selectedValue={formData.owner_id}
                  onValueChange={(value: string) =>
                    setFormData({ ...formData, owner_id: value })
                  }
                />

                <TextInput
                  style={styles.input}
                  placeholder={t("Item Name *")}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholderTextColor={placeholderTextColor}
                />

                <SearchableDropdown
                  placeholder={t("Category *")}
                  options={categories}
                  selectedValue={formData.category}
                  onValueChange={(value: string) =>
                    setFormData({ ...formData, category: value })
                  }
                  allowNew={true}
                  onNewValueAdded={(newCategory: string) => {
                    setCategories([...categories, newCategory]);
                  }}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t("Unit *")}
                  value={formData.unit}
                  onChangeText={(text) =>
                    setFormData({ ...formData, unit: text })
                  }
                  placeholderTextColor={placeholderTextColor}
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={t("Description")}
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  placeholderTextColor={placeholderTextColor}
                  multiline
                  numberOfLines={3}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t("Quantity *")}
                  value={formData.quantity}
                  onChangeText={(text) =>
                    setFormData({ ...formData, quantity: text })
                  }
                  placeholderTextColor={placeholderTextColor}
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  placeholder={t("Unit Price *")}
                  value={formData.unit_price}
                  onChangeText={(text) =>
                    setFormData({ ...formData, unit_price: text })
                  }
                  placeholderTextColor={placeholderTextColor}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  style={styles.input}
                  placeholder={t("Selling Price *")}
                  value={formData.selling_price}
                  onChangeText={(text) =>
                    setFormData({ ...formData, selling_price: text })
                  }
                  placeholderTextColor={placeholderTextColor}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  style={styles.input}
                  placeholder={t("Minimum Stock")}
                  value={formData.minimum_stock}
                  onChangeText={(text) =>
                    setFormData({ ...formData, minimum_stock: text })
                  }
                  placeholderTextColor={placeholderTextColor}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: formData.expiry_date
                        ? "#333"
                        : placeholderTextColor,
                    }}
                  >
                    {formData.expiry_date
                      ? formatDate(formData.expiry_date)
                      : t("Expiry Date")}
                  </Text>
                </TouchableOpacity>

                {/* Unit Conversions Section */}
                <View style={ucStyles.sectionContainer}>
                  <View style={ucStyles.sectionHeader}>
                    <Text style={ucStyles.sectionTitle}>
                      {t("Unit Conversions")}
                    </Text>
                  </View>

                  <>
                    {/* Existing conversions list */}
                    {selectedItem && conversions.length > 0 ? (
                      conversions.map((conv) => {
                        const isCurrentBase =
                          conv.base_item_id === selectedItem.id;
                        return (
                          <View key={conv.id} style={ucStyles.conversionCard}>
                            <View style={ucStyles.conversionInfo}>
                              <Text style={ucStyles.conversionText}>
                                {conv.base_item_name} ({conv.base_item_unit})
                              </Text>
                              <Text style={ucStyles.conversionRate}>
                                × {Number(conv.conversion_rate)} = 1
                              </Text>
                              <Text style={ucStyles.conversionText}>
                                {conv.package_item_name} (
                                {conv.package_item_unit})
                              </Text>
                              <Text style={ucStyles.conversionHint}>
                                {isCurrentBase
                                  ? t("This item is the base unit")
                                  : t("This item is the package unit")}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={ucStyles.deleteConvBtn}
                              onPress={() => handleDeleteConversion(conv)}
                            >
                              <Text style={ucStyles.deleteConvBtnText}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })
                    ) : !selectedItem && tempConversions.length > 0 ? (
                      tempConversions.map((conv) => {
                        const isCurrentBase = conv.role === "base";
                        return (
                          <View key={conv.id} style={ucStyles.conversionCard}>
                            <View style={ucStyles.conversionInfo}>
                              <Text style={ucStyles.conversionText}>
                                {isCurrentBase
                                  ? formData.name || t("New Item")
                                  : conv.linkedItem.name}{" "}
                                (
                                {isCurrentBase
                                  ? formData.unit || "unit"
                                  : conv.linkedItem.unit}
                                )
                              </Text>
                              <Text style={ucStyles.conversionRate}>
                                × {Number(conv.rate)} = 1
                              </Text>
                              <Text style={ucStyles.conversionText}>
                                {!isCurrentBase
                                  ? formData.name || t("New Item")
                                  : conv.linkedItem.name}{" "}
                                (
                                {!isCurrentBase
                                  ? formData.unit || "unit"
                                  : conv.linkedItem.unit}
                                )
                              </Text>
                              <Text style={ucStyles.conversionHint}>
                                {isCurrentBase
                                  ? t("This item is the base unit")
                                  : t("This item is the package unit")}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={ucStyles.deleteConvBtn}
                              onPress={() => {
                                setTempConversions(
                                  tempConversions.filter(
                                    (c) => c.id !== conv.id,
                                  ),
                                );
                              }}
                            >
                              <Text style={ucStyles.deleteConvBtnText}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })
                    ) : (
                      <Text style={ucStyles.infoText}>
                        {t("No unit conversions yet.")}
                      </Text>
                    )}

                    {/* Add conversion form */}
                    {!showAddConversion ? (
                      <TouchableOpacity
                        style={ucStyles.addConvButton}
                        onPress={() => setShowAddConversion(true)}
                      >
                        <Text style={ucStyles.addConvButtonText}>
                          {t("+ Add Unit Conversion")}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={ucStyles.addConvForm}>
                        <Text style={ucStyles.formLabel}>
                          {t("Search for an item to link:")}
                        </Text>
                        <TextInput
                          style={styles.input}
                          placeholder={t("Search items...")}
                          value={conversionSearchQuery}
                          onChangeText={(text) => {
                            setConversionSearchQuery(text);
                            searchConversionItems(text);
                          }}
                          placeholderTextColor={placeholderTextColor}
                        />

                        {conversionSearchLoading && (
                          <ActivityIndicator size="small" color="#2196F3" />
                        )}

                        {conversionSearchResults.length > 0 &&
                          !selectedConversionItem && (
                            <View style={ucStyles.searchResults}>
                              {conversionSearchResults.map((item) => (
                                <TouchableOpacity
                                  key={item.id}
                                  style={ucStyles.searchResultItem}
                                  onPress={() => {
                                    setSelectedConversionItem(item);
                                    setConversionSearchResults([]);
                                    setConversionSearchQuery(item.name);
                                  }}
                                >
                                  <Text style={ucStyles.searchResultName}>
                                    {item.name}
                                  </Text>
                                  <Text style={ucStyles.searchResultDetail}>
                                    {item.unit} • {t("Stock:")}{" "}
                                    {Math.floor(Number(item.quantity))}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}

                        {selectedConversionItem && (
                          <>
                            <View style={ucStyles.selectedItemBadge}>
                              <Text style={ucStyles.selectedItemText}>
                                {selectedConversionItem.name} (
                                {selectedConversionItem.unit})
                              </Text>
                              <TouchableOpacity
                                onPress={() => {
                                  setSelectedConversionItem(null);
                                  setConversionSearchQuery("");
                                }}
                              >
                                <Text style={ucStyles.clearItemText}>✕</Text>
                              </TouchableOpacity>
                            </View>

                            <Text style={ucStyles.formLabel}>
                              {t("This item")} (
                              {selectedItem
                                ? selectedItem.name
                                : formData.name || t("New Item")}
                              ) {t("is the:")}
                            </Text>
                            <View style={ucStyles.roleToggle}>
                              <TouchableOpacity
                                style={[
                                  ucStyles.roleButton,
                                  conversionRole === "base" &&
                                    ucStyles.roleButtonActive,
                                ]}
                                onPress={() => setConversionRole("base")}
                              >
                                <Text
                                  style={[
                                    ucStyles.roleButtonText,
                                    conversionRole === "base" &&
                                      ucStyles.roleButtonTextActive,
                                  ]}
                                >
                                  {t("Base Unit")}
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  ucStyles.roleButton,
                                  conversionRole === "package" &&
                                    ucStyles.roleButtonActive,
                                ]}
                                onPress={() => setConversionRole("package")}
                              >
                                <Text
                                  style={[
                                    ucStyles.roleButtonText,
                                    conversionRole === "package" &&
                                      ucStyles.roleButtonTextActive,
                                  ]}
                                >
                                  {t("Package Unit")}
                                </Text>
                              </TouchableOpacity>
                            </View>

                            <Text style={ucStyles.formLabel}>
                              {conversionRole === "base"
                                ? t("How many of this item fit in 1 package?")
                                : t(
                                    "How many base units in 1 of this package?",
                                  )}
                            </Text>
                            <TextInput
                              style={styles.input}
                              placeholder={t("Enter rate")}
                              value={conversionRate}
                              onChangeText={setConversionRate}
                              keyboardType="decimal-pad"
                              placeholderTextColor={placeholderTextColor}
                            />

                            {conversionRate &&
                              parseFloat(conversionRate) > 0 && (
                                <Text style={ucStyles.previewText}>
                                  {conversionRole === "base"
                                    ? `${parseFloat(conversionRate)} ${selectedItem ? selectedItem.name : formData.name || t("New Item")} = 1 ${selectedConversionItem.name}`
                                    : `1 ${selectedItem ? selectedItem.name : formData.name || t("New Item")} = ${parseFloat(conversionRate)} ${selectedConversionItem.name}`}
                                </Text>
                              )}

                            <View style={ucStyles.convFormActions}>
                              <TouchableOpacity
                                style={ucStyles.convCancelBtn}
                                onPress={resetConversionForm}
                                disabled={savingConversion}
                              >
                                <Text style={ucStyles.convCancelBtnText}>
                                  {t("Cancel")}
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  ucStyles.convSaveBtn,
                                  savingConversion && { opacity: 0.6 },
                                ]}
                                onPress={handleSaveConversion}
                                disabled={savingConversion}
                              >
                                {savingConversion ? (
                                  <ActivityIndicator
                                    color="white"
                                    size="small"
                                  />
                                ) : (
                                  <Text style={ucStyles.convSaveBtnText}>
                                    {t("Save Conversion")}
                                  </Text>
                                )}
                              </TouchableOpacity>
                            </View>
                          </>
                        )}
                      </View>
                    )}
                  </>
                </View>
              </ScrollView>

              {showDatePicker && (
                <DateTimePicker
                  value={
                    formData.expiry_date
                      ? new Date(formData.expiry_date)
                      : new Date()
                  }
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    if (event.type === "set" && selectedDate) {
                      const formattedDate = selectedDate
                        .toISOString()
                        .split("T")[0];
                      setFormData({ ...formData, expiry_date: formattedDate });
                    }
                    setShowDatePicker(false);
                  }}
                />
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  <Text style={styles.cancelButtonText}>{t("Cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.saveButton,
                    submitting && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>{t("Save Item")}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 20,
    backgroundColor: "white",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  addButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: "white",
    fontWeight: "600",
  },
  searchContainer: {
    padding: 15,
    backgroundColor: "white",
  },
  searchInput: {
    backgroundColor: "#f5f5f5",
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
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  itemCard: {
    backgroundColor: "white",
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  itemCardDesktop: {
    flex: 0.48,
    marginHorizontal: 8,
  },
  lowStockCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#f44336",
  },
  expiringSoonCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#ff9800",
  },
  lowStockAndExpiryCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#9c27b0",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  lowStockBadge: {
    backgroundColor: "#f44336",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  lowStockText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  expiringSoonBadge: {
    backgroundColor: "#ff9800",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 6,
  },
  expiringSoonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  itemCategory: {
    fontSize: 14,
    color: "#2196F3",
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  itemDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: "#333",
  },
  expiryText: {
    fontSize: 13,
    color: "#ff9800",
    marginBottom: 10,
    fontWeight: "600",
  },
  itemActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  editButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  editButtonText: {
    color: "white",
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#f44336",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  deleteButtonText: {
    color: "white",
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
  },
  cancelButtonText: {
    color: "#333",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#2196F3",
  },
  saveButtonDisabled: {
    backgroundColor: "#9E9E9E",
    opacity: 0.7,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
  },
  fieldContainer: {
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
    fontWeight: "600",
  },
  picker: {
    marginHorizontal: 8,
  },
  pickerInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
    width: "100%",
  },
  filterButton: {
    backgroundColor: "#2196F3",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },
  filterButtonText: {
    color: "white",
    fontWeight: "600",
  },
  filtersContainer: {
    backgroundColor: "white",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  filterRow: {
    marginBottom: 15,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 5,
  },
  filterPickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
  },
  filterPicker: {
    padding: 12,
    fontSize: 16,
    color: "#333",
    width: "100%",
  },
  clearFiltersButton: {
    backgroundColor: "#f44336",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  clearFiltersText: {
    color: "white",
    fontWeight: "600",
  },
  pickerHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  manageButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  manageButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  ownerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  ownerName: {
    fontSize: 16,
    color: "#333",
  },
  deleteOwnerButton: {
    backgroundColor: "#f44336",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  deleteOwnerText: {
    color: "white",
    fontWeight: "600",
  },
  flatListContent: {
    paddingBottom: 20, // Base padding, additional padding added dynamically
  },
});

const ucStyles = StyleSheet.create({
  sectionContainer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 15,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  infoText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
    marginBottom: 10,
  },
  conversionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f7ff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#d0e4ff",
  },
  conversionInfo: {
    flex: 1,
  },
  conversionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  conversionRate: {
    fontSize: 13,
    color: "#2196F3",
    fontWeight: "bold",
    marginVertical: 2,
  },
  conversionHint: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  deleteConvBtn: {
    backgroundColor: "#f44336",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  deleteConvBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  addConvButton: {
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#90caf9",
    borderStyle: "dashed",
  },
  addConvButtonText: {
    color: "#1976D2",
    fontWeight: "600",
    fontSize: 14,
  },
  addConvForm: {
    backgroundColor: "#fafafa",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 6,
    marginTop: 8,
  },
  searchResults: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    maxHeight: 150,
    marginBottom: 8,
  },
  searchResultItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  searchResultDetail: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  selectedItemBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e9",
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#a5d6a7",
  },
  selectedItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#2e7d32",
  },
  clearItemText: {
    fontSize: 16,
    color: "#c62828",
    fontWeight: "bold",
    paddingHorizontal: 6,
  },
  roleToggle: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  roleButton: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  roleButtonActive: {
    backgroundColor: "#e3f2fd",
    borderColor: "#2196F3",
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  roleButtonTextActive: {
    color: "#1976D2",
  },
  roleHint: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
  },
  previewText: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "600",
    textAlign: "center",
    backgroundColor: "#f1f8e9",
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  convFormActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 8,
  },
  convCancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  convCancelBtnText: {
    color: "#333",
    fontWeight: "600",
  },
  convSaveBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#4CAF50",
  },
  convSaveBtnText: {
    color: "white",
    fontWeight: "600",
  },
});
