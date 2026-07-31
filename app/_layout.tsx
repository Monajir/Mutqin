import React, { useEffect, useState } from 'react';
import { Stack, Slot, Redirect } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { ThemeProvider } from '@/design-system/theme';
import { ToastProvider } from '@/design-system/components';
import { ErrorBoundary, OfflineBanner } from '@/components';
import { queryClient } from '@/lib/queryClient';
import { queryPersister } from '@/services/storage/queryPersister';
import { initializeDatabase } from '@/services/storage/sqlite';
import { initConnectivityListener } from '@/stores';
import { useAppStore } from '@/stores';
import { View } from 'react-native';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const isOnboarded = useAppStore((s) => s.isOnboarded);
  const isDbReady = useAppStore((s) => s.isDbReady);

  // Deliberately not a separate `app/index.tsx` route: since `(tabs)` is a
  // route group, `(tabs)/index.tsx` already resolves to "/" — a sibling
  // `app/index.tsx` would collide with it. Gating onboarding here, inside
  // the layout tree, avoids that path conflict entirely.

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <ErrorBoundary>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="(modals)"
            options={{ presentation: 'modal', headerShown: false }}
          />
        </Stack>
        {/* Redirect after Stack is mounted so the navigator exists */}
        {isDbReady && !isOnboarded && <Redirect href="/(onboarding)/welcome" />}
      </ErrorBoundary>
    </View>
  );
}

export default function RootLayout() {
  const setDbReady = useAppStore((s) => s.setDbReady);
  const isDbReady = useAppStore((s) => s.isDbReady);
  const [bootError, setBootError] = useState<Error | null>(null);
  const [fontsLoaded, fontError] = useFonts({
    KFGQPCUthmanicScript: require('../assets/fonts/KFGQPCUthmanicScriptHAFS.ttf'),
  });

  useEffect(() => {
    if (fontError) {
      SplashScreen.hideAsync().catch(() => {});
      setBootError(fontError);
    }
  }, [fontError]);

  useEffect(() => {
    if (isDbReady && fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, isDbReady]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        await initializeDatabase();
        if (isMounted) setDbReady(true);
      } catch (err) {
        if (isMounted) {
          SplashScreen.hideAsync().catch(() => {});
          setBootError(err instanceof Error ? err : new Error('Failed to initialize local database'));
        }
      }
    }

    const unsubscribe = initConnectivityListener();
    void bootstrap();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [setDbReady]);

  if (bootError) {
    // A DB init failure is unrecoverable without a restart — fail loudly rather
    // than letting every screen underneath throw confusing secondary errors.
    throw bootError;
  }

  // Always wrap in the full provider tree so that child routes rendered via
  // the navigator (even during loading) have access to ThemeProvider, etc.
  // Use a bare Slot while the DB is initialising — Expo Router requires a
  // navigator on every render, and Slot satisfies that contract.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: queryPersister,
            // Discard caches created from the former three-surah demo dataset.
            buster: 'quran-content-1.0.0-full',
            // Quran reference data is already local in SQLite; persisting a
            // second copy can leave the UI showing an obsolete content pack.
            dehydrateOptions: {
              shouldDehydrateQuery: (query) => query.queryKey[0] !== 'quran',
            },
          }}
        >
          <ThemeProvider>
            <ToastProvider>
              {isDbReady && fontsLoaded ? <RootNavigator /> : <Slot />}
            </ToastProvider>
          </ThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
