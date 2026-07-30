import React from 'react';
import { Link } from 'expo-router';
import { ScreenWrapper, EmptyState } from '@/components';
import { VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';

export default function NotFoundScreen() {
  return (
    <ScreenWrapper>
      <VStack style={{ flex: 1 }} align="center" justify="center" gap={3}>
        <EmptyState variant="no-data" title="Page not found" description="This screen doesn't exist." />
        <Link href="/(tabs)">
          <Text color="brand">Go to Home</Text>
        </Link>
      </VStack>
    </ScreenWrapper>
  );
}
