import React, { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { EmptyState, ScreenWrapper } from '@/components';
import { VStack, HStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Button } from '@/design-system/primitives/Button';
import { Divider } from '@/design-system/primitives/Divider';
import { useToast } from '@/design-system/components';
import { useAppTheme } from '@/design-system/theme';
import { useAyahRange } from '@/features/quran';
import { useHifzSessionStore } from '../store/useHifzSessionStore';
import { useHifzSession } from '../hooks/useHifzSession';
import { VerseRevealer } from '../components/VerseRevealer';
import { RecordButton } from '../components/RecordButton';
import { AccuracySummaryCard } from '../components/AccuracySummaryCard';
import { useApplyEvaluationResult } from '../api/hifzMutations';
import { hifzRepository } from '../api/hifzRepository';

/**
 * Main AI Hifz recitation view. The selected range stays hidden while
 * recording, then the evaluation is displayed in place with word-level
 * feedback and save/retry actions.
 */
export function HifzSessionScreen() {
  const router = useRouter();
  const toast = useToast();
  const { tokens } = useAppTheme();
  const applyEvaluation = useApplyEvaluationResult();
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
      <ScreenWrapper>
        <EmptyState variant="no-data" title="No active session" description="Start a new Hifz session from the Hifz tab." />
      </ScreenWrapper>
    );
  }

  if (!ayahs || ayahs.length === 0) {
    return (
      <ScreenWrapper>
        <EmptyState variant="no-data" title="Loading verses..." />
      </ScreenWrapper>
    );
  }

  const activeAyah = ayahs[0]!;
  const isReviewing = phase === 'summary' && result !== null;

  const acceptResult = async () => {
    if (!result) return;

    try {
      await applyEvaluation.mutateAsync(result);
      hifzRepository.saveSession({
        id: `${surahId}-${startAyah}-${Date.now()}`,
        surahId,
        startAyah,
        endAyah: result.ayahs.at(-1)?.ayah.ayahNumber ?? null,
        overallAccuracy: result.overallAccuracy,
      });
      reset();
      router.replace('/(tabs)/hifz');
    } catch {
      toast.show('Could not save this result. Please try again.', 'error');
    }
  };

  return (
    <ScreenWrapper scroll>
      <VStack gap={5} style={{ paddingTop: 16, flex: 1 }}>
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
            <HStack gap={4} justify="center">
              <Text variant="caption" style={{ color: tokens.hifz.correct }}>● Matched</Text>
              <Text variant="caption" style={{ color: tokens.hifz.incorrect }}>● Review word</Text>
            </HStack>
            <AccuracySummaryCard result={result} />
            <Text variant="caption" color="secondary">
              AI may mishear your voice. Red words need review, not necessarily correction. Save only after checking the feedback.
            </Text>
            <HStack gap={3}>
              <Button
                label="Retry"
                variant="secondary"
                style={{ flex: 1 }}
                disabled={applyEvaluation.isPending}
                onPress={retrySameRange}
              />
              <Button
                label="Confirm & Save"
                style={{ flex: 1 }}
                loading={applyEvaluation.isPending}
                onPress={acceptResult}
              />
            </HStack>
          </VStack>
        ) : (
          <VStack align="center" style={{ marginTop: 'auto', paddingVertical: 24 }}>
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
        )}
      </VStack>
    </ScreenWrapper>
  );
}
