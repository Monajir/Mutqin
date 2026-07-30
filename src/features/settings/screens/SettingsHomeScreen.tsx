import React from 'react';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components';
import { VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Divider } from '@/design-system/primitives/Divider';
import { ListRow } from '@/design-system/components';
import { useAuthStore } from '@/stores';

/** Wireframe screen 10 — settings grouped by user intent (account, worship, reading, app). */
export function SettingsHomeScreen() {
  const router = useRouter();
  const authStatus = useAuthStore((s) => s.status);

  return (
    <ScreenWrapper scroll>
      <VStack gap={5} style={{ paddingTop: 16 }}>
        <Text variant="headingLg">Settings</Text>

        <VStack>
          <Text variant="bodySm" color="secondary" weight="600" style={{ marginBottom: 8 }}>
            ACCOUNT
          </Text>
          <ListRow
            title="Profile & Account"
            subtitle={authStatus === 'authenticated' ? 'Signed in' : 'Guest — sign in to sync'}
            leadingIcon="User"
            showChevron
            onPress={() => {}}
          />
          <ListRow title="Sync & Backup" leadingIcon="CloudUpload" showChevron onPress={() => {}} />
        </VStack>
        <Divider />

        <VStack>
          <Text variant="bodySm" color="secondary" weight="600" style={{ marginBottom: 8 }}>
            WORSHIP
          </Text>
          <ListRow title="Prayer Settings" leadingIcon="Clock" showChevron onPress={() => router.push('/(tabs)/prayer')} />
          <ListRow title="Notifications" leadingIcon="Bell" showChevron onPress={() => router.push('/settings/notifications')} />
        </VStack>
        <Divider />

        <VStack>
          <Text variant="bodySm" color="secondary" weight="600" style={{ marginBottom: 8 }}>
            APP
          </Text>
          <ListRow title="Appearance" leadingIcon="Palette" showChevron onPress={() => router.push('/settings/appearance')} />
          <ListRow title="Language" leadingIcon="Globe" showChevron onPress={() => router.push('/settings/language')} />
          <ListRow title="Accessibility" leadingIcon="Eye" showChevron onPress={() => {}} />
        </VStack>
        <Divider />

        <ListRow title="About" leadingIcon="Info" showChevron onPress={() => router.push('/settings/about')} />
      </VStack>
    </ScreenWrapper>
  );
}
