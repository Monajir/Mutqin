import React from 'react';
import { Tabs } from 'expo-router';
import { GlassTabBackground, GlassTabIcon } from '@/design-system/components/GlassTabBar';
import { AudioPlayerBar } from '@/design-system/components';
import { useAppTheme } from '@/design-system/theme';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Bottom tab shell (spec §"Persistent bottom navigation keeps the four
 * highest-frequency destinations one tap away" — wireframe positioning
 * rationale, screen 01). "More" houses Hadith, Dua, Names, Bookmarks,
 * Settings per the wireframe's secondary-navigation grouping.
 */
export default function TabsLayout() {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        safeAreaInsets={{ bottom: 0 }}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: tokens.brand.primary,
          tabBarInactiveTintColor: tokens.text.primary,
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
          tabBarItemStyle: { paddingTop: 6, paddingBottom: 5 },
          tabBarBackground: () => <GlassTabBackground />,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            position: 'absolute',
            left: 14,
            right: 14,
            bottom: Math.max(12, insets.bottom),
            height: 66,
            borderRadius: 32,
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            borderWidth: 0,
            elevation: 0,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 7 },
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Home', tabBarIcon: ({ color, focused }) => <GlassTabIcon name="Home" color={color} focused={focused} /> }}
        />
        <Tabs.Screen
          name="quran/index"
          options={{ title: 'Quran', tabBarIcon: ({ color, focused }) => <GlassTabIcon name="BookOpen" color={color} focused={focused} /> }}
        />
        <Tabs.Screen
          name="quran/[surahId]"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="hifz"
          options={{ title: 'Hifz', tabBarIcon: ({ color, focused }) => <GlassTabIcon name="Brain" color={color} focused={focused} /> }}
        />
        <Tabs.Screen
          name="prayer/index"
          options={{ title: 'Prayer', tabBarIcon: ({ color, focused }) => <GlassTabIcon name="Clock" color={color} focused={focused} /> }}
        />
        <Tabs.Screen
          name="more/index"
          options={{ title: 'More', tabBarIcon: ({ color, focused }) => <GlassTabIcon name="Menu" color={color} focused={focused} /> }}
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
