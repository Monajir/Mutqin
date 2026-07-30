import React from 'react';
import { ScreenWrapper } from '@/components';
import { VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { SegmentedControl } from '@/design-system/components';
import { useAppTheme } from '@/design-system/theme';

/** Wireframe §4 — dark mode support is a stated design principle, not an afterthought. */
export function AppearanceSettingsScreen() {
  const { preference, setPreference } = useAppTheme();

  return (
    <ScreenWrapper>
      <VStack gap={4} style={{ paddingTop: 16 }}>
        <Text variant="headingLg">Appearance</Text>
        <SegmentedControl
          value={preference}
          onChange={setPreference}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </VStack>
    </ScreenWrapper>
  );
}
