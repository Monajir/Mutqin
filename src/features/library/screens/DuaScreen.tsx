import React, { useCallback, useState } from 'react';
import { BackHandler, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArabicText, EmptyState, ScreenWrapper } from '@/components';
import { Badge, Card, SearchBar, SkeletonListRow, useToast } from '@/design-system/components';
import { Pressable } from '@/design-system/primitives/Pressable';
import { IconButton } from '@/design-system/primitives/IconButton';
import { HStack, VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { useAppTheme } from '@/design-system/theme';
import { useDuaCategories, useDuas } from '../api/libraryQueries';
import { LibraryHeader } from './LibraryHeader';
import type { Dua, DuaCategory } from '../types/library.types';
import { useBookmarkRefs, useToggleBookmark } from '@/features/bookmarks';

export function DuaScreen() {
  const router = useRouter();
  const { tokens } = useAppTheme();
  const { show: showToast } = useToast();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { data: categories = [] } = useDuaCategories();
  const { data = [], isLoading, isError, refetch } = useDuas(categoryId, searchQuery);
  const { data: bookmarkRefs = [] } = useBookmarkRefs('dua');
  const toggleBookmark = useToggleBookmark();
  const totalDuas = categories.reduce((sum: number, category: DuaCategory) => sum + category.duaCount, 0);
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
        <LibraryHeader title="Dua & Adhkar" subtitle="Supplications for everyday moments" onBack={goBack} />
        <SearchBar value={query} onChangeText={setQuery} onDebouncedChange={setSearchQuery} placeholder="Search duas" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
          <HStack gap={2}>
            {[{ id: null, nameEnglish: 'All', duaCount: totalDuas }, ...categories].map((category) => {
              const selected = categoryId === category.id;
              return (
                <Pressable
                  key={category.id ?? 'all'}
                  accessibilityRole="button"
                  onPress={() => setCategoryId(category.id)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: 999,
                    backgroundColor: selected ? tokens.brand.primary : tokens.background.secondary,
                    borderWidth: 1,
                    borderColor: selected ? tokens.brand.primary : tokens.border.subtle,
                  }}
                >
                  <Text variant="caption" weight="600" style={{ color: selected ? tokens.text.inverse : tokens.text.secondary }}>
                    {category.nameEnglish}
                  </Text>
                </Pressable>
              );
            })}
          </HStack>
        </ScrollView>
        {isLoading ? (
          <VStack gap={2}>{Array.from({ length: 4 }).map((_, index) => <SkeletonListRow key={index} />)}</VStack>
        ) : isError ? (
          <EmptyState variant="error" actionLabel="Try again" onAction={() => refetch()} />
        ) : data.length === 0 ? (
          <EmptyState variant={searchQuery ? 'no-results' : 'no-data'} />
        ) : (
          <FlashList<Dua>
            data={data}
            keyExtractor={(item) => item.id}
            estimatedItemSize={410}
            ItemSeparatorComponent={() => <VStack style={{ height: 12 }} />}
            renderItem={({ item }) => (
              <Card>
                <VStack gap={3}>
                  <HStack justify="space-between" gap={2} wrap>
                    <VStack gap={1} style={{ flex: 1 }}>
                      <Text variant="headingSm">{item.title}</Text>
                      <Text variant="caption" color="brand">{item.categoryName}</Text>
                    </VStack>
                    <HStack gap={2}>
                      {item.repetitions > 1 ? <Badge status="neutral" label={`Repeat ${item.repetitions}×`} /> : null}
                      <IconButton
                        name={bookmarkRefs.includes(item.id) ? 'BookmarkCheck' : 'Bookmark'}
                        color={bookmarkRefs.includes(item.id) ? 'brand' : 'muted'}
                        size={17}
                        variant="soft"
                        accessibilityLabel={bookmarkRefs.includes(item.id) ? 'Remove bookmark' : 'Bookmark dua'}
                        onPress={() => toggleBookmark.mutate(
                          { contentType: 'dua', contentRef: item.id },
                          {
                            onSuccess: (result) => showToast(result.added ? 'Dua bookmarked' : 'Bookmark removed', 'success'),
                            onError: () => showToast('Could not update bookmark', 'error'),
                          }
                        )}
                      />
                    </HStack>
                  </HStack>
                  <ArabicText size={23} lineHeight={42}>{item.textArabic}</ArabicText>
                  {item.transliteration ? <Text variant="bodySm" color="secondary" style={{ fontStyle: 'italic' }}>{item.transliteration}</Text> : null}
                  <Text variant="bodySm">{item.textTranslation}</Text>
                  <Text variant="caption" color="muted">{item.reference}</Text>
                </VStack>
              </Card>
            )}
          />
        )}
      </VStack>
    </ScreenWrapper>
  );
}
