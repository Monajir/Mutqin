import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { EmptyState, ScreenWrapper } from '@/components';
import { HStack, VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Pressable } from '@/design-system/primitives/Pressable';
import { Icon } from '@/design-system/primitives/Icon';
import { SearchBar, SkeletonListRow } from '@/design-system/components';
import { useAppTheme } from '@/design-system/theme';
import { useLastRead, useQuranSurahs } from '../api/quranQueries';
import { SurahListItem } from '../components/SurahListItem';
import type { Surah } from '@/types';

export function SurahListScreen() {
  const router = useRouter();
  const { tokens } = useAppTheme();
  const [query, setQuery] = useState('');
  const { data: surahs, isLoading } = useQuranSurahs();
  const { data: lastRead } = useLastRead();

  const filtered = (surahs ?? []).filter(
    (surah) =>
      surah.nameTransliteration.toLowerCase().includes(query.toLowerCase()) ||
      surah.nameTranslation.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <ScreenWrapper>
      <VStack gap={4} style={{ flex: 1, paddingTop: 12 }}>
        <VStack gap={1}>
          <Text variant="headingLg">The Noble Quran</Text>
          <Text variant="bodySm" color="secondary">Read, reflect and continue your journey</Text>
        </VStack>

        <SearchBar value={query} onChangeText={setQuery} placeholder="Search surah" />

        {lastRead ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/(tabs)/quran/${lastRead.surahId}`)}
            style={{
              padding: 14,
              borderRadius: 16,
              backgroundColor: tokens.background.elevated,
              borderWidth: 1,
              borderColor: tokens.border.strong,
            }}
          >
            <HStack justify="space-between">
              <HStack gap={3}>
                <Icon name="Bookmark" color="brand" size={19} />
                <VStack gap={1}>
                  <Text variant="caption" color="brand" weight="700">CONTINUE READING</Text>
                  <Text variant="bodySm" weight="600">{lastRead.surahName}</Text>
                </VStack>
              </HStack>
              <HStack gap={1}>
                <Text variant="caption" color="secondary">{`Ayah ${lastRead.ayahNumber}`}</Text>
                <Icon name="ArrowRight" size={15} color="muted" />
              </HStack>
            </HStack>
          </Pressable>
        ) : null}

        {isLoading ? (
          <VStack gap={2}>
            {Array.from({ length: 8 }).map((_, index) => (
              <SkeletonListRow key={index} />
            ))}
          </VStack>
        ) : filtered.length === 0 ? (
          <EmptyState variant="no-results" />
        ) : (
          <FlashList<Surah>
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            estimatedItemSize={76}
            renderItem={({ item }) => (
              <SurahListItem
                surah={item}
                onPress={() => router.push(`/(tabs)/quran/${item.id}`)}
              />
            )}
          />
        )}
      </VStack>
    </ScreenWrapper>
  );
}
