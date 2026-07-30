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

const LOOKAHEAD_AYAH_COUNT = 15;

/**
 * Wireframe screen 05 — the flagship AI Hifz Assistant recitation view.
 * Renders already-passed ayahs normally and the active ayah obscured/
 * progressively revealed via VerseRevealer, per spec §6.
 */
export function HifzSessionScreen() {
  const router = useRouter();
  const { surahId, startAyah, revealedWords, phase, result } = useHifzSessionStore();

  const expectedAyahs = useMemo(() => {
    if (surahId === null || startAyah === null) return [];
    return Array.from({ length: LOOKAHEAD_AYAH_COUNT }, (_, i) => ({ surahId, ayahNumber: startAyah + i }));
  }, [surahId, startAyah]);

  const { data: ayahs } = useAyahRange(surahId, startAyah, LOOKAHEAD_AYAH_COUNT);
  const session = useHifzSession(expectedAyahs);

  React.useEffect(() => {
    if (phase === 'summary' && result) {
      router.push('/(modals)/hifz-summary');
    }
  }, [phase, result, router]);

  if (surahId === null || startAyah === null) {
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
          {`Surah ${activeAyah.surahId} · Ayah ${activeAyah.ayahNumber} onward`}
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
            disabled={session.isEvaluating}
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
