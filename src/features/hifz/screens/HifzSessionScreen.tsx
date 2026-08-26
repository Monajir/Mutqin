import React, { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components';
import { ArabicText } from '@/components';
import { VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Divider } from '@/design-system/primitives/Divider';
import { useAyahRange } from '@/features/quran';
import { useHifzSessionStore } from '../store/useHifzSessionStore';
import { useHifzSession } from '../hooks/useHifzSession';
import { VerseRevealer } from '../components/VerseRevealer';
import { RecordButton } from '../components/RecordButton';
import { EmptyState } from '@/components';

/**
 * Wireframe screen 05 — the main AI Hifz Assistant recitation view.
 * Renders already-passed ayahs normally and the active ayah obscured/
 * progressively revealed via VerseRevealer, per spec §6.
 */
export function HifzSessionScreen() {
  const router = useRouter();
  const { surahId, startAyah, endAyah, revealedWords, phase, result } = useHifzSessionStore();

  const ayahCount = startAyah !== null && endAyah !== null ? endAyah - startAyah + 1 : 0;
  const { data: ayahs } = useAyahRange(surahId, startAyah, ayahCount);
  const expectedAyahs = useMemo(
    () => ayahs?.map((ayah) => ({ surahId: ayah.surahId, ayahNumber: ayah.ayahNumber })) ?? [],
    [ayahs]
  );
  const session = useHifzSession(expectedAyahs);

  React.useEffect(() => {
    if (phase === 'summary' && result) {
      router.push('/(modals)/hifz-summary');
    }
  }, [phase, result, router]);

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
  const activeKey = `${activeAyah.surahId}-${activeAyah.ayahNumber}`;
  const activeWordCount = activeAyah.textArabic.split(' ').length;

  return (
    <ScreenWrapper scroll>
      <VStack gap={5} style={{ paddingTop: 16, flex: 1 }}>
        <Text variant="bodySm" color="secondary">
          {`Surah ${activeAyah.surahId} · Ayahs ${startAyah}–${endAyah}`}
        </Text>

        <VerseRevealer
          fullText={activeAyah.textArabic}
          revealedWords={revealedWords[activeKey] ?? []}
          totalWordCount={activeWordCount}
        />

        <Divider />

        <VStack gap={3}>
          {ayahs.slice(1, 4).map((ayah) => (
            <ArabicText key={ayah.ayahNumber} variant="quran" color="muted">
              {ayah.textArabic}
            </ArabicText>
          ))}
        </VStack>

        <VStack align="center" style={{ marginTop: 'auto', paddingVertical: 24 }}>
          <RecordButton
            isRecording={session.isRecording}
            disabled={session.isEvaluating || expectedAyahs.length === 0}
            onPressIn={session.startHolding}
            onPressOut={session.releaseAndEvaluate}
            durationSec={session.durationSec}
          />
          {session.recorderErrorMessage ? (
            <Text variant="caption" color="error" style={{ marginTop: 8 }}>
              {session.recorderErrorMessage}
            </Text>
          ) : null}
        </VStack>
      </VStack>
    </ScreenWrapper>
  );
}
