import React from 'react';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components';
import { VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Button } from '@/design-system/primitives/Button';
import { APP_NAME } from '@/constants';

export function WelcomeScreen() {
  const router = useRouter();

  return (
    <ScreenWrapper>
      <VStack gap={6} align="center" justify="center" style={{ flex: 1 }}>
        <VStack gap={2} align="center">
          <Text variant="displayLg" align="center">
            {APP_NAME}
          </Text>
          <Text variant="bodyLg" color="secondary" align="center">
            Perfect Your Hifz. Strengthen Your Worship.
          </Text>
        </VStack>
        <Button label="Get Started" fullWidth onPress={() => router.push('/(onboarding)/language')} />
      </VStack>
    </ScreenWrapper>
  );
}
