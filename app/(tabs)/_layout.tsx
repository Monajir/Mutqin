import React from 'react';
import { Tabs } from 'expo-router';
import { Icon } from '@/design-system/primitives/Icon';
import { AudioPlayerBar } from '@/design-system/components';
import { useAppTheme } from '@/design-system/theme';
import { View } from 'react-native';

/**
 * Bottom tab shell (spec §"Persistent bottom navigation keeps the four
 * highest-frequency destinations one tap away" — wireframe positioning
 * rationale, screen 01). "More" houses Hadith, Dua, Names, Bookmarks,
 * Settings per the wireframe's secondary-navigation grouping.
 */
export default function TabsLayout() {
  const { tokens } = useAppTheme();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: tokens.brand.primary,
          tabBarInactiveTintColor: tokens.text.muted,
          tabBarStyle: { backgroundColor: tokens.background.primary, borderTopColor: tokens.border.subtle },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Icon name="Home" color="primary" size={size} /> }}
        />
        <Tabs.Screen
          name="quran/index"
          options={{ title: 'Quran', tabBarIcon: ({ size }) => <Icon name="BookOpen" size={size} /> }}
        />
        <Tabs.Screen
          name="quran/[surahId]"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="hifz/index"
          options={{ title: 'Hifz', tabBarIcon: ({ size }) => <Icon name="Brain" size={size} /> }}
        />
        <Tabs.Screen
          name="hifz/session"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="hifz/setup"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="prayer/index"
          options={{ title: 'Prayer', tabBarIcon: ({ size }) => <Icon name="Clock" size={size} /> }}
        />
        <Tabs.Screen
          name="more/index"
          options={{ title: 'More', tabBarIcon: ({ size }) => <Icon name="Menu" size={size} /> }}
        />
      </Tabs>
      <AudioPlayerBar />
    </View>
  );
}
