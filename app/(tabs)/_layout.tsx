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
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginBottom: 6 },
          tabBarItemStyle: { paddingTop: 7 },
          tabBarStyle: {
            position: 'absolute',
            left: 14,
            right: 14,
            bottom: 12,
            height: 66,
            borderRadius: 24,
            backgroundColor: tokens.background.elevated,
            borderTopColor: tokens.border.strong,
            borderWidth: 1,
            borderColor: tokens.border.strong,
            elevation: 12,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Icon name="Home" rawColor={color} size={size} /> }}
        />
        <Tabs.Screen
          name="quran/index"
          options={{ title: 'Quran', tabBarIcon: ({ color, size }) => <Icon name="BookOpen" rawColor={color} size={size} /> }}
        />
        <Tabs.Screen
          name="quran/[surahId]"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="hifz"
          options={{ title: 'Hifz', tabBarIcon: ({ color, size }) => <Icon name="Brain" rawColor={color} size={size} /> }}
        />
        <Tabs.Screen
          name="prayer/index"
          options={{ title: 'Prayer', tabBarIcon: ({ color, size }) => <Icon name="Clock" rawColor={color} size={size} /> }}
        />
        <Tabs.Screen
          name="more/index"
          options={{ title: 'More', tabBarIcon: ({ color, size }) => <Icon name="Menu" rawColor={color} size={size} /> }}
        />
        <Tabs.Screen name="more/hadith/index" options={{ href: null }} />
        <Tabs.Screen name="more/hadith/[collectionId]" options={{ href: null }} />
        <Tabs.Screen name="more/duas" options={{ href: null }} />
        <Tabs.Screen name="more/names" options={{ href: null }} />
        <Tabs.Screen name="more/bookmarks" options={{ href: null }} />
      </Tabs>
      <AudioPlayerBar />
    </View>
  );
}
