import Constants from 'expo-constants';

export const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3001/api/v1';
export const WS_URL = Constants.expoConfig?.extra?.wsUrl || 'ws://localhost:3001';

export const APP_NAME = 'EarnTrack Mobile';
export const APP_VERSION = '1.0.0';

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@earntrack_auth_token',
  USER_DATA: '@earntrack_user_data',
  BIOMETRIC_ENABLED: '@earntrack_biometric_enabled',
  PUSH_TOKEN: '@earntrack_push_token',
  OFFLINE_DATA: '@earntrack_offline_data',
};
