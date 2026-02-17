import React, { useState } from "react";
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface Owner {
  id: number;
  username: string;
  full_name: string;
}

interface OwnerSelectorProps {
  placeholder?: string;
  options: Owner[];
  selectedValue: string;
  onValueChange: (value: string) => void;
}

export default function OwnerSelector({
  placeholder = "Select Owner",
  options,
  selectedValue,
  onValueChange,
}: OwnerSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const selectedOwner = options.find(
    (owner) => owner.id.toString() === selectedValue,
  );

  const handleSelectOwner = (ownerId: number) => {
    onValueChange(ownerId.toString());
    setShowDropdown(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setShowDropdown(true)}
      >
        <Text
          style={[
            styles.selectButtonText,
            !selectedValue && styles.placeholderText,
          ]}
        >
          {selectedOwner?.full_name || placeholder}
        </Text>
        <Text style={styles.arrowIcon}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => setShowDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowDropdown(false)}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.dropdownWrapper}
          >
            <Pressable style={styles.dropdownContainer}>
              {/* Options List */}
              <ScrollView
                style={styles.optionsList}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {options.length === 0 ? (
                  <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>
                      No owners available
                    </Text>
                  </View>
                ) : (
                  options.map((owner) => (
                    <TouchableOpacity
                      key={owner.id}
                      style={[
                        styles.option,
                        selectedValue === owner.id.toString() &&
                          styles.selectedOption,
                      ]}
                      onPress={() => handleSelectOwner(owner.id)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selectedValue === owner.id.toString() &&
                            styles.selectedOptionText,
                        ]}
                      >
                        {owner.full_name}
                      </Text>
                      {selectedValue === owner.id.toString() && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>

              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDropdown(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  selectButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "white",
  },
  selectButtonText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  placeholderText: {
    color: "#999",
  },
  arrowIcon: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dropdownWrapper: {
    width: "100%",
  },
  dropdownContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    minHeight: 150,
    maxHeight: "80%",
    width: "100%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  optionsList: {
    flexGrow: 1,
    minHeight: 100,
    maxHeight: 300,
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectedOption: {
    backgroundColor: "#e3f2fd",
  },
  optionText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  selectedOptionText: {
    fontWeight: "600",
    color: "#2196F3",
  },
  checkmark: {
    fontSize: 18,
    color: "#2196F3",
    marginLeft: 8,
  },
  noResultsContainer: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  noResultsText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
  closeButton: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingHorizontal: 15,
    paddingVertical: 12,
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2196F3",
  },
});
