import React, { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArabicText, EmptyState, ScreenWrapper } from '@/components';
import { Card, SkeletonListRow, useToast } from '@/design-system/components';
import { IconButton } from '@/design-system/primitives/IconButton';
import { HStack, VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { useNamesOfAllah } from '../api/libraryQueries';
import { LibraryHeader } from './LibraryHeader';
import type { NameOfAllah } from '../types/library.types';
import { useBookmarkRefs, useToggleBookmark } from '@/features/bookmarks';

export function NamesOfAllahScreen() {
  const router = useRouter();
  const { show: showToast } = useToast();
  const { data = [], isLoading, isError, refetch } = useNamesOfAllah();
  const { data: bookmarkRefs = [] } = useBookmarkRefs('name');
  const toggleBookmark = useToggleBookmark();
  const goBack = useCallback(() => router.replace('/(tabs)/more'), [router]);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, [goBack]));

  return (
    <ScreenWrapper>
      <VStack gap={4} style={{ flex: 1 }}>
        <LibraryHeader title="Allah's Beautiful Names" subtitle="Learn, understand and reflect" onBack={goBack} />
        {isLoading ? (
          <VStack gap={2}>{Array.from({ length: 6 }).map((_, index) => <SkeletonListRow key={index} />)}</VStack>
        ) : isError ? (
          <EmptyState variant="error" actionLabel="Try again" onAction={() => refetch()} />
        ) : data.length === 0 ? (
          <EmptyState
            variant="no-data"
            title="Names content is not in this database yet"
            description="The Names table is ready, but the bundled database currently contains no entries."
          />
        ) : (
          <FlashList<NameOfAllah>
            data={data}
            keyExtractor={(item) => String(item.id)}
            estimatedItemSize={210}
            ItemSeparatorComponent={() => <VStack style={{ height: 12 }} />}
            renderItem={({ item }) => (
              <Card>
                <VStack gap={3}>
                  <HStack justify="space-between" align="flex-start" gap={3}>
                    <VStack gap={1} style={{ flex: 1 }}>
                      <Text variant="caption" color="brand" weight="700">NAME {item.id}</Text>
                      <ArabicText size={30} lineHeight={44}>{item.nameArabic}</ArabicText>
                    </VStack>
                    <VStack align="flex-end" gap={1} style={{ flex: 1 }}>
                      <HStack gap={2} justify="flex-end">
                        <Text variant="headingSm" align="right">{item.nameTransliteration}</Text>
                        <IconButton
                          name={bookmarkRefs.includes(String(item.id)) ? 'BookmarkCheck' : 'Bookmark'}
                          color={bookmarkRefs.includes(String(item.id)) ? 'brand' : 'muted'}
                          size={17}
                          variant="soft"
                          accessibilityLabel={bookmarkRefs.includes(String(item.id)) ? 'Remove bookmark' : 'Bookmark name'}
                          onPress={() => toggleBookmark.mutate(
                            { contentType: 'name', contentRef: String(item.id) },
                            {
                              onSuccess: (result) => showToast(result.added ? 'Name bookmarked' : 'Bookmark removed', 'success'),
                              onError: () => showToast('Could not update bookmark', 'error'),
                            }
                          )}
                        />
                      </HStack>
                      <Text variant="bodySm" color="secondary" align="right">{item.nameTranslation}</Text>
                    </VStack>
                  </HStack>
                  <Text variant="bodySm" color="secondary">{item.explanation}</Text>
                </VStack>
              </Card>
            )}
          />
        )}
      </VStack>
    </ScreenWrapper>
  );
}
