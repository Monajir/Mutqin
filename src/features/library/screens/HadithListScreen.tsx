import React, { useCallback, useState } from 'react';
import { BackHandler } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArabicText, EmptyState, ScreenWrapper } from '@/components';
import { Badge, Card, SearchBar, SkeletonListRow, useToast } from '@/design-system/components';
import { Button } from '@/design-system/primitives/Button';
import { IconButton } from '@/design-system/primitives/IconButton';
import { HStack, VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { useHadithCollections, useHadiths } from '../api/libraryQueries';
import { LibraryHeader } from './LibraryHeader';
import type { Hadith, HadithCollection } from '../types/library.types';
import { useBookmarkRefs, useToggleBookmark } from '@/features/bookmarks';

const PAGE_SIZE = 30;

export function HadithListScreen() {
  const router = useRouter();
  const { show: showToast } = useToast();
  const params = useLocalSearchParams<{ collectionId: string }>();
  const collectionId = Array.isArray(params.collectionId) ? params.collectionId[0] ?? '' : params.collectionId ?? '';
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data: collections = [] } = useHadithCollections();
  const collection = collections.find((item: HadithCollection) => item.id === collectionId);
  const { data = [], isLoading, isError, refetch } = useHadiths(collectionId, searchQuery, limit);
  const { data: bookmarkRefs = [] } = useBookmarkRefs('hadith');
  const toggleBookmark = useToggleBookmark();
  const goBack = useCallback(() => router.replace('/(tabs)/more/hadith' as never), [router]);

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
        <LibraryHeader
          title={collection?.nameEnglish ?? 'Hadith'}
          subtitle={collection ? `${collection.hadithCount.toLocaleString()} narrations` : undefined}
          onBack={goBack}
        />
        <SearchBar
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            setLimit(PAGE_SIZE);
          }}
          onDebouncedChange={setSearchQuery}
          placeholder="Search reference or text"
        />
        {isLoading ? (
          <VStack gap={2}>{Array.from({ length: 4 }).map((_, index) => <SkeletonListRow key={index} />)}</VStack>
        ) : isError ? (
          <EmptyState variant="error" actionLabel="Try again" onAction={() => refetch()} />
        ) : data.length === 0 ? (
          <EmptyState variant={searchQuery ? 'no-results' : 'no-data'} />
        ) : (
          <FlashList<Hadith>
            data={data}
            keyExtractor={(item) => item.id}
            estimatedItemSize={420}
            ItemSeparatorComponent={() => <VStack style={{ height: 12 }} />}
            ListFooterComponent={data.length >= limit ? (
              <Button
                label="Load more"
                variant="secondary"
                onPress={() => setLimit((value) => value + PAGE_SIZE)}
                style={{ marginTop: 16, marginBottom: 12 }}
              />
            ) : null}
            renderItem={({ item }) => (
              <Card>
                <VStack gap={3}>
                  <HStack justify="space-between" gap={2} wrap>
                    <Text variant="caption" color="brand" weight="700">{item.reference}</Text>
                    <HStack gap={2}>
                      {item.grade ? <Badge status="strong" label={item.grade} /> : null}
                      <IconButton
                        name={bookmarkRefs.includes(item.id) ? 'BookmarkCheck' : 'Bookmark'}
                        color={bookmarkRefs.includes(item.id) ? 'brand' : 'muted'}
                        size={17}
                        variant="soft"
                        accessibilityLabel={bookmarkRefs.includes(item.id) ? 'Remove bookmark' : 'Bookmark hadith'}
                        onPress={() => toggleBookmark.mutate(
                          { contentType: 'hadith', contentRef: item.id, collectionId: item.collectionId },
                          {
                            onSuccess: (result) => showToast(result.added ? 'Hadith bookmarked' : 'Bookmark removed', 'success'),
                            onError: () => showToast('Could not update bookmark', 'error'),
                          }
                        )}
                      />
                    </HStack>
                  </HStack>
                  {item.bookTitle ? <Text variant="caption" color="secondary">{item.bookTitle}</Text> : null}
                  <ArabicText size={22} lineHeight={40}>{item.textArabic}</ArabicText>
                  <Text variant="bodySm" color="secondary">{item.textTranslation}</Text>
                  {item.narrator ? <Text variant="caption" color="muted">Narrated by {item.narrator}</Text> : null}
                </VStack>
              </Card>
            )}
          />
        )}
      </VStack>
    </ScreenWrapper>
  );
}
