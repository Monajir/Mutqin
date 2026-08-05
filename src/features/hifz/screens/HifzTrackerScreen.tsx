import React from 'react';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components';
import { HStack, VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Button } from '@/design-system/primitives/Button';
import { Icon } from '@/design-system/primitives/Icon';
import { Card, ProgressBar, Skeleton } from '@/design-system/components';
import { useAppTheme } from '@/design-system/theme';
import { useHifzOverallStats, useHifzJuzSummary, useHifzRevisionQueue } from '../api/hifzQueries';
import { ProgressJuzList } from '../components/ProgressJuzList';

export function HifzTrackerScreen() {
  const router = useRouter();
  const { tokens } = useAppTheme();
  const { data: stats, isLoading: statsLoading } = useHifzOverallStats();
  const { data: juzSummary, isLoading: juzLoading } = useHifzJuzSummary();
  const { data: revisionQueue } = useHifzRevisionQueue();

  return (
    <ScreenWrapper scroll>
      <VStack gap={5} style={{ paddingTop: 12 }}>
        <VStack gap={1}>
          <Text variant="headingLg">Hifz Journey</Text>
          <Text variant="bodySm" color="secondary">Build consistency, one ayah at a time</Text>
        </VStack>

        <Card
          style={{
            backgroundColor: tokens.background.elevated,
            borderColor: tokens.border.strong,
            overflow: 'hidden',
          }}
        >
          <VStack gap={4}>
            <HStack justify="space-between">
              <HStack gap={3}>
                <HStack
                  align="center"
                  justify="center"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: tokens.background.secondary,
                  }}
                >
                  <Icon name="RotateCcw" color="brand" size={23} />
                </HStack>
                <VStack gap={1}>
                  <Text variant="caption" color="brand" weight="700">TODAY'S REVISION</Text>
                  <Text variant="headingSm">{`${revisionQueue?.length ?? 0} ayahs due`}</Text>
                </VStack>
              </HStack>
            </HStack>
            <Button
              label="Start Revision"
              fullWidth
              leftIcon={<Icon name="Play" color="inverse" size={17} />}
              onPress={() => router.push('/(tabs)/hifz/setup')}
            />
          </VStack>
        </Card>

        <Button
          label="New Hifz Session"
          variant="secondary"
          fullWidth
          leftIcon={<Icon name="Plus" color="brand" size={18} />}
          onPress={() => router.push('/(tabs)/hifz/setup')}
        />

        <VStack gap={2}>
          <Text variant="headingSm">Your Progress</Text>
          <Card>
            {statsLoading || !stats ? (
              <Skeleton height={70} />
            ) : (
              <VStack gap={3}>
                <HStack justify="space-between">
                  <VStack gap={1}>
                    <Text variant="caption" color="secondary">OVERALL COMPLETION</Text>
                    <Text variant="displaySm">{`${Math.round(stats.overallPercentComplete * 100)}%`}</Text>
                  </VStack>
                  <Icon name="TrendingUp" color="brand" size={25} />
                </HStack>
                <ProgressBar progress={stats.overallPercentComplete} accessibilityLabel="Overall Hifz progress" />
                <HStack justify="space-between">
                  <Text variant="caption" color="success">{`${stats.strongAyahCount} strong`}</Text>
                  <Text variant="caption" color="warning">{`${stats.weakAyahCount} need review`}</Text>
                </HStack>
              </VStack>
            )}
          </Card>
        </VStack>

        <VStack gap={2} style={{ minHeight: 360 }}>
          <Text variant="headingSm">Juz Progress</Text>
          <Card style={{ minHeight: 320 }}>
            {juzLoading || !juzSummary ? <Skeleton height={260} /> : <ProgressJuzList data={juzSummary} />}
          </Card>
        </VStack>
      </VStack>
    </ScreenWrapper>
  );
}
