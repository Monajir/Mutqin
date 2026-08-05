import React, { useCallback, useState } from 'react';
import { BackHandler, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArabicText, EmptyState, ScreenWrapper } from '@/components';
import { Card, SkeletonListRow, useToast } from '@/design-system/components';
import { IconButton } from '@/design-system/primitives/IconButton';
import { Pressable } from '@/design-system/primitives/Pressable';
import { HStack, VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { useAppTheme } from '@/design-system/theme';
import type { BookmarkableContentType } from '@/types';
import { useBookmarks, useRemoveBookmark } from '../api/bookmarkQueries';
import type { BookmarkListItem } from '../types/bookmark.types';
import { LibraryHeader } from '@/features/library/screens/LibraryHeader';

const filters: { value: BookmarkableContentType | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'quran', label: 'Quran' },
  { value: 'hadith', label: 'Hadith' },
  { value: 'dua', label: 'Duas' },
  { value: 'name', label: 'Names' },
];

const typeLabels: Record<BookmarkableContentType, string> = {
  quran: 'QURAN',
  hadith: 'HADITH',
  dua: 'DUA',
  name: 'NAME',
};

export function BookmarksScreen() {
  const router = useRouter();
  const { tokens } = useAppTheme();
  const { show: showToast } = useToast();
  const [filter, setFilter] = useState<BookmarkableContentType | null>(null);
  const { data = [], isLoading, isError, refetch } = useBookmarks(filter);
  const removeBookmark = useRemoveBookmark();
  const goBack = useCallback(() => router.replace('/(tabs)/more'), [router]);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, [goBack]));

  const openBookmark = (item: BookmarkListItem) => {
    if (item.contentType === 'quran') {
      const [surahId] = item.contentRef.split(':');
      router.push(`/(tabs)/quran/${surahId}` as never);
    } else if (item.contentType === 'hadith' && item.collectionId) {
      router.push(`/(tabs)/more/hadith/${item.collectionId}` as never);
    } else if (item.contentType === 'dua') {
      router.push('/(tabs)/more/duas' as never);
    } else if (item.contentType === 'name') {
      router.push('/(tabs)/more/names' as never);
    }
  };

  return (
    <ScreenWrapper>
      <VStack gap={4} style={{ flex: 1 }}>
        <LibraryHeader title="Bookmarks" subtitle="Your saved content, available offline" onBack={goBack} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
          <HStack gap={2}>
            {filters.map((item) => {
              const selected = filter === item.value;
              return (
                <Pressable
                  key={item.value ?? 'all'}
                  accessibilityRole="button"
                  onPress={() => setFilter(item.value)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: 999,
                    backgroundColor: selected ? tokens.brand.primary : tokens.background.secondary,
                    borderWidth: 1,
                    borderColor: selected ? tokens.brand.primary : tokens.border.subtle,
                  }}
                >
                  <Text
                    variant="caption"
                    weight="600"
                    style={{ color: selected ? tokens.text.inverse : tokens.text.secondary }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </HStack>
        </ScrollView>

        {isLoading ? (
          <VStack gap={2}>{Array.from({ length: 5 }).map((_, index) => <SkeletonListRow key={index} />)}</VStack>
        ) : isError ? (
          <EmptyState variant="error" actionLabel="Try again" onAction={() => refetch()} />
        ) : data.length === 0 ? (
          <EmptyState
            variant="no-data"
            title={filter ? `No ${filters.find((item) => item.value === filter)?.label} bookmarks` : 'No bookmarks yet'}
            description="Tap the bookmark icon beside content you want to return to later."
          />
        ) : (
          <FlashList<BookmarkListItem>
            data={data}
            keyExtractor={(item) => item.id}
            estimatedItemSize={260}
            ItemSeparatorComponent={() => <VStack style={{ height: 12 }} />}
            renderItem={({ item }) => (
              <Card onPress={() => openBookmark(item)}>
                <VStack gap={3}>
                  <HStack justify="space-between" gap={3}>
                    <VStack gap={1} style={{ flex: 1 }}>
                      <Text variant="caption" color="brand" weight="700">{typeLabels[item.contentType]}</Text>
                      <Text variant="headingSm">{item.title}</Text>
                      <Text variant="caption" color="secondary">{item.subtitle}</Text>
                    </VStack>
                    <IconButton
                      name="BookmarkCheck"
                      color="brand"
                      variant="soft"
                      accessibilityLabel="Remove bookmark"
                      onPress={(event) => {
                        event.stopPropagation();
                        removeBookmark.mutate(item.id, {
                          onSuccess: () => showToast('Bookmark removed'),
                          onError: () => showToast('Could not remove bookmark', 'error'),
                        });
                      }}
                    />
                  </HStack>
                  {item.arabic ? <ArabicText size={21} lineHeight={38}>{item.arabic}</ArabicText> : null}
                  {item.translation ? (
                    <Text variant="bodySm" color="secondary" numberOfLines={5}>{item.translation}</Text>
                  ) : null}
                </VStack>
              </Card>
            )}
          />
        )}
      </VStack>
    </ScreenWrapper>
  );
}
