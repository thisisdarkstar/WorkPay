// services/tokenService.js
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'USER_AUTH_TOKEN';

export const storeToken = async (token) => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    return true;
  } catch (error) {
    console.error('Error storing token:', error);
    return false;
  }
};

export const getToken = async () => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('Error retrieving token:', error);
    return null;
  }
};

export const removeToken = async () => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    return true;
  } catch (error) {
    console.error('Error removing token:', error);
    return false;
  }
};

export const hasToken = async () => {
  const token = await getToken();
  return !!token;
};

/**
 * Safely extracts a user-friendly error message from any caught error.
 * Handles Axios network errors, API error payloads, timeouts, or unknown errors.
 */
export const getApiErrorMessage = (error, defaultMsg = 'Something went wrong. Please check your network connection.') => {
  if (!error) return defaultMsg;
  if (typeof error === 'string') return error;

  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    defaultMsg
  );
};