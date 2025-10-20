import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useThemeColor } from '../hooks/use-theme-color';

interface SearchableDropdownProps {
  placeholder?: string;
  options: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  allowNew?: boolean;
  onNewValueAdded?: (value: string) => void;
}

export default function SearchableDropdown({
  placeholder = 'Search or type...',
  options,
  selectedValue,
  onValueChange,
  allowNew = true,
  onNewValueAdded,
}: SearchableDropdownProps) {
  const { t } = useTranslation();
  const placeholderTextColor = useThemeColor({}, 'placeholder');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchText, setSearchText] = useState('');

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSelectOption = (option: string) => {
    onValueChange(option);
    setSearchText('');
    setShowDropdown(false);
  };

  const handleAddNew = () => {
    if (searchText.trim() && !options.includes(searchText.trim())) {
      const newValue = searchText.trim();
      onValueChange(newValue);
      onNewValueAdded?.(newValue);
      setSearchText('');
      setShowDropdown(false);
    }
  };

  const isNewValueValid = allowNew && searchText.trim() && !options.includes(searchText.trim());

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setShowDropdown(true)}
      >
        <Text style={[styles.selectButtonText, !selectedValue && styles.placeholderText]}>
          {selectedValue || placeholder}
        </Text>
        <Text style={styles.arrowIcon}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            {/* Search Input */}
            <TextInput
              style={styles.searchInput}
              placeholder={placeholder}
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
              placeholderTextColor={placeholderTextColor}
            />

            {/* Add New Option Button */}
            {isNewValueValid && (
              <TouchableOpacity
                style={styles.addNewOption}
                onPress={handleAddNew}
              >
                <Text style={styles.addNewOptionText}>
                  {`+ ${t('Add as new option')}`}
                </Text>
              </TouchableOpacity>
            )}

            {/* Options List */}
            <ScrollView style={styles.optionsList} nestedScrollEnabled>
              {filteredOptions.length === 0 && searchText.trim() && !isNewValueValid ? (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsText}>{t('No matching options')}</Text>
                  {allowNew && (
                    <Text style={styles.noResultsSubtext}>
                      {t('Type to add a new category')}
                    </Text>
                  )}
                </View>
              ) : filteredOptions.length === 0 && !searchText.trim() ? (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsText}>{t('No options available')}</Text>
                </View>
              ) : (
                filteredOptions.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.option,
                      selectedValue === option && styles.selectedOption,
                    ]}
                    onPress={() => handleSelectOption(option)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedValue === option && styles.selectedOptionText,
                      ]}
                    >
                      {option}
                    </Text>
                    {selectedValue === option && (
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
              <Text style={styles.closeButtonText}>{t('Close')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  arrowIcon: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: '80%',
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  addNewOption: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  addNewOptionText: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '600',
  },
  optionsList: {
    maxHeight: 300,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedOption: {
    backgroundColor: '#e3f2fd',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  selectedOptionText: {
    fontWeight: '600',
    color: '#2196F3',
  },
  checkmark: {
    fontSize: 18,
    color: '#2196F3',
    marginLeft: 8,
  },
  noResultsContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#bbb',
    textAlign: 'center',
    marginTop: 8,
  },
  closeButton: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingHorizontal: 15,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
});
