import axios from "axios";
import * as secureStorage from "../utils/secureStorage";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5000/api";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(async (config) => {
  try {
    const token = await secureStorage.getItemAsync("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.log("Error getting token:", error);
  }
  return config;
});

// Response interceptor to handle auth errors and rate limiting
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, remove it
      await secureStorage.deleteItemAsync("authToken");
      await secureStorage.deleteItemAsync("user");
    } else if (error.response?.status === 429) {
      // Rate limited - implement exponential backoff retry
      const config = error.config;
      if (!config._retry) {
        config._retry = true;
        config._retryCount = config._retryCount || 0;

        if (config._retryCount < 3) {
          // Max 3 retries
          config._retryCount += 1;
          const delay = Math.pow(2, config._retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s

          console.log(
            `Rate limited. Retrying in ${delay}ms (attempt ${config._retryCount}/3)`,
          );

          return new Promise((resolve) => {
            setTimeout(() => resolve(api(config)), delay);
          });
        }
      }
    }
    return Promise.reject(error);
  },
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  validateToken: () => api.post("/auth/validate-token"),
  getProfile: () => api.get("/auth/profile"),
  updateProfile: (userData) => api.put("/auth/profile", userData),
  changePassword: (passwordData) =>
    api.put("/auth/change-password", passwordData),
  getAllOwners: () => api.get("/auth/owners"),
  createOwner: (ownerData) => api.post("/auth/owners", ownerData),
  updateOwner: (id, ownerData) => api.put(`/auth/owners/${id}`, ownerData),
  resetOwnerPassword: (id, passwordData) =>
    api.put(`/auth/owners/${id}/reset-password`, passwordData),
  deleteOwner: (id) => api.delete(`/auth/owners/${id}`),
};

// Inventory API
export const inventoryAPI = {
  getItems: (params) => api.get("/inventory", { params }),
  getItem: (id) => api.get(`/inventory/${id}`),
  createItem: (itemData) => api.post("/inventory", itemData),
  updateItem: (id, itemData) => api.put(`/inventory/${id}`, itemData),
  deleteItem: (id) => api.delete(`/inventory/${id}`),
  getLowStockItems: () => api.get("/inventory/low-stock"),
  getCategories: () => api.get("/inventory/categories"),
  getOwners: () => api.get("/inventory/owners"),
};

// Sales API
export const salesAPI = {
  getSales: (params) => api.get("/sales", { params }),
  getSale: (id) => api.get(`/sales/${id}`),
  createSale: (saleData) => api.post("/sales", saleData),
  updateSale: (id, saleData) => api.put(`/sales/${id}`, saleData),
  deleteSale: (id) => api.delete(`/sales/${id}`),
  markAsPaid: (id) => api.patch(`/sales/${id}/mark-paid`),
};

// Income API
export const incomeAPI = {
  getSummary: (params) => api.get("/income/summary", { params }),
  getDailyIncome: (params) => api.get("/income/daily", { params }),
  getMonthlyIncome: (params) => api.get("/income/monthly", { params }),
  getIncomeByCategory: (params) => api.get("/income/by-category", { params }),
  getTopSellingItems: (params) => api.get("/income/top-selling", { params }),
  getOverallStats: (params) => api.get("/income/stats", { params }),
};

// Device API
export const deviceAPI = {
  registerDevice: (deviceData, config) =>
    api.post("/devices/register", deviceData, config),
  unregisterDevice: (pushToken) =>
    api.post("/devices/unregister", { push_token: pushToken }),
  getMyDevices: () => api.get("/devices/my-devices"),
  getAllDevices: () => api.get("/devices/all"),
  updatePreferences: (pushToken, preferences) =>
    api.put("/devices/preferences", {
      push_token: pushToken,
      ...preferences,
    }),
  getPrintLayoutConfig: (pushToken, deviceId) =>
    api.get("/devices/print-layout", {
      params: {
        push_token: pushToken,
        device_id: deviceId,
      },
    }),
  updatePrintLayoutConfig: (pushToken, printLayoutConfig, deviceId) =>
    api.put("/devices/print-layout", {
      push_token: pushToken,
      device_id: deviceId,
      print_layout_config: printLayoutConfig,
    }),
  testNotification: (pushToken, title, body) =>
    api.post("/devices/test-notification", {
      push_token: pushToken,
      title,
      body,
    }),
};

export default api;
