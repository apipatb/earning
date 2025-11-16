import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import ApiService from './api.service';
import { StorageService } from './storage.service';
import { AuthResponse } from '../types';

export class AuthService {
  static async login(email: string, password: string): Promise<AuthResponse> {
    // Get device info
    const deviceId = await this.getDeviceId();
    const deviceName = await this.getDeviceName();

    const response = await ApiService.login(email, password, deviceId, deviceName);

    // Store auth data
    await StorageService.setAuthToken(response.token);
    await StorageService.setUserData(response.user);

    return response;
  }

  static async logout(): Promise<void> {
    await StorageService.clearAuth();
  }

  static async isAuthenticated(): Promise<boolean> {
    const token = await StorageService.getAuthToken();
    return !!token;
  }

  static async checkBiometricSupport(): Promise<boolean> {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  }

  static async authenticateWithBiometric(): Promise<boolean> {
    const supported = await this.checkBiometricSupport();
    if (!supported) {
      return false;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access EarnTrack',
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false,
    });

    return result.success;
  }

  static async enableBiometric(): Promise<boolean> {
    const supported = await this.checkBiometricSupport();
    if (!supported) {
      throw new Error('Biometric authentication is not supported on this device');
    }

    const authenticated = await this.authenticateWithBiometric();
    if (authenticated) {
      await StorageService.setBiometricEnabled(true);
      return true;
    }

    return false;
  }

  static async disableBiometric(): Promise<void> {
    await StorageService.setBiometricEnabled(false);
  }

  private static async getDeviceId(): Promise<string> {
    // In a real app, use expo-device or expo-application to get unique device ID
    return `${Platform.OS}-${Date.now()}`;
  }

  private static async getDeviceName(): Promise<string> {
    // In a real app, use expo-device to get device name
    return `${Platform.OS === 'ios' ? 'iPhone' : 'Android'} Device`;
  }
}
