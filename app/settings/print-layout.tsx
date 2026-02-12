import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { usePrintLayout } from "../../contexts/PrintLayoutContext";
import { DEFAULT_PRINT_LAYOUT } from "../../types/printLayout";

interface NumberInputRowProps {
  label: string;
  value: number;
  defaultValue: number;
  onValueChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  decimals?: number;
  isPercent?: boolean;
}

const NumberInputRow: React.FC<NumberInputRowProps> = ({
  label,
  value,
  defaultValue,
  onValueChange,
  step = 1,
  min = 0,
  max = 1000,
  decimals = 0,
  isPercent = false,
}) => {
  const formatValue = (v: number) =>
    isPercent ? (v * 100).toFixed(decimals) + "%" : v.toFixed(decimals);

  const handleIncrement = () => {
    const newValue = Math.min(max, value + step);
    onValueChange(Number(newValue.toFixed(decimals)));
  };

  const handleDecrement = () => {
    const newValue = Math.max(min, value - step);
    onValueChange(Number(newValue.toFixed(decimals)));
  };

  const handleTextChange = (text: string) => {
    let parsed: number;
    if (isPercent && text.endsWith("%")) {
      parsed = parseFloat(text.slice(0, -1)) / 100;
    } else {
      parsed = parseFloat(text);
    }
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onValueChange(Number(clamped.toFixed(decimals)));
    }
  };

  const isDefault = value === defaultValue;

  return (
    <View style={styles.inputRow}>
      <View style={styles.labelContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        {!isDefault && (
          <TouchableOpacity onPress={() => onValueChange(defaultValue)}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.inputControls}>
        <TouchableOpacity style={styles.stepButton} onPress={handleDecrement}>
          <Ionicons name="remove" size={20} color="#666" />
        </TouchableOpacity>
        <TextInput
          style={styles.numberInput}
          value={formatValue(value)}
          onChangeText={handleTextChange}
          keyboardType="numeric"
          selectTextOnFocus
        />
        <TouchableOpacity style={styles.stepButton} onPress={handleIncrement}>
          <Ionicons name="add" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function PrintLayoutSettingsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const {
    config,
    isLoading,
    updateConfigValue,
    resetToDefault,
    applyPreset,
    getPresetNames,
    exportConfig,
    importConfig,
  } = usePrintLayout();

  const [importModalVisible, setImportModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [importText, setImportText] = useState("");
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    general: true,
    fontSizes: false,
    columnWidths: false,
    margins: false,
    lineHeights: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleExport = () => {
    setExportModalVisible(true);
  };

  const handleImport = async () => {
    const success = await importConfig(importText);
    if (success) {
      setImportModalVisible(false);
      setImportText("");
      Alert.alert(
        t("Success"),
        t("Print layout configuration imported successfully."),
      );
    } else {
      Alert.alert(
        t("Error"),
        t("Failed to import configuration. Please check the format."),
      );
    }
  };

  const handleReset = () => {
    Alert.alert(
      t("Reset to Default"),
      t("Are you sure you want to reset all print layout settings to default?"),
      [
        { text: t("Cancel"), style: "cancel" },
        { text: t("Reset"), style: "destructive", onPress: resetToDefault },
      ],
    );
  };

  const handleApplyPreset = (presetName: string) => {
    Alert.alert(
      t("Apply Preset"),
      t("This will replace all current settings with the {{preset}} preset.", {
        preset: presetName,
      }),
      [
        { text: t("Cancel"), style: "cancel" },
        { text: t("Apply"), onPress: () => applyPreset(presetName) },
      ],
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>{t("Loading...")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const SectionHeader: React.FC<{ title: string; section: string }> = ({
    title,
    section,
  }) => (
    <TouchableOpacity
      style={styles.sectionHeader}
      onPress={() => toggleSection(section)}
    >
      <Text style={styles.sectionTitle}>{title}</Text>
      <Ionicons
        name={expandedSections[section] ? "chevron-up" : "chevron-down"}
        size={20}
        color="#666"
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollView,
          { paddingBottom: Math.max(insets.bottom, 20) },
        ]}
      >
        {/* Presets Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleStatic}>{t("Presets")}</Text>
          <View style={styles.presetButtons}>
            {getPresetNames().map((presetName) => (
              <TouchableOpacity
                key={presetName}
                style={styles.presetButton}
                onPress={() => handleApplyPreset(presetName)}
              >
                <Text style={styles.presetButtonText}>
                  {presetName.charAt(0).toUpperCase() + presetName.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* General Settings */}
        <View style={styles.section}>
          <SectionHeader title={t("General Settings")} section="general" />
          {expandedSections.general && (
            <View style={styles.sectionContent}>
              <NumberInputRow
                label={t("Paper Width (dots)")}
                value={config.paperWidth}
                defaultValue={DEFAULT_PRINT_LAYOUT.paperWidth}
                onValueChange={(v) => updateConfigValue("paperWidth", v)}
                step={16}
                min={200}
                max={1000}
              />
              <NumberInputRow
                label={t("Scale Factor")}
                value={config.scale}
                defaultValue={DEFAULT_PRINT_LAYOUT.scale}
                onValueChange={(v) => updateConfigValue("scale", v)}
                step={1}
                min={1}
                max={5}
              />
              <NumberInputRow
                label={t("Padding Base")}
                value={config.paddingBase}
                defaultValue={DEFAULT_PRINT_LAYOUT.paddingBase}
                onValueChange={(v) => updateConfigValue("paddingBase", v)}
                step={1}
                min={0}
                max={50}
              />
            </View>
          )}
        </View>

        {/* Font Sizes */}
        <View style={styles.section}>
          <SectionHeader title={t("Font Sizes")} section="fontSizes" />
          {expandedSections.fontSizes && (
            <View style={styles.sectionContent}>
              <NumberInputRow
                label={t("Store Name")}
                value={config.fontSizes.storeName}
                defaultValue={DEFAULT_PRINT_LAYOUT.fontSizes.storeName}
                onValueChange={(v) =>
                  updateConfigValue("fontSizes.storeName", v)
                }
                step={2}
                min={20}
                max={80}
              />
              <NumberInputRow
                label={t("Store Info")}
                value={config.fontSizes.storeInfo}
                defaultValue={DEFAULT_PRINT_LAYOUT.fontSizes.storeInfo}
                onValueChange={(v) =>
                  updateConfigValue("fontSizes.storeInfo", v)
                }
                step={1}
                min={10}
                max={40}
              />
              <NumberInputRow
                label={t("Section Title")}
                value={config.fontSizes.sectionTitle}
                defaultValue={DEFAULT_PRINT_LAYOUT.fontSizes.sectionTitle}
                onValueChange={(v) =>
                  updateConfigValue("fontSizes.sectionTitle", v)
                }
                step={1}
                min={10}
                max={40}
              />
              <NumberInputRow
                label={t("Normal Text")}
                value={config.fontSizes.normal}
                defaultValue={DEFAULT_PRINT_LAYOUT.fontSizes.normal}
                onValueChange={(v) => updateConfigValue("fontSizes.normal", v)}
                step={1}
                min={10}
                max={40}
              />
              <NumberInputRow
                label={t("Small Text")}
                value={config.fontSizes.small}
                defaultValue={DEFAULT_PRINT_LAYOUT.fontSizes.small}
                onValueChange={(v) => updateConfigValue("fontSizes.small", v)}
                step={1}
                min={8}
                max={30}
              />
              <NumberInputRow
                label={t("Total Amount")}
                value={config.fontSizes.total}
                defaultValue={DEFAULT_PRINT_LAYOUT.fontSizes.total}
                onValueChange={(v) => updateConfigValue("fontSizes.total", v)}
                step={2}
                min={16}
                max={50}
              />
            </View>
          )}
        </View>

        {/* Column Widths */}
        <View style={styles.section}>
          <SectionHeader
            title={t("Column Widths (%)")}
            section="columnWidths"
          />
          {expandedSections.columnWidths && (
            <View style={styles.sectionContent}>
              <Text style={styles.hintText}>
                {t("Total: {{total}}%", {
                  total: Math.round(
                    (config.columnWidths.name +
                      config.columnWidths.unit +
                      config.columnWidths.quantity +
                      config.columnWidths.price +
                      config.columnWidths.total) *
                      100,
                  ),
                })}
              </Text>
              <NumberInputRow
                label={t("Item Name")}
                value={config.columnWidths.name}
                defaultValue={DEFAULT_PRINT_LAYOUT.columnWidths.name}
                onValueChange={(v) => updateConfigValue("columnWidths.name", v)}
                step={0.01}
                min={0.1}
                max={0.7}
                decimals={2}
                isPercent={true}
              />
              <NumberInputRow
                label={t("Quantity")}
                value={config.columnWidths.quantity}
                defaultValue={DEFAULT_PRINT_LAYOUT.columnWidths.quantity}
                onValueChange={(v) =>
                  updateConfigValue("columnWidths.quantity", v)
                }
                step={0.01}
                min={0.05}
                max={0.3}
                decimals={2}
                isPercent={true}
              />
              <NumberInputRow
                label={t("Unit")}
                value={config.columnWidths.unit}
                defaultValue={DEFAULT_PRINT_LAYOUT.columnWidths.unit}
                onValueChange={(v) => updateConfigValue("columnWidths.unit", v)}
                step={0.01}
                min={0.05}
                max={0.3}
                decimals={2}
                isPercent={true}
              />
              <NumberInputRow
                label={t("Price")}
                value={config.columnWidths.price}
                defaultValue={DEFAULT_PRINT_LAYOUT.columnWidths.price}
                onValueChange={(v) =>
                  updateConfigValue("columnWidths.price", v)
                }
                step={0.01}
                min={0.1}
                max={0.4}
                decimals={2}
                isPercent={true}
              />
              <NumberInputRow
                label={t("Total")}
                value={config.columnWidths.total}
                defaultValue={DEFAULT_PRINT_LAYOUT.columnWidths.total}
                onValueChange={(v) =>
                  updateConfigValue("columnWidths.total", v)
                }
                step={0.01}
                min={0.1}
                max={0.4}
                decimals={2}
                isPercent={true}
              />
            </View>
          )}
        </View>

        {/* Margins */}
        <View style={styles.section}>
          <SectionHeader title={t("Margins")} section="margins" />
          {expandedSections.margins && (
            <View style={styles.sectionContent}>
              <NumberInputRow
                label={t("Divider Vertical")}
                value={config.margins.dividerVertical}
                defaultValue={DEFAULT_PRINT_LAYOUT.margins.dividerVertical}
                onValueChange={(v) =>
                  updateConfigValue("margins.dividerVertical", v)
                }
                step={1}
                min={0}
                max={30}
              />
              <NumberInputRow
                label={t("Info Section")}
                value={config.margins.infoSection}
                defaultValue={DEFAULT_PRINT_LAYOUT.margins.infoSection}
                onValueChange={(v) =>
                  updateConfigValue("margins.infoSection", v)
                }
                step={1}
                min={0}
                max={20}
              />
              <NumberInputRow
                label={t("Info Row")}
                value={config.margins.infoRow}
                defaultValue={DEFAULT_PRINT_LAYOUT.margins.infoRow}
                onValueChange={(v) => updateConfigValue("margins.infoRow", v)}
                step={1}
                min={0}
                max={15}
              />
              <NumberInputRow
                label={t("Items Header Bottom")}
                value={config.margins.itemsHeaderBottom}
                defaultValue={DEFAULT_PRINT_LAYOUT.margins.itemsHeaderBottom}
                onValueChange={(v) =>
                  updateConfigValue("margins.itemsHeaderBottom", v)
                }
                step={1}
                min={0}
                max={20}
              />
              <NumberInputRow
                label={t("Item Row")}
                value={config.margins.itemRow}
                defaultValue={DEFAULT_PRINT_LAYOUT.margins.itemRow}
                onValueChange={(v) => updateConfigValue("margins.itemRow", v)}
                step={1}
                min={0}
                max={15}
              />
              <NumberInputRow
                label={t("Total Row")}
                value={config.margins.totalRow}
                defaultValue={DEFAULT_PRINT_LAYOUT.margins.totalRow}
                onValueChange={(v) => updateConfigValue("margins.totalRow", v)}
                step={1}
                min={0}
                max={20}
              />
              <NumberInputRow
                label={t("Footer Top")}
                value={config.margins.footerTop}
                defaultValue={DEFAULT_PRINT_LAYOUT.margins.footerTop}
                onValueChange={(v) => updateConfigValue("margins.footerTop", v)}
                step={2}
                min={0}
                max={40}
              />
              <NumberInputRow
                label={t("Footer Bottom")}
                value={config.margins.footerBottom}
                defaultValue={DEFAULT_PRINT_LAYOUT.margins.footerBottom}
                onValueChange={(v) =>
                  updateConfigValue("margins.footerBottom", v)
                }
                step={5}
                min={0}
                max={100}
              />
            </View>
          )}
        </View>

        {/* Line Heights */}
        <View style={styles.section}>
          <SectionHeader title={t("Line Heights")} section="lineHeights" />
          {expandedSections.lineHeights && (
            <View style={styles.sectionContent}>
              <NumberInputRow
                label={t("Default")}
                value={config.lineHeights.default}
                defaultValue={DEFAULT_PRINT_LAYOUT.lineHeights.default}
                onValueChange={(v) =>
                  updateConfigValue("lineHeights.default", v)
                }
                step={0.1}
                min={1.0}
                max={2.0}
                decimals={1}
              />
              <NumberInputRow
                label={t("Item Name")}
                value={config.lineHeights.itemName}
                defaultValue={DEFAULT_PRINT_LAYOUT.lineHeights.itemName}
                onValueChange={(v) =>
                  updateConfigValue("lineHeights.itemName", v)
                }
                step={0.1}
                min={1.0}
                max={2.0}
                decimals={1}
              />
              <NumberInputRow
                label={t("Footer")}
                value={config.lineHeights.footer}
                defaultValue={DEFAULT_PRINT_LAYOUT.lineHeights.footer}
                onValueChange={(v) =>
                  updateConfigValue("lineHeights.footer", v)
                }
                step={0.1}
                min={1.0}
                max={2.0}
                decimals={1}
              />
            </View>
          )}
        </View>

        {/* Import/Export Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleStatic}>{t("Import / Export")}</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleExport}
            >
              <Ionicons name="copy-outline" size={20} color="#2196F3" />
              <Text style={styles.actionButtonText}>{t("Export Config")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setImportModalVisible(true)}
            >
              <Ionicons name="clipboard-outline" size={20} color="#2196F3" />
              <Text style={styles.actionButtonText}>
                {t("Import from Text")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reset Button */}
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Ionicons name="refresh-outline" size={20} color="#f44336" />
          <Text style={styles.resetButtonText}>
            {t("Reset All to Default")}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Import Modal */}
      <Modal
        visible={importModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setImportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("Import Configuration")}</Text>
            <Text style={styles.modalHint}>
              {t("Paste the JSON configuration below:")}
            </Text>
            <TextInput
              style={styles.importTextInput}
              value={importText}
              onChangeText={setImportText}
              multiline
              placeholder='{"paperWidth": 576, ...}'
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setImportModalVisible(false);
                  setImportText("");
                }}
              >
                <Text style={styles.modalButtonCancelText}>{t("Cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleImport}
              >
                <Text style={styles.modalButtonConfirmText}>{t("Import")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Export Modal */}
      <Modal
        visible={exportModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setExportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("Export Configuration")}</Text>
            <Text style={styles.modalHint}>
              {t("Copy the JSON configuration below:")}
            </Text>
            <TextInput
              style={styles.importTextInput}
              value={exportConfig()}
              multiline
              editable={false}
              selectTextOnFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={() => setExportModalVisible(false)}
              >
                <Text style={styles.modalButtonConfirmText}>{t("Done")}</Text>
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
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  scrollView: {
    padding: 16,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  sectionTitleStatic: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    padding: 16,
    paddingBottom: 8,
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
  },
  inputRow: {
    marginBottom: 12,
  },
  labelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 14,
    color: "#666",
  },
  resetText: {
    fontSize: 12,
    color: "#2196F3",
  },
  inputControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  numberInput: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 16,
    backgroundColor: "#fff",
  },
  hintText: {
    fontSize: 12,
    color: "#888",
    marginBottom: 12,
    fontStyle: "italic",
  },
  presetButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    paddingTop: 0,
    gap: 8,
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#e3f2fd",
    borderWidth: 1,
    borderColor: "#2196F3",
  },
  presetButtonText: {
    color: "#2196F3",
    fontSize: 14,
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#e3f2fd",
  },
  actionButtonText: {
    color: "#2196F3",
    fontSize: 14,
    fontWeight: "500",
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f44336",
    marginBottom: 20,
  },
  resetButtonText: {
    color: "#f44336",
    fontSize: 16,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  modalHint: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  importTextInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 150,
    textAlignVertical: "top",
    fontFamily: "monospace",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: "#f0f0f0",
  },
  modalButtonCancelText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
  modalButtonConfirm: {
    backgroundColor: "#2196F3",
  },
  modalButtonConfirmText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
});
