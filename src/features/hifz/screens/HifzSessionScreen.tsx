import React, { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EmptyState, ScreenWrapper } from '@/components';
import { VStack, HStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Button } from '@/design-system/primitives/Button';
import { Divider } from '@/design-system/primitives/Divider';
import { useAppTheme } from '@/design-system/theme';
import { useAyahRange } from '@/features/quran';
import { useHifzSessionStore } from '../store/useHifzSessionStore';
import { useHifzSession } from '../hooks/useHifzSession';
import { VerseRevealer } from '../components/VerseRevealer';
import { RecordButton } from '../components/RecordButton';
import { RecordingControlsBackground } from '../components/RecordingControlsBackground';
import { AccuracySummaryCard } from '../components/AccuracySummaryCard';

/**
 * Main AI Hifz recitation view. The selected range stays hidden while
 * recording, then the evaluation is displayed in place with word-level
 * feedback and retry actions, independent of manual memorization.
 */
export function HifzSessionScreen() {
  const router = useRouter();
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [recordControlsHeight, setRecordControlsHeight] = useState(160);
  // Match the floating tab bar's 66px height and bottom inset, plus a 12px gap.
  const controlsBottom = 66 + Math.max(12, insets.bottom) + 12;
  const { surahId, startAyah, endAyah, revealedWords, phase, result, retrySameRange, reset } = useHifzSessionStore();

  const ayahCount = startAyah !== null && endAyah !== null ? endAyah - startAyah + 1 : 0;
  const { data: ayahs } = useAyahRange(surahId, startAyah, ayahCount);
  const expectedAyahs = useMemo(
    () => ayahs?.map((ayah) => ({ surahId: ayah.surahId, ayahNumber: ayah.ayahNumber })) ?? [],
    [ayahs]
  );
  const session = useHifzSession(expectedAyahs);
  const resultByAyah = useMemo(
    () => new Map(result?.ayahs.map((evaluation) => [
      `${evaluation.ayah.surahId}-${evaluation.ayah.ayahNumber}`,
      evaluation,
    ]) ?? []),
    [result]
  );

  if (surahId === null || startAyah === null || endAyah === null) {
    return (
      <ScreenWrapper edges={['left', 'right']}>
        <EmptyState variant="no-data" title="No active session" description="Choose a passage from the recitation checker." />
      </ScreenWrapper>
    );
  }

  if (!ayahs || ayahs.length === 0) {
    return (
      <ScreenWrapper edges={['left', 'right']}>
        <EmptyState variant="no-data" title="Loading verses..." />
      </ScreenWrapper>
    );
  }

  const activeAyah = ayahs[0]!;
  const isReviewing = phase === 'summary' && result !== null;

  const finish = () => {
    reset();
    router.back();
  };

  return (
    <ScreenWrapper edges={['left', 'right']} contentStyle={{ flex: 1, paddingHorizontal: 0, paddingBottom: 0 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: controlsBottom + (isReviewing ? 16 : recordControlsHeight + 16) }}
        keyboardShouldPersistTaps="handled"
      >
      <VStack gap={5}>
        <Text variant="bodySm" color="secondary">
          {`Surah ${activeAyah.surahId} · Ayahs ${startAyah}–${endAyah}`}
        </Text>

        <VStack gap={4}>
          {ayahs.map((ayah, index) => {
            const key = `${ayah.surahId}-${ayah.ayahNumber}`;
            const evaluation = resultByAyah.get(key);
            const words = isReviewing
              ? evaluation?.words ?? []
              : index === 0
                ? revealedWords[key] ?? []
                : [];

            return (
              <VStack key={key} gap={2}>
                <Text variant="caption" color="secondary">
                  {`Ayah ${ayah.ayahNumber}`}
                </Text>
                <VerseRevealer
                  fullText={ayah.textArabic}
                  revealedWords={words}
                  totalWordCount={ayah.textArabic.split(/\s+/).filter(Boolean).length}
                />
                {index < ayahs.length - 1 ? <Divider /> : null}
              </VStack>
            );
          })}
        </VStack>

        {isReviewing ? (
          <VStack gap={4}>
            <HStack gap={4} justify="center" wrap>
              <Text variant="caption" style={{ color: tokens.hifz.correct }}>● Matched</Text>
              <Text variant="caption" style={{ color: tokens.hifz.skipped }}>● Not detected</Text>
              <Text variant="caption" style={{ color: tokens.hifz.incorrect }}>● Possible mismatch</Text>
            </HStack>
            <AccuracySummaryCard result={result} />
            <Text variant="caption" color="secondary">
              AI may mishear your voice. Blue and red words need review, not necessarily correction. This feedback does not change your memorization progress.
            </Text>
            <HStack gap={3}>
              <Button
                label="Retry"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={retrySameRange}
              />
              <Button
                label="Done"
                style={{ flex: 1 }}
                onPress={finish}
              />
            </HStack>
          </VStack>
        ) : null}
      </VStack>
      </ScrollView>
      {!isReviewing ? (
        <VStack align="center"
          onLayout={(event) => setRecordControlsHeight(event.nativeEvent.layout.height)}
          style={{ position: 'absolute', left: 16, right: 16, bottom: controlsBottom,
            paddingVertical: 12, paddingHorizontal: 16, borderRadius: 24,
            backgroundColor: 'transparent', overflow: 'hidden',
            borderWidth: 1, borderColor: tokens.border.subtle }}>
            <RecordingControlsBackground />
            <RecordButton
              isRecording={session.isRecording}
              disabled={session.isEvaluating || expectedAyahs.length === 0}
              onPressIn={session.startHolding}
              onPressOut={session.releaseAndEvaluate}
              durationSec={session.durationSec}
            />
            {session.isEvaluating ? (
              <Text variant="caption" color="secondary" style={{ marginTop: 8 }}>
                Evaluating your recitation…
              </Text>
            ) : null}
            {session.recorderErrorMessage ? (
              <Text variant="caption" color="error" style={{ marginTop: 8 }}>
                {session.recorderErrorMessage}
              </Text>
            ) : null}
        </VStack>
      ) : null}
    </ScreenWrapper>
  );
}
