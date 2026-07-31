import Constants from 'expo-constants';

export const env = {
  apiBaseUrl: (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://api.mutqin.app/v1',
  audioBaseUrl: (Constants.expoConfig?.extra?.audioBaseUrl as string | null) ?? null,
  contentVersion: (Constants.expoConfig?.extra?.contentVersion as string) ?? '1.0.0',
  isDev: __DEV__,
} as const;
