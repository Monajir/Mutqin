import React from 'react';
import { ScrollView, View, RefreshControl, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
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

  const paddingStyle: ViewStyle = { paddingHorizontal: spacing[4], flexGrow: 1 };

  if (scroll) {
    return (
      <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: tokens.background.primary }}>
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
      <View style={[paddingStyle, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}
