import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/config';
import { User } from '../types';

export class StorageService {
  static async setAuthToken(token: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  }

  static async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  static async setUserData(user: User): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  }

  static async getUserData(): Promise<User | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  }

  static async setBiometricEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, JSON.stringify(enabled));
  }

  static async getBiometricEnabled(): Promise<boolean> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
    return data ? JSON.parse(data) : false;
  }

  static async setPushToken(token: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);
  }

  static async getPushToken(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
  }

  static async setOfflineData(key: string, data: any): Promise<void> {
    const offlineData = await this.getOfflineData() || {};
    offlineData[key] = data;
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_DATA, JSON.stringify(offlineData));
  }

  static async getOfflineData(): Promise<any> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_DATA);
    return data ? JSON.parse(data) : {};
  }

  static async clearOfflineData(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_DATA);
  }

  static async clearAuth(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_DATA,
    ]);
  }

  static async clearAll(): Promise<void> {
    await AsyncStorage.clear();
  }
}
