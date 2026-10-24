import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/design-system/theme';
import { HStack, VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Icon } from '@/design-system/primitives/Icon';

/** Brief, non-interactive feedback after the Home bell changes the preference. */
export function NotificationStatusMessage({ enabled, error, onDismiss }: {
  enabled: boolean; error?: string; onDismiss: () => void;
}) {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const timer = setTimeout(onDismiss, error ? 4500 : 2500);
    return () => clearTimeout(timer);
  }, [onDismiss, error]);

  return <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 100 }}>
    <Animated.View entering={SlideInDown.duration(220)} exiting={SlideOutDown.duration(180)}
      accessibilityLiveRegion="polite" accessible
      style={{ backgroundColor: tokens.background.elevated, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        borderWidth: 1, borderColor: tokens.border.subtle, padding: 24, paddingBottom: Math.max(insets.bottom, 16) + 90 }}>
      <HStack gap={3} align="center">
        <Icon name={error ? 'CircleAlert' : enabled ? 'BellRing' : 'BellOff'} color={error ? 'secondary' : 'brand'} size={26} />
        <VStack gap={1} style={{ flex: 1 }}>
          <Text variant="headingSm">{error ? 'Notifications need attention' : enabled ? 'Notifications turned on' : 'Notifications turned off'}</Text>
          <Text variant="bodySm" color="secondary">{error ?? (enabled ? 'Your selected reminders are enabled.' : 'Your reminder preferences are saved for later.')}</Text>
        </VStack>
      </HStack>
    </Animated.View>
  </View>;
}
