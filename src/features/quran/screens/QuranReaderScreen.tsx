import React, { Fragment, useCallback, useMemo, useState } from 'react';
import { BackHandler, ScrollView, Text as NativeText, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { ArabicText, EmptyState, ScreenWrapper } from '@/components';
import { HStack, VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { IconButton } from '@/design-system/primitives/IconButton';
import { Button } from '@/design-system/primitives/Button';
import { RecitationControls, RecitationSettingsSheet } from '../components/RecitationControls';
import { useRecitationPlayer } from '../hooks/useRecitationPlayer';
import { SegmentedControl, useToast } from '@/design-system/components';
import { useAppTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';
import { radii } from '@/design-system/tokens/radii';
import { useAyahRange, useQuranSurahs } from '../api/quranQueries';
import { useSetLastRead } from '../api/quranMutations';
import { AyahRow } from '../components/AyahRow';
import { useBookmarkRefs, useToggleBookmark } from '@/features/bookmarks';
import type { Ayah } from '@/types';

type ReaderMode = 'arabic' | 'both' | 'english';

const MAX_SURAH_AYAHS = 300;
const BASMALA = 'بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ';
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

function toArabicDigits(value: number): string {
  return String(value)
    .split('')
    .map((digit) => ARABIC_DIGITS[Number(digit)])
    .join('');
}

function withoutBasmalaPrefix(ayah: Ayah): Ayah {
  if (ayah.ayahNumber !== 1 || !ayah.textArabic.startsWith(BASMALA)) return ayah;
  return {
    ...ayah,
    textArabic: ayah.textArabic.slice(BASMALA.length).trim(),
  };
}

function BasmalaHeader({
  surahId,
  mode,
}: {
  surahId: number;
  mode: ReaderMode;
}) {
  if (surahId === 9 || (surahId === 1 && mode === 'both')) return null;

  const fatihaMarker = surahId === 1 ? ` ${toArabicDigits(1)}` : '';
  return (
    <VStack gap={1} style={{ paddingVertical: spacing[5], alignItems: 'center' }}>
      <ArabicText
        variant="quran"
        size={25}
        lineHeight={42}
        style={{ textAlign: 'center', writingDirection: 'rtl' }}
      >
        {`${BASMALA}${fatihaMarker}`}
      </ArabicText>
    </VStack>
  );
}

function ArabicMushafView({ surahId, ayahs }: { surahId: number; ayahs: Ayah[] }) {
  const visibleAyahs = surahId === 1 ? ayahs.slice(1) : ayahs.map(withoutBasmalaPrefix);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: spacing[12] }}
    >
      <BasmalaHeader surahId={surahId} mode="arabic" />
      <ArabicText
        variant="quran"
        size={26}
        lineHeight={52}
        style={{ textAlign: 'justify', writingDirection: 'rtl' }}
      >
        {visibleAyahs.map((ayah) => (
          <Fragment key={`${ayah.surahId}-${ayah.ayahNumber}`}>
            {`${ayah.textArabic} `}
            <NativeText style={{ fontSize: 22 }}>{`${toArabicDigits(ayah.ayahNumber)} `}</NativeText>
          </Fragment>
        ))}
      </ArabicText>
    </ScrollView>
  );
}

function EnglishBookView({ surahId, ayahs }: { surahId: number; ayahs: Ayah[] }) {
  const { tokens } = useAppTheme();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: spacing[12] }}
    >
      <BasmalaHeader surahId={surahId} mode="english" />
      <View
        style={{
          backgroundColor: tokens.background.secondary,
          borderColor: tokens.border.subtle,
          borderWidth: 1,
          borderRadius: radii.lg,
          padding: spacing[5],
        }}
      >
        <Text
          variant="bodyLg"
          style={{ fontSize: 17, lineHeight: 30, textAlign: 'justify' }}
        >
          {ayahs.map((ayah) => (
            <Fragment key={`${ayah.surahId}-${ayah.ayahNumber}`}>
              {`${ayah.textTranslation} `}
              <NativeText
                style={{ color: tokens.brand.primary, fontWeight: '600', fontSize: 13 }}
              >
                {`(${ayah.ayahNumber}) `}
              </NativeText>
            </Fragment>
          ))}
        </Text>
      </View>
    </ScrollView>
  );
}

