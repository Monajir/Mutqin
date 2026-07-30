import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { ScreenWrapper, EmptyState } from '@/components';
import { VStack, HStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { SearchBar, SkeletonListRow } from '@/design-system/components';
import { useQuranSurahs, useLastRead } from '../api/quranQueries';
import { SurahListItem } from '../components/SurahListItem';

/** Wireframe screen 02 — Surah list with search and Last Read shortcut. */
export function SurahListScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { data: surahs, isLoading } = useQuranSurahs();
  const { data: lastRead } = useLastRead();

  const filtered = (surahs ?? []).filter(
    (s) =>
      s.nameTransliteration.toLowerCase().includes(query.toLowerCase()) ||
      s.nameTranslation.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <ScreenWrapper>
      <VStack gap={4} style={{ flex: 1, paddingTop: 16 }}>
        <Text variant="headingLg">Quran</Text>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search surah" />

        {lastRead ? (
          <HStack
            justify="space-between"
            style={{ paddingVertical: 8 }}
            accessibilityRole="button"
            onTouchEnd={() => router.push(`/(tabs)/quran/${lastRead.surahId}`)}
          >
            <Text variant="bodySm" color="secondary">
              {`Last Read: ${lastRead.surahName} · Ayah ${lastRead.ayahNumber}`}
            </Text>
          </HStack>
        ) : null}

        {isLoading ? (
          <VStack gap={2}>
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonListRow key={i} />
            ))}
          </VStack>
        ) : filtered.length === 0 ? (
          <EmptyState variant="no-results" />
        ) : (
          <FlashList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            estimatedItemSize={64}
            renderItem={({ item }) => (
              <SurahListItem surah={item} onPress={() => router.push(`/(tabs)/quran/${item.id}`)} />
            )}
          />
        )}
      </VStack>
    </ScreenWrapper>
  );
}
