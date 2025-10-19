import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5000/api";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.log('Error getting token:', error);
  }
  return config;
});

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, remove it
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('user');
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  validateToken: () => api.post('/auth/validate-token'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (userData) => api.put('/auth/profile', userData),
  changePassword: (passwordData) => api.put('/auth/change-password', passwordData),
  getAllOwners: () => api.get('/auth/owners'),
  createOwner: (ownerData) => api.post('/auth/owners', ownerData),
  updateOwner: (id, ownerData) => api.put(`/auth/owners/${id}`, ownerData),
  resetOwnerPassword: (id, passwordData) => api.put(`/auth/owners/${id}/reset-password`, passwordData),
  deleteOwner: (id) => api.delete(`/auth/owners/${id}`),
};

// Inventory API
export const inventoryAPI = {
  getItems: (params) => api.get('/inventory', { params }),
  getItem: (id) => api.get(`/inventory/${id}`),
  createItem: (itemData) => api.post('/inventory', itemData),
  updateItem: (id, itemData) => api.put(`/inventory/${id}`, itemData),
  deleteItem: (id) => api.delete(`/inventory/${id}`),
  getLowStockItems: () => api.get('/inventory/low-stock'),
  getCategories: () => api.get('/inventory/categories'),
  getOwners: () => api.get('/inventory/owners'),
};

// Sales API
export const salesAPI = {
  getSales: (params) => api.get('/sales', { params }),
  getSale: (id) => api.get(`/sales/${id}`),
  createSale: (saleData) => api.post('/sales', saleData),
  markAsPaid: (id) => api.patch(`/sales/${id}/mark-paid`),
};

// Income API
export const incomeAPI = {
  getSummary: (params) => api.get('/income/summary', { params }),
  getDailyIncome: (params) => api.get('/income/daily', { params }),
  getMonthlyIncome: (params) => api.get('/income/monthly', { params }),
  getIncomeByCategory: (params) => api.get('/income/by-category', { params }),
  getTopSellingItems: (params) => api.get('/income/top-selling', { params }),
  getOverallStats: (params) => api.get('/income/stats', { params }),
};

// Device API
export const deviceAPI = {
  registerDevice: (deviceData, config) => api.post('/devices/register', deviceData, config),
  unregisterDevice: (pushToken) => api.post('/devices/unregister', { push_token: pushToken }),
  getMyDevices: () => api.get('/devices/my-devices'),
  getAllDevices: () => api.get('/devices/all'),
  updatePreferences: (pushToken, preferences) => api.put('/devices/preferences', { 
    push_token: pushToken, 
    ...preferences 
  }),
  testNotification: (pushToken, title, body) => api.post('/devices/test-notification', { 
    push_token: pushToken, 
    title, 
    body 
  }),
};

export default api;