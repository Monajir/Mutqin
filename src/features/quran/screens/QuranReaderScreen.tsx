import React, { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { ScreenWrapper, EmptyState } from '@/components';
import { VStack, HStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { SegmentedControl } from '@/design-system/components';
import { useAyahRange } from '../api/quranQueries';
import { useSetLastRead } from '../api/quranMutations';
import { AyahRow } from '../components/AyahRow';
import { useAudioPlayerStore } from '@/stores';

const PAGE_SIZE = 20;

/** Wireframe screen 02 (detail) — continuous ayah reader for a single surah. */
export function QuranReaderScreen() {
  const { surahId: surahIdParam } = useLocalSearchParams<{ surahId: string }>();
  const surahId = Number(surahIdParam);
  const [showTranslation, setShowTranslation] = useState<'arabic' | 'both'>('both');
  const { data: ayahs, isLoading } = useAyahRange(surahId, 1, PAGE_SIZE);
  const setLastRead = useSetLastRead();
  const playTrack = useAudioPlayerStore((s) => s.play);

  if (isLoading) {
    return (
      <ScreenWrapper>
        <EmptyState variant="no-data" title="Loading..." />
      </ScreenWrapper>
    );
  }

  if (!ayahs || ayahs.length === 0) {
    return (
      <ScreenWrapper>
        <EmptyState variant="error" title="Could not load this surah" />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <VStack gap={3} style={{ flex: 1, paddingTop: 16 }}>
        <HStack justify="space-between">
          <Text variant="headingLg">{`Surah ${surahId}`}</Text>
          <SegmentedControl
            value={showTranslation}
            onChange={setShowTranslation}
            options={[
              { value: 'arabic', label: 'Arabic' },
              { value: 'both', label: 'Both' },
            ]}
          />
        </HStack>

        <FlashList
          data={ayahs}
          keyExtractor={(item) => `${item.surahId}-${item.ayahNumber}`}
          estimatedItemSize={140}
          onViewableItemsChanged={({ viewableItems }) => {
            const first = viewableItems[0]?.item;
            if (first) {
              setLastRead.mutate({
                surahId: first.surahId,
                ayahNumber: first.ayahNumber,
                surahName: `Surah ${first.surahId}`,
                updatedAt: new Date().toISOString(),
              });
            }
          }}
          renderItem={({ item }) => (
            <AyahRow
              ayah={item}
              showTranslation={showTranslation === 'both'}
              isBookmarked={false}
              onToggleBookmark={() => {}}
              onPlayAudio={() =>
                playTrack({
                  id: `${item.surahId}-${item.ayahNumber}`,
                  title: `Surah ${item.surahId} · Ayah ${item.ayahNumber}`,
                  uri: `https://cdn.mutqin.app/audio/qari-default/${item.surahId}/${item.ayahNumber}.mp3`,
                })
              }
            />
          )}
        />
      </VStack>
    </ScreenWrapper>
  );
}
