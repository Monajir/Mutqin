import React from 'react';
import { ScreenWrapper } from '@/components';
import { VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { APP_NAME } from '@/constants';
import Constants from 'expo-constants';

export function AboutScreen() {
  return (
    <ScreenWrapper>
      <VStack gap={3} style={{ paddingTop: 16 }}>
        <Text variant="headingLg">{APP_NAME}</Text>
        <Text variant="bodySm" color="secondary">
          {`Version ${Constants.expoConfig?.version ?? '1.0.0'}`}
        </Text>
        <Text variant="bodySm" color="secondary">
          Perfect Your Hifz. Strengthen Your Worship.
        </Text>
        <Text variant="caption" color="muted">
          All Quranic text, Hadith, and duas are sourced from verified, reputable references.
        </Text>
      </VStack>
    </ScreenWrapper>
  );
}
