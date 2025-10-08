import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../services/api';

export const AuthContext = createContext({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  token: null,
  login: async (credentials) => ({ success: false, error: '' }),
  register: async (userData) => ({ success: false, error: '' }),
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
        SecureStore.getItemAsync('authToken'),
        SecureStore.getItemAsync('user'),
      ]);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.log('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const { token: authToken, owner } = response.data;

      await Promise.all([
        SecureStore.setItemAsync('authToken', authToken),
        SecureStore.setItemAsync('user', JSON.stringify(owner)),
      ]);

      setToken(authToken);
      setUser(owner);

      return { success: true };
    } catch (error) {
      console.log('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { token: authToken, owner } = response.data;

      await Promise.all([
        SecureStore.setItemAsync('authToken', authToken),
        SecureStore.setItemAsync('user', JSON.stringify(owner)),
      ]);

      setToken(authToken);
      setUser(owner);

      return { success: true };
    } catch (error) {
      console.log('Register error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  };

  const logout = async () => {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync('authToken'),
        SecureStore.deleteItemAsync('user'),
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

      await SecureStore.setItemAsync('user', JSON.stringify(updatedUser));
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
    register,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};