import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { AuthContext } from "../../contexts/AuthContext";
import { useThemeColor } from "../../hooks/use-theme-color";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { invoiceAPI } from "../../services/api";
import { uploadFile } from "../../utils/uploadFile";

interface InvoiceRecord {
  id: number;
  invoice_id: string;
  company_name: string;
  payment_method: "cash" | "credit";
  invoice_date: string;
  image_url: string;
  created_at: string;
}

interface SelectedImage {
  uri: string;
  name: string;
  type: string;
  file?: File;
}

export default function InvoicesScreen() {
  const { t } = useTranslation();
  const placeholderTextColor = useThemeColor({}, "placeholder");
  const params = useLocalSearchParams<{ openModal?: string }>();
  const { user } = useContext(AuthContext) as {
    user: { username?: string } | null;
  };

  useDocumentTitle("Invoices - Hein Pharmacy");

  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<
    number | null
  >(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 20;

  const [invoiceId, setInvoiceId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit">("cash");
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(
    null,
  );
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRecord | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const fetchInvoices = React.useCallback(
    async (pageNum = 1, append = false) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const response = await invoiceAPI.getInvoices({
          page: pageNum,
          limit: LIMIT,
          sortBy: "invoice_date",
          sortOrder: "DESC",
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        });

        const fetchedInvoices = response.data.invoices || [];
        const sortedInvoices = [...fetchedInvoices].sort(
          (a, b) =>
            new Date(b.invoice_date).getTime() -
            new Date(a.invoice_date).getTime(),
        );

        if (append) {
          setInvoices((prev) => [...prev, ...sortedInvoices]);
        } else {
          setInvoices(sortedInvoices);
        }

        setPage(pageNum);
        setTotalPages(response.data.pagination?.pages || 1);
      } catch (error: any) {
        Alert.alert(
          t("Error"),
          error?.response?.data?.error || t("Failed to fetch invoices"),
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [LIMIT, t, debouncedSearch],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    const shouldOpenModal = Array.isArray(params.openModal)
      ? params.openModal.includes("true")
      : params.openModal === "true";

    if (!shouldOpenModal) {
      return;
    }

    const timer = setTimeout(() => {
      setShowAddModal(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [params.openModal]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvoices(1, false);
  };

  const handleLoadMore = () => {
    if (loadingMore || loading || page >= totalPages) return;
    fetchInvoices(page + 1, true);
  };

  const getImageNameFromUri = (uri: string) => {
    const fileName = uri.split("/").pop();
    if (!fileName) {
      return `invoice-${Date.now()}.jpg`;
    }
    return fileName;
  };

  const pickImage = async () => {
    if (Platform.OS !== "web") {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("Permission needed"),
          t("Please allow photo library access to upload invoice images"),
        );
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      quality: 0.8,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    const asset = result.assets[0];
    const picked: SelectedImage = {
      uri: asset.uri,
      name: asset.fileName || getImageNameFromUri(asset.uri),
      type: asset.mimeType || "image/jpeg",
    };

    if (Platform.OS === "web" && "file" in asset && asset.file) {
      picked.file = asset.file;
    }

    setSelectedImage(picked);
  };

  const resetForm = () => {
    setInvoiceId("");
    setCompanyName("");
    setPaymentMethod("cash");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setSelectedImage(null);
    setEditingInvoice(null);
  };

  const handleEdit = (invoice: InvoiceRecord) => {
    setEditingInvoice(invoice);
    setInvoiceId(invoice.invoice_id);
    setCompanyName(invoice.company_name);
    setPaymentMethod(invoice.payment_method);
    setInvoiceDate(invoice.invoice_date.split("T")[0]);
    setSelectedImage(null);
    setShowAddModal(true);
  };

  const handleDelete = (invoice: InvoiceRecord) => {
    Alert.alert(
      t("Delete Invoice"),
      t("Are you sure you want to delete this invoice? This cannot be undone."),
      [
        { text: t("Cancel"), style: "cancel" },
        {
          text: t("Delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await invoiceAPI.deleteInvoice(invoice.id);
              fetchInvoices(1, false);
            } catch (error: any) {
              Alert.alert(
                t("Error"),
                error?.response?.data?.error || t("Failed to delete invoice"),
              );
            }
          },
        },
      ],
    );
  };

  const handleSubmit = async () => {
    const isEditing = !!editingInvoice;

    if (!invoiceId.trim() || !companyName.trim() || !invoiceDate) {
      Alert.alert(
        t("Error"),
        t("Please fill invoice ID, company name, payment, and date"),
      );
      return;
    }

    if (!isEditing && !selectedImage) {
      Alert.alert(t("Error"), t("Please select an invoice image"));
      return;
    }

    try {
      setSubmitting(true);

      let finalImageUrl = editingInvoice?.image_url ?? "";

      if (selectedImage) {
        const signedUrlResponse = await invoiceAPI.getUploadSignedUrl({
          filename: selectedImage.name,
          content_type: selectedImage.type,
        });

        const { signedUrl, imageUrl } = signedUrlResponse.data || {};

        if (!signedUrl || !imageUrl) {
          throw new Error(t("Failed to get upload URL"));
        }

        let uploadBody: Blob | File;
        if (Platform.OS === "web" && selectedImage.file) {
          uploadBody = selectedImage.file;
        } else {
          const imageResponse = await fetch(selectedImage.uri);
          uploadBody = await imageResponse.blob();
        }

        finalImageUrl =
          (await uploadFile(
            uploadBody,
            signedUrlResponse.data,
            selectedImage.type,
          )) || imageUrl;
      }

      const payload = {
        invoice_id: invoiceId.trim(),
        company_name: companyName.trim(),
        payment_method: paymentMethod,
        invoice_date: new Date(invoiceDate).toISOString(),
        image_url: finalImageUrl,
      };

      if (isEditing) {
        await invoiceAPI.updateInvoice(editingInvoice!.id, payload);
        Alert.alert(t("Success"), t("Invoice record updated successfully"), [
          {
            text: "OK",
            onPress: () => {
              setShowAddModal(false);
              resetForm();
              fetchInvoices(1, false);
            },
          },
        ]);
      } else {
        await invoiceAPI.createInvoice(payload);
        Alert.alert(t("Success"), t("Invoice record created successfully"), [
          {
            text: "OK",
            onPress: () => {
              setShowAddModal(false);
              resetForm();
              fetchInvoices(1, false);
            },
          },
        ]);
      }
    } catch (error: any) {
      Alert.alert(
        t("Error"),
        error?.response?.data?.error ||
          t(isEditing ? "Failed to update invoice record" : "Failed to create invoice record"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getFileExtensionFromUrl = (url: string) => {
    const cleanedUrl = url.split("?")[0];
    const extension = cleanedUrl.split(".").pop()?.toLowerCase();
    if (!extension || extension.length > 5) {
      return "jpg";
    }
    return extension;
  };

  const sanitizeFileName = (name: string) =>
    name.replace(/[^a-zA-Z0-9-_\.]+/g, "-").replace(/-+/g, "-");

  const handleDownloadInvoice = async (invoice: InvoiceRecord) => {
    try {
      setDownloadingInvoiceId(invoice.id);

      if (Platform.OS === "web") {
        const extension = getFileExtensionFromUrl(invoice.image_url);
        const suggestedName = sanitizeFileName(
          `${invoice.invoice_id}-${invoice.company_name}.${extension}`,
        );

        if (typeof document === "undefined") {
          await Linking.openURL(invoice.image_url);
          return;
        }

        const link = document.createElement("a");
        link.href = invoice.image_url;
        link.download = suggestedName;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(invoice.image_url, {
          dialogTitle: t("Download Invoice"),
          mimeType: "image/*",
          UTI: "public.image",
        });
      } else {
        await Linking.openURL(invoice.image_url);
      }
    } catch (error: any) {
      Alert.alert(
        t("Error"),
        error?.message || t("Failed to download invoice image"),
      );
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  if (user?.username !== "admin") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>{t("Invoices")}</Text>
          <Text style={styles.emptySubtitle}>
            {t("Only admin can access invoice records")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("Invoices")}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>{t("Add Invoice")}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t("Search by invoice ID or company")}
          placeholderTextColor={placeholderTextColor}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && Platform.OS !== "ios" ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <MaterialIcons name="close" size={18} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color="#2196F3" />
              </View>
            ) : (
              <View style={styles.listFooterSpacer} />
            )
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>{t("No invoices yet")}</Text>
              <Text style={styles.emptySubtitle}>
                {t("Tap Add Invoice to upload your first supplier invoice")}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.invoiceCard}>
              <View style={styles.invoiceHeader}>
                <Text style={styles.invoiceId}>{item.invoice_id}</Text>
                <View style={styles.invoiceHeaderRight}>
                  <Text style={styles.paymentBadge}>{item.payment_method}</Text>
                  <TouchableOpacity
                    style={styles.actionIconButton}
                    onPress={() => handleEdit(item)}
                  >
                    <MaterialIcons name="edit" size={18} color="#1565C0" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionIconButton, styles.deleteIconButton]}
                    onPress={() => handleDelete(item)}
                  >
                    <MaterialIcons name="delete-outline" size={18} color="#C62828" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.companyName}>{item.company_name}</Text>
              <Text style={styles.metaText}>
                {new Date(item.invoice_date).toLocaleDateString()}
              </Text>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setPreviewImageUrl(item.image_url)}
              >
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.invoiceImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <Modal
        visible={!!previewImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <View style={styles.imagePreviewOverlay}>
          <TouchableOpacity
            style={styles.imagePreviewCloseButton}
            onPress={() => setPreviewImageUrl(null)}
          >
            <MaterialIcons name="close" size={24} color="white" />
          </TouchableOpacity>

          {previewImageUrl ? (
            <Image
              source={{ uri: previewImageUrl }}
              style={styles.imagePreviewImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingInvoice ? t("Edit Invoice") : t("Add Invoice")}
              </Text>
            </View>

            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>{t("Invoice ID")} *</Text>
              <TextInput
                style={styles.input}
                value={invoiceId}
                onChangeText={setInvoiceId}
                placeholder={t("Enter invoice ID")}
                placeholderTextColor={placeholderTextColor}
              />

              <Text style={styles.label}>{t("Company Name")} *</Text>
              <TextInput
                style={styles.input}
                value={companyName}
                onChangeText={setCompanyName}
                placeholder={t("Enter supplier company")}
                placeholderTextColor={placeholderTextColor}
              />

              <Text style={styles.label}>{t("Payment Method")} *</Text>
              <View style={styles.paymentRow}>
                {(["cash", "credit"] as const).map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.paymentButton,
                      paymentMethod === method && styles.paymentButtonActive,
                    ]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text
                      style={[
                        styles.paymentButtonText,
                        paymentMethod === method &&
                          styles.paymentButtonTextActive,
                      ]}
                    >
                      {t(method.charAt(0).toUpperCase() + method.slice(1))}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>{t("Invoice Date")} *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {new Date(invoiceDate).toLocaleDateString()}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>
                {t("Invoice Image")} {editingInvoice ? "" : "*"}
              </Text>
              <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                <Text style={styles.imageButtonText}>
                  {selectedImage
                    ? t("Change Image")
                    : editingInvoice
                      ? t("Change Image")
                      : t("Pick Image")}
                </Text>
              </TouchableOpacity>
              {selectedImage ? (
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={styles.selectedImagePreview}
                  resizeMode="cover"
                />
              ) : editingInvoice?.image_url ? (
                <View>
                  <Text style={styles.selectedImageName}>
                    {t("Current image (tap to change)")}
                  </Text>
                  <Image
                    source={{ uri: editingInvoice.image_url }}
                    style={styles.selectedImagePreview}
                    resizeMode="cover"
                  />
                </View>
              ) : null}
            </ScrollView>

            {showDatePicker && (
              <DateTimePicker
                value={new Date(invoiceDate)}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  if (event.type === "set" && selectedDate) {
                    setInvoiceDate(selectedDate.toISOString().split("T")[0]);
                  }
                  setShowDatePicker(false);
                }}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
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
                  <Text style={styles.saveButtonText}>
                    {editingInvoice ? t("Update Invoice") : t("Save Invoice")}
                  </Text>
                )}
              </TouchableOpacity>
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
    backgroundColor: "white",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  addButton: {
    backgroundColor: "#2196F3",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addButtonText: {
    color: "white",
    fontWeight: "600",
  },
  loader: {
    marginTop: 40,
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  invoiceCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e6e6e6",
  },
  invoiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  invoiceHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  invoiceId: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
  },
  paymentBadge: {
    textTransform: "capitalize",
    fontSize: 12,
    color: "#1565C0",
    backgroundColor: "#E3F2FD",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: "hidden",
  },
  companyName: {
    fontSize: 15,
    color: "#333",
    marginBottom: 4,
  },
  metaText: {
    color: "#666",
    marginBottom: 10,
  },
  invoiceImage: {
    width: "100%",
    height: 220,
    borderRadius: 10,
    backgroundColor: "#F2F2F2",
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  imagePreviewCloseButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePreviewImage: {
    width: "100%",
    height: "85%",
  },
  downloadIconButton: {
    borderWidth: 1,
    borderColor: "#2E7D32",
    borderRadius: 999,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    width: "100%",
    maxWidth: 540,
    maxHeight: "90%",
    overflow: "hidden",
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
  },
  modalContent: {
    maxHeight: 500,
  },
  modalScrollContent: {
    padding: 20,
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#222",
    marginBottom: 8,
  },
  paymentRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  paymentButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "white",
  },
  paymentButtonActive: {
    borderColor: "#2196F3",
    backgroundColor: "#E3F2FD",
  },
  paymentButtonText: {
    color: "#555",
    fontWeight: "600",
  },
  paymentButtonTextActive: {
    color: "#1565C0",
  },
  dateButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  dateButtonText: {
    color: "#333",
    fontSize: 15,
  },
  imageButton: {
    borderWidth: 1,
    borderColor: "#2196F3",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 4,
  },
  imageButtonText: {
    color: "#2196F3",
    fontWeight: "600",
  },
  selectedImageName: {
    color: "#666",
    fontSize: 13,
    marginBottom: 8,
  },
  loadMoreContainer: {
    paddingVertical: 16,
    alignItems: "center",
  },
  listFooterSpacer: {
    height: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#222",
    paddingVertical: 0,
  },
  actionIconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E3F2FD",
  },
  deleteIconButton: {
    backgroundColor: "#FFEBEE",
  },
  selectedImagePreview: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    marginTop: 8,
    backgroundColor: "#F2F2F2",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F5F5F5",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#2196F3",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
  },
});
