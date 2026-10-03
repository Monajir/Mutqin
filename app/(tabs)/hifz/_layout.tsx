import React from 'react';
import { Stack } from 'expo-router';
import { useAppTheme } from '@/design-system/theme';

export const unstable_settings = { initialRouteName: 'index' };

export default function HifzLayout() {
  const { tokens } = useAppTheme();
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: tokens.background.primary }, headerTintColor: tokens.text.primary, headerShadowVisible: false, headerBackTitleVisible: false, headerTitleAlign: 'center', contentStyle: { backgroundColor: tokens.background.primary } }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[surahId]" options={{ title: 'Memorize' }} />
      <Stack.Screen name="setup" options={{ title: 'Recitation checker' }} />
      <Stack.Screen name="session" options={{ title: 'Check your recitation' }} />
    </Stack>
  );
}
