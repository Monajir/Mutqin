import React from 'react';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components';
import { VStack, HStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { ListRow, Badge } from '@/design-system/components';
import { Divider } from '@/design-system/primitives/Divider';

/**
 * Navigation hub for everything that doesn't warrant its own primary tab
 * (wireframe's four-tab positioning rationale, screen 01). Hadith, Dua &
 * Adhkar, Allah's Names, and Bookmarks follow the exact repository/query/
 * screen pattern established by the Quran feature in this scaffold — see
 * IMPLEMENTATION_ROADMAP.md Phase 2 for the concrete build order. They're
 * marked below rather than wired to dead routes so this hub stays honest
 * about what's implemented today.
 */
export default function MoreScreen() {
  const router = useRouter();

  return (
    <ScreenWrapper scroll>
      <VStack gap={5} style={{ paddingTop: 16 }}>
        <Text variant="headingLg">More</Text>

        <VStack>
          <HStack justify="space-between">
            <Text variant="bodySm" color="secondary" weight="600">
              CONTENT
            </Text>
          </HStack>
          <ListRow
            title="Hadith"
            leadingIcon="ScrollText"
            trailing={<Badge status="neutral" label="Phase 2" />}
            onPress={() => {}}
          />
          <ListRow
            title="Dua & Adhkar"
            leadingIcon="HandHeart"
            trailing={<Badge status="neutral" label="Phase 2" />}
            onPress={() => {}}
          />
          <ListRow
            title="Allah's Beautiful Names"
            leadingIcon="Sparkles"
            trailing={<Badge status="neutral" label="Phase 2" />}
            onPress={() => {}}
          />
          <ListRow
            title="Bookmarks"
            leadingIcon="Bookmark"
            trailing={<Badge status="neutral" label="Phase 2" />}
            onPress={() => {}}
          />
        </VStack>

        <Divider />

        <ListRow title="Settings" leadingIcon="Settings" showChevron onPress={() => router.push('/settings')} />
      </VStack>
    </ScreenWrapper>
  );
}
