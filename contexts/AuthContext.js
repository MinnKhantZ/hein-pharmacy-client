import React, { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from '../services/api';
import notificationService from '../services/notificationService';
import * as secureStorage from '../utils/secureStorage';

export const AuthContext = createContext({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  token: null,
  login: async (credentials) => ({ success: false, error: '' }),
  logout: async () => {},
  updateProfile: async (profileData) => ({ success: false, error: '' }),
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        secureStorage.getItemAsync('authToken'),
        secureStorage.getItemAsync('user'),
      ]);

      if (storedToken && storedUser) {
        // Validate the token with the server
        try {
          const response = await authAPI.validateToken();
          const { owner } = response.data;
          
          // Token is valid, update user data in case it changed
          await secureStorage.setItemAsync('user', JSON.stringify(owner));
          setToken(storedToken);
          setUser(owner);
          console.log('Token validated successfully');
        } catch (validationError) {
          console.log('Token validation failed:', validationError);
          // Token is invalid or expired, clear stored data
          await Promise.all([
            secureStorage.deleteItemAsync('authToken'),
            secureStorage.deleteItemAsync('user'),
          ]);
          setToken(null);
          setUser(null);
        }
      }
    } catch (error) {
      console.log('Error loading stored auth:', error);
      // Clear potentially corrupted data
      try {
        await Promise.all([
          secureStorage.deleteItemAsync('authToken'),
          secureStorage.deleteItemAsync('user'),
        ]);
      } catch (clearError) {
        console.log('Error clearing auth:', clearError);
      }
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const { token: authToken, owner } = response.data;

      await Promise.all([
        secureStorage.setItemAsync('authToken', authToken),
        secureStorage.setItemAsync('user', JSON.stringify(owner)),
      ]);

      setToken(authToken);
      setUser(owner);

      // Register device for push notifications after successful login
      try {
        const pushToken = await notificationService.getStoredPushToken();
        console.log('Checking for stored push token after login:', pushToken ? 'Found' : 'Not found');
        
        if (pushToken) {
          console.log('Registering device with server...');
          // Pass the auth token explicitly to ensure it's available for the API call
          const registered = await notificationService.registerDeviceWithServer(pushToken, null, authToken);
          if (registered) {
            console.log('✅ Device registered successfully after login');
          }
        } else {
          console.log('⚠️ No push token available yet. Will register when notification permission is granted.');
        }
      } catch (notifError) {
        console.error('❌ Error registering device after login:', notifError);
        // Don't fail login if device registration fails
      }

      return { success: true };
    } catch (error) {
      console.log('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const logout = async () => {
    try {
      // Unregister device before logout
      try {
        const pushToken = await notificationService.getStoredPushToken();
        if (pushToken) {
          await notificationService.unregisterDeviceFromServer(pushToken);
        }
      } catch (notifError) {
        console.error('Error unregistering device:', notifError);
      }

      await Promise.all([
        secureStorage.deleteItemAsync('authToken'),
        secureStorage.deleteItemAsync('user'),
      ]);

      setToken(null);
      setUser(null);
    } catch (error) {
      console.log('Logout error:', error);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      const updatedUser = response.data.owner;

      await secureStorage.setItemAsync('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      return { success: true };
    } catch (error) {
      console.log('Update profile error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Update failed' 
      };
    }
  };

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};