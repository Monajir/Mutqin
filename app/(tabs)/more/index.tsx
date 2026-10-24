import React from 'react';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components';
import { VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Card, ListRow } from '@/design-system/components';

export default function MoreScreen() {
  const router = useRouter();

  return (
    <ScreenWrapper scroll>
      <VStack gap={5} style={{ paddingTop: 12 }}>
        <VStack gap={1}>
          <Text variant="headingLg">Discover</Text>
          <Text variant="bodySm" color="secondary">More ways to learn, remember and grow</Text>
        </VStack>

        <VStack gap={2}>
          <Text variant="headingSm">Library</Text>
          <Card>
            <ListRow title="Hadith" subtitle="33,511 narrations across six collections" leadingIcon="ScrollText" showChevron onPress={() => router.push('/(tabs)/more/hadith' as never)} />
            <ListRow title="Dua & Adhkar" subtitle="70 supplications for everyday moments" leadingIcon="HandHeart" showChevron onPress={() => router.push('/(tabs)/more/duas' as never)} />
            <ListRow title="Allah's Beautiful Names" subtitle="Learn and reflect" leadingIcon="Sparkles" showChevron onPress={() => router.push('/(tabs)/more/names' as never)} />
            <ListRow title="Bookmarks" subtitle="Your saved content" leadingIcon="Bookmark" showChevron onPress={() => router.push('/(tabs)/more/bookmarks' as never)} />
          </Card>
        </VStack>

        <VStack gap={2}>
          <Text variant="headingSm">Preferences</Text>
          <Card>
            <ListRow title="Settings" subtitle="Appearance, language and notifications" leadingIcon="Settings" showChevron onPress={() => router.push('/settings')} />
          </Card>
        </VStack>
      </VStack>
    </ScreenWrapper>
  );
}
