import React, { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArabicText, EmptyState, ScreenWrapper } from '@/components';
import { Badge, Card, SkeletonListRow } from '@/design-system/components';
import { HStack, VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Icon } from '@/design-system/primitives/Icon';
import { useHadithCollections } from '../api/libraryQueries';
import { LibraryHeader } from './LibraryHeader';
import type { HadithCollection } from '../types/library.types';

export function HadithCollectionsScreen() {
  const router = useRouter();
  const { data = [], isLoading, isError, refetch } = useHadithCollections();
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
        <LibraryHeader title="Hadith Library" subtitle="Six collections, available offline" onBack={goBack} />
        {isLoading ? (
          <VStack gap={2}>{Array.from({ length: 6 }).map((_, index) => <SkeletonListRow key={index} />)}</VStack>
        ) : isError ? (
          <EmptyState variant="error" actionLabel="Try again" onAction={() => refetch()} />
        ) : data.length === 0 ? (
          <EmptyState variant="no-data" title="No hadith collections found" />
        ) : (
          <FlashList<HadithCollection>
            data={data}
            keyExtractor={(item) => item.id}
            estimatedItemSize={150}
            ItemSeparatorComponent={() => <VStack style={{ height: 12 }} />}
            renderItem={({ item }) => (
              <Card onPress={() => router.push(`/(tabs)/more/hadith/${item.id}` as never)}>
                <VStack gap={3}>
                  <HStack justify="space-between" gap={3}>
                    <VStack gap={1} style={{ flex: 1 }}>
                      <Text variant="headingSm">{item.nameEnglish}</Text>
                      <ArabicText size={20} lineHeight={30}>{item.nameArabic}</ArabicText>
                    </VStack>
                    <Icon name="ChevronRight" color="muted" size={20} />
                  </HStack>
                  <HStack gap={2} wrap>
                    <Badge status="neutral" label={`${item.hadithCount.toLocaleString()} hadiths`} />
                    <Badge status="neutral" label={`${item.bookCount} books`} />
                  </HStack>
                  <Text variant="caption" color="muted">{item.license}</Text>
                </VStack>
              </Card>
            )}
          />
        )}
      </VStack>
    </ScreenWrapper>
  );
}
