/**
 * Web implementation using localStorage with encryption fallback
 * For web, we use localStorage with base64 encoding for basic obfuscation
 * In production, consider adding proper encryption for sensitive data
 */

const encode = (value: string): string => {
  try {
    return btoa(value);
  } catch (error) {
    console.error('Error encoding value:', error);
    return value;
  }
};

const decode = (value: string): string => {
  try {
    return atob(value);
  } catch (error) {
    console.error('Error decoding value:', error);
    return value;
  }
};

export const getItemAsync = async (key: string): Promise<string | null> => {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return null;
    return decode(item);
  } catch (error) {
    console.error(`Error getting item ${key}:`, error);
    return null;
  }
};

export const setItemAsync = async (key: string, value: string): Promise<void> => {
  try {
    const encodedValue = encode(value);
    localStorage.setItem(key, encodedValue);
  } catch (error) {
    console.error(`Error setting item ${key}:`, error);
    throw error;
  }
};

export const deleteItemAsync = async (key: string): Promise<void> => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error deleting item ${key}:`, error);
    throw error;
  }
};
