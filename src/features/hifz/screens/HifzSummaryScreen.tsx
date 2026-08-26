import React from 'react';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components';
import { VStack, HStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Button } from '@/design-system/primitives/Button';
import { ListRow } from '@/design-system/components';
import { AccuracySummaryCard } from '../components/AccuracySummaryCard';
import { useHifzSessionStore } from '../store/useHifzSessionStore';
import { EmptyState } from '@/components';
import { HIFZ_STATUS_LABELS } from '../constants/hifz.constants';
import { useApplyEvaluationResult } from '../api/hifzMutations';
import { hifzRepository } from '../api/hifzRepository';
import { useToast } from '@/design-system/components';

/** Wireframe screen 06 — session results with actionable next steps. */
export function HifzSummaryScreen() {
  const router = useRouter();
  const { result, retrySameRange, reset, surahId, startAyah } = useHifzSessionStore();
  const applyEvaluation = useApplyEvaluationResult();
  const toast = useToast();

  if (!result) {
    return (
      <ScreenWrapper>
        <EmptyState variant="no-data" title="No session results" />
      </ScreenWrapper>
    );
  }

  const needsRevision = result.suggestedRevisionAyahs;

  return (
    <ScreenWrapper scroll>
      <VStack gap={5} style={{ paddingTop: 16 }}>
        <Text variant="headingLg">Session Results</Text>
        <AccuracySummaryCard result={result} />

        {needsRevision.length > 0 ? (
          <VStack gap={2}>
            <Text variant="headingSm">Needs Revision</Text>
            {needsRevision.map((ayah) => (
              <ListRow
                key={`${ayah.surahId}-${ayah.ayahNumber}`}
                title={`Ayah ${ayah.ayahNumber}`}
                subtitle={HIFZ_STATUS_LABELS.needs_revision}
                showChevron
              />
            ))}
          </VStack>
        ) : null}

        <HStack gap={3}>
          <Button
            label="Retry Same Range"
            variant="secondary"
            fullWidth
            onPress={() => {
              retrySameRange();
              router.back();
            }}
          />
        </HStack>
        <Button
          label="Accept & Continue"
          fullWidth
          loading={applyEvaluation.isPending}
          onPress={async () => {
            try {
              await applyEvaluation.mutateAsync(result);
              if (surahId !== null && startAyah !== null) {
                hifzRepository.saveSession({
                  id: `${surahId}-${startAyah}-${Date.now()}`,
                  surahId,
                  startAyah,
                  endAyah: result.ayahs.at(-1)?.ayah.ayahNumber ?? null,
                  overallAccuracy: result.overallAccuracy,
                });
              }
              reset();
              router.dismissAll();
            } catch {
              toast.show('Could not save this result. Please try again.', 'error');
            }
          }}
        />
      </VStack>
    </ScreenWrapper>
  );
}
