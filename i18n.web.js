import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Get stored language or fallback to device language (web version)
const getInitialLanguage = () => {
  try {
    if (typeof window !== 'undefined') {
      const storedLanguage = localStorage.getItem('userLanguage');
      if (storedLanguage) {
        return storedLanguage;
      }
    }
  } catch (error) {
    console.error('Error getting stored language:', error);
  }
  return Localization.getLocales()[0]?.languageCode || 'en';
};

// Function to change language and persist it
export const changeLanguage = async (language) => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('userLanguage', language);
    }
    await i18n.changeLanguage(language);
  } catch (error) {
    console.error('Error changing language:', error);
  }
};

// Translation resources
const resources = {
  en: {
    translation: {
      // Common
      'Welcome': 'Welcome',
      'Dashboard': 'Dashboard',
      'Inventory': 'Inventory',
      'Sales': 'Sales',
      'Income': 'Income',
      'Profile': 'Profile',
      'Explore': 'Explore',
      'Settings': 'Settings',
      'Logout': 'Logout',
      'Login': 'Login',
      'Username': 'Username',
      'Password': 'Password',
      'Remember Me': 'Remember Me',
      'Forgot Password?': 'Forgot Password?',
      'Sign In': 'Sign In',
      'Save': 'Save',
      'Cancel': 'Cancel',
      'Done': 'Done',
      'Edit': 'Edit',
      'Delete': 'Delete',
      'Add': 'Add',
      'Search': 'Search',
      'Filter': 'Filter',
      'Sort': 'Sort',
      'Reset': 'Reset',
      'Apply': 'Apply',
      'All': 'All',
      'Today': 'Today',
      'Yesterday': 'Yesterday',
      'This Week': 'This Week',
      'This Month': 'This Month',
      'Custom': 'Custom',
      'From': 'From',
      'To': 'To',
      'Success': 'Success',
      'Error': 'Error',
      'Warning': 'Warning',
      'Info': 'Info',
      'Loading': 'Loading',
      'No data available': 'No data available',
      'Try again': 'Try again',
      
      // Dashboard
      'Total Sales': 'Total Sales',
      'Total Income': 'Total Income',
      'Total Items': 'Total Items',
      'Low Stock Items': 'Low Stock Items',
      'Sales Today': 'Sales Today',
      'Recent Sales': 'Recent Sales',
      'View All': 'View All',
      
      // Inventory
      'Item Name': 'Item Name',
      'Item Code': 'Item Code',
      'Category': 'Category',
      'Quantity': 'Quantity',
      'Unit Price': 'Unit Price',
      'Selling Price': 'Selling Price',
      'Stock Status': 'Stock Status',
      'In Stock': 'In Stock',
      'Low Stock': 'Low Stock',
      'Out of Stock': 'Out of Stock',
      'Add Item': 'Add Item',
      'Edit Item': 'Edit Item',
      'Delete Item': 'Delete Item',
      'Item Details': 'Item Details',
      'Unit': 'Unit',
      'Minimum Stock': 'Minimum Stock',
      'Expiry Date': 'Expiry Date',
      
      // Sales
      'Sale ID': 'Sale ID',
      'Customer Name': 'Customer Name',
      'Sale Date': 'Sale Date',
      'Total Amount': 'Total Amount',
      'Payment Method': 'Payment Method',
      'Cash': 'Cash',
      'Card': 'Card',
      'Mobile Banking': 'Mobile Banking',
      'Other': 'Other',
      'Add Sale': 'Add Sale',
      'Sale Details': 'Sale Details',
      'Items Sold': 'Items Sold',
      'Subtotal': 'Subtotal',
      'Discount': 'Discount',
      'Tax': 'Tax',
      'Grand Total': 'Grand Total',
      
      // Income
      'Income Summary': 'Income Summary',
      'Daily Income': 'Daily Income',
      'Weekly Income': 'Weekly Income',
      'Monthly Income': 'Monthly Income',
      'Income by Category': 'Income by Category',
      'Income Trend': 'Income Trend',
      'All Records': 'All Records',
      
      // Profile
      'Edit Profile': 'Edit Profile',
      'Change Password': 'Change Password',
      'Full Name': 'Full Name',
      'Email': 'Email',
      'Phone': 'Phone',
      'Address': 'Address',
      'Current Password': 'Current Password',
      'New Password': 'New Password',
      'Confirm Password': 'Confirm Password',
      'Update Profile': 'Update Profile',
      'Update Password': 'Update Password',
      'Manage Owners': 'Manage Owners',
      'Add Owner': 'Add Owner',
      'Owner Name': 'Owner Name',
      'Owner Email': 'Owner Email',
      'Owner Phone': 'Owner Phone',
      
      // Settings
      'General Settings': 'General Settings',
      'Notifications': 'Notifications',
      'Language': 'Language',
      'Theme': 'Theme',
      'Light': 'Light',
      'Dark': 'Dark',
      'Auto': 'Auto',
      'Enable Notifications': 'Enable Notifications',
      'Enable Low Stock Alerts': 'Enable Low Stock Alerts',
      'Enable Sales Notifications': 'Enable Sales Notifications',
      'Alert Time': 'Alert Time',
      'Terms and Conditions': 'Terms and Conditions',
      'Privacy Policy': 'Privacy Policy',
      'About': 'About',
      'Version': 'Version',
      
      // Error messages
      'Invalid credentials': 'Invalid credentials',
      'Login failed': 'Login failed',
      'Something went wrong': 'Something went wrong',
      'Please try again': 'Please try again',
      'Required field': 'Required field',
      'Invalid email': 'Invalid email',
      'Password too short': 'Password too short',
      'Passwords do not match': 'Passwords do not match',
      
      // Success messages
      'Profile updated successfully': 'Profile updated successfully',
      'Password changed successfully': 'Password changed successfully',
      'Item added successfully': 'Item added successfully',
      'Item updated successfully': 'Item updated successfully',
      'Item deleted successfully': 'Item deleted successfully',
      'Sale recorded successfully': 'Sale recorded successfully',
      'Settings saved successfully': 'Settings saved successfully',
      'Notification settings updated successfully': 'Notification settings updated successfully',
      
      // Notifications
      'Get notified when items are running low': 'Get notified when items are running low',
      'Get notified about daily sales': 'Get notified about daily sales',
      'Daily low stock notifications will be sent at this time': 'Daily low stock notifications will be sent at this time',
      'rounded to nearest 10 minutes': 'rounded to nearest 10 minutes',
      'Time Adjusted': 'Time Adjusted',
      'Notification time has been rounded to the nearest 10-minute interval.': 'Notification time has been rounded to the nearest 10-minute interval.',
      'Permissions Required': 'Permissions Required',
      'Please enable notifications in your device settings to receive alerts.': 'Please enable notifications in your device settings to receive alerts.',
      'Note: Push notifications are not supported on web. Configure these settings on the mobile app.': 'Note: Push notifications are not supported on web. Configure these settings on the mobile app.',
    }
  },
  my: {
    translation: {
      // Add Myanmar translations here
      'Welcome': 'ကြိုဆိုပါတယ်',
      'Dashboard': 'ထိန်းချုပ်ခန်း',
      'Inventory': 'စာရင်း',
      'Sales': 'ရောင်းချမှု',
      'Income': 'ဝင်ငွေ',
      'Profile': 'ကိုယ်ရေးအချက်အလက်',
      // ... add more Myanmar translations
    }
  }
};

// Initialize i18n
const initializeI18n = () => {
  const initialLanguage = getInitialLanguage();
  
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: initialLanguage,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false, // Important for web SSR
      }
    });
};

initializeI18n();

export default i18n;
