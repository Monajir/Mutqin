import React from 'react';
import { ScrollView, View, RefreshControl, ViewStyle } from 'react-native';
import { SafeAreaView, Edge, useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/design-system/tokens/spacing';
import { useAppTheme } from '@/design-system/theme';

export interface ScreenWrapperProps {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  onRefresh?: () => void;
  refreshing?: boolean;
  contentStyle?: ViewStyle;
}

/**
 * Standard screen shell: safe-area handling, the app-wide horizontal gutter
 * (16px, per §10.3 of the architecture doc), and optional pull-to-refresh.
 * Every screen should be wrapped in this rather than hand-rolling SafeAreaView.
 */
export function ScreenWrapper({
  children,
  scroll = false,
  edges = ['top', 'left', 'right'],
  onRefresh,
  refreshing = false,
  contentStyle,
}: ScreenWrapperProps) {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();

  const paddingStyle: ViewStyle = {
    paddingHorizontal: spacing[4],
    paddingBottom: Math.max(spacing[12] + spacing[10], 66 + Math.max(12, insets.bottom) + 12),
    flexGrow: 1,
  };
  const atmosphere = (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' }}
    >
      <View
        style={{
          position: 'absolute',
          width: 260,
          height: 260,
          borderRadius: 130,
          top: -170,
          right: -80,
          backgroundColor: tokens.brand.primary,
          opacity: 0.14,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: 220,
          height: 220,
          borderRadius: 110,
          top: 130,
          left: -180,
          backgroundColor: tokens.semantic.info,
          opacity: 0.08,
        }}
      />
    </View>
  );

  if (scroll) {
    return (
      <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: tokens.background.primary }}>
        {atmosphere}
        <ScrollView
          contentContainerStyle={[paddingStyle, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.brand.primary} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: tokens.background.primary }}>
      {atmosphere}
      <View style={[paddingStyle, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}
