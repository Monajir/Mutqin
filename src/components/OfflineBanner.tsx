import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { HStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Icon } from '@/design-system/primitives/Icon';
import { spacing } from '@/design-system/tokens/spacing';
import { useAppTheme } from '@/design-system/theme';
import { useConnectivityStore } from '@/stores/useConnectivityStore';
import { useSyncQueueStore } from '@/stores/useSyncQueueStore';

/**
 * Persistent, non-blocking banner shown when the device is offline or when
 * writes are queued for sync (§8.2, §15). Rendered once near the app root,
 * not per-screen.
 */
export function OfflineBanner() {
  const { tokens } = useAppTheme();
  const isOnline = useConnectivityStore((s) => s.isOnline);
  const pendingCount = useSyncQueueStore((s) => s.pendingWrites.length);

  if (isOnline && pendingCount === 0) return null;

  const message = !isOnline
    ? 'You are offline. Downloaded content is still available.'
    : `Syncing ${pendingCount} pending change${pendingCount === 1 ? '' : 's'}...`;

  return (
    <Animated.View entering={FadeInUp} exiting={FadeOutUp}>
      <HStack
        gap={2}
        justify="center"
        style={{
          backgroundColor: isOnline ? tokens.semantic.info : tokens.text.muted,
          paddingVertical: spacing[2],
          paddingHorizontal: spacing[4],
        }}
      >
        <Icon name={isOnline ? 'RefreshCw' : 'WifiOff'} size={14} color="inverse" />
        <Text variant="caption" style={{ color: tokens.text.inverse }}>
          {message}
        </Text>
      </HStack>
    </Animated.View>
  );
}
