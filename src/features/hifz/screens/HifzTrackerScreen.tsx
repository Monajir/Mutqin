import React from 'react';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components';
import { VStack, HStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Button } from '@/design-system/primitives/Button';
import { ProgressBar } from '@/design-system/components';
import { useHifzOverallStats, useHifzJuzSummary, useHifzRevisionQueue } from '../api/hifzQueries';
import { ProgressJuzList } from '../components/ProgressJuzList';
import { Skeleton } from '@/design-system/components';

/** Wireframe screen 04 (Hifz tab home): today's revision + overall progress + Juz drill-down. */
export function HifzTrackerScreen() {
  const router = useRouter();
  const { data: stats, isLoading: statsLoading } = useHifzOverallStats();
  const { data: juzSummary, isLoading: juzLoading } = useHifzJuzSummary();
  const { data: revisionQueue } = useHifzRevisionQueue();

  return (
    <ScreenWrapper scroll>
      <VStack gap={5} style={{ paddingTop: 16 }}>
        <Text variant="headingLg">Hifz</Text>

        <VStack gap={2}>
          <Text variant="headingSm">Today's Revision</Text>
          <Text variant="bodySm" color="secondary">
            {`${revisionQueue?.length ?? 0} ayahs due`}
          </Text>
          <Button label="Start Revision" onPress={() => router.push('/(tabs)/hifz/setup')} />
        </VStack>

        <Button label="+ New Hifz Session" variant="secondary" onPress={() => router.push('/(tabs)/hifz/setup')} />

        <VStack gap={2}>
          <Text variant="headingSm">Progress</Text>
          {statsLoading || !stats ? (
            <Skeleton height={40} />
          ) : (
            <VStack gap={2}>
              <HStack justify="space-between">
                <Text variant="bodySm" color="secondary">
                  Overall
                </Text>
                <Text variant="bodySm" weight="600">{`${Math.round(stats.overallPercentComplete * 100)}%`}</Text>
              </HStack>
              <ProgressBar progress={stats.overallPercentComplete} accessibilityLabel="Overall Hifz progress" />
              <HStack justify="space-between">
                <Text variant="caption" color="secondary">{`Strong ${stats.strongAyahCount}`}</Text>
                <Text variant="caption" color="secondary">{`Weak ${stats.weakAyahCount}`}</Text>
              </HStack>
            </VStack>
          )}
        </VStack>

        <VStack gap={2} style={{ minHeight: 300 }}>
          <Text variant="headingSm">Juz Progress</Text>
          {juzLoading || !juzSummary ? <Skeleton height={200} /> : <ProgressJuzList data={juzSummary} />}
        </VStack>
      </VStack>
    </ScreenWrapper>
  );
}