/** Continuous Arabic, translation-only, and detailed parallel Quran reader. */
export function QuranReaderScreen() {
  const router = useRouter();
  const { surahId: surahIdParam } = useLocalSearchParams<{ surahId: string }>();
  const surahId = Number(surahIdParam);
  const [readerMode, setReaderMode] = useState<ReaderMode>('both');
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false);
  const { data: surahs } = useQuranSurahs();
  const { data: ayahs, isLoading } = useAyahRange(surahId, 1, MAX_SURAH_AYAHS);
  const setLastRead = useSetLastRead();
  const { data: bookmarkRefs = [] } = useBookmarkRefs('quran');
  const toggleBookmark = useToggleBookmark();
  const { player, state: audioState } = useRecitationPlayer(surahId, ayahs?.length ?? MAX_SURAH_AYAHS);
  const { show: showToast } = useToast();
  const returnToSurahList = useCallback(() => {
    router.replace('/(tabs)/quran');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        returnToSurahList();
        return true;
      });

      return () => subscription.remove();
    }, [returnToSurahList])
  );

  const surah = useMemo(
    () => surahs?.find((candidate) => candidate.id === surahId),
    [surahId, surahs]
  );
  const detailedAyahs = useMemo(() => {
    if (!ayahs) return [];
    if (surahId === 1) return ayahs;
    return ayahs.map(withoutBasmalaPrefix);
  }, [ayahs, surahId]);
  const bookmarkedRefs = useMemo(() => new Set(bookmarkRefs), [bookmarkRefs]);

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
      <VStack gap={3} style={{ flex: 1, paddingTop: spacing[3] }}>
        <HStack gap={2} align="center">
          <IconButton
            name="ArrowLeft"
            variant="soft"
            size={20}
            accessibilityLabel="Back to Quran surah list"
            onPress={returnToSurahList}
          />
          <VStack gap={0} style={{ flex: 1 }}>
            <Text variant="headingLg">
              {surah?.nameTransliteration ?? `Surah ${surahId}`}
            </Text>
            {surah ? (
              <Text variant="caption" color="secondary">
                {surah.nameTranslation}
              </Text>
            ) : null}
          </VStack>
          <Button label="Play Audio" size="sm" variant="secondary" onPress={() => setAudioSettingsOpen(true)} />
        </HStack>

        <SegmentedControl
          compact
          value={readerMode}
          onChange={setReaderMode}
          options={[
            { value: 'arabic', label: 'Arabic' },
            { value: 'both', label: 'Both' },
            { value: 'english', label: 'English' },
          ]}
        />

        <View style={{ flex: 1 }}>
          {readerMode === 'arabic' ? (
            <ArabicMushafView surahId={surahId} ayahs={ayahs} />
          ) : readerMode === 'english' ? (
            <EnglishBookView surahId={surahId} ayahs={ayahs} />
          ) : (
            <FlashList<Ayah>
              data={detailedAyahs}
              extraData={bookmarkRefs}
              keyExtractor={(item) => `${item.surahId}-${item.ayahNumber}`}
              estimatedItemSize={140}
              ListHeaderComponent={
                <BasmalaHeader surahId={surahId} mode="both" />
              }
              onViewableItemsChanged={({ viewableItems }) => {
                const first = viewableItems[0]?.item;
                if (first) {
                  setLastRead.mutate({
                    surahId: first.surahId,
                    ayahNumber: first.ayahNumber,
                    surahName: surah?.nameTransliteration ?? `Surah ${first.surahId}`,
                    updatedAt: new Date().toISOString(),
                  });
                }
              }}
              renderItem={({ item }) => (
                <AyahRow
                  ayah={item}
                  showTranslation
                  isBookmarked={bookmarkedRefs.has(`${item.surahId}:${item.ayahNumber}`)}
                  onToggleBookmark={() => {
                    toggleBookmark.mutate(
                      { contentType: 'quran', contentRef: `${item.surahId}:${item.ayahNumber}` },
                      {
                        onError: () => showToast('Could not update bookmark', 'error'),
                      }
                    );
                  }}
                  onPlayAudio={() => {
                    player.start({ start: item.ayahNumber, end: item.ayahNumber, repeat: 0 });
                  }}
                />
              )}
            />
          )}
        </View>
        <RecitationControls player={player} state={audioState} onSettings={() => setAudioSettingsOpen(true)} />
      </VStack>
      {audioSettingsOpen ? <RecitationSettingsSheet key={surahId} count={ayahs.length} initial={audioState.settings}
        onCancel={() => setAudioSettingsOpen(false)} onPlay={(settings) => { setAudioSettingsOpen(false); player.start(settings); }} /> : null}
    </ScreenWrapper>
  );
}
