import React from 'react';
import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack screenOptions={{ presentation: 'modal', headerShown: true }}>
      <Stack.Screen name="qibla" options={{ title: 'Qibla' }} />
      <Stack.Screen name="hifz-summary" options={{ title: 'Session Results', gestureEnabled: false }} />
    </Stack>
  );
}
