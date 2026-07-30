import React from 'react';
import { ScreenWrapper } from '@/components';
import { VStack, HStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Skeleton } from '@/design-system/components';
import { useHomeData } from '../api/useHomeData';
import { DailyVerseCard } from '../components/DailyVerseCard';
import { DailyHadithCard } from '../components/DailyHadithCard';
import { HifzProgressWidget } from '../components/HifzProgressWidget';
import { QuickActions } from '../components/QuickActions';
import { formatCountdown } from '@/features/prayer';
import { i18n } from '@/i18n';

/** Wireframe screen 01 — the app's landing screen: "what's now" at a glance (spec §5). */
export function HomeScreen() {
  const { prayerTimes, hifzStats, revisionDueCount, dailyContent, hijriDate, isLoading } = useHomeData();

  return (
    <ScreenWrapper scroll>
      <VStack gap={5} style={{ paddingTop: 16, paddingBottom: 24 }}>
        <VStack gap={1}>
          <Text variant="headingLg">{i18n.t('home.greeting')}</Text>
          <Text variant="bodySm" color="secondary">
            {hijriDate}
          </Text>
        </VStack>

        {prayerTimes ? (
          <VStack gap={1}>
            <HStack justify="space-between">
              <Text variant="bodySm" color="secondary">
                {prayerTimes.currentPrayer ? `Current — ${prayerTimes.currentPrayer}` : 'Prayer'}
              </Text>
              <Text variant="bodySm" color="secondary">
                {`Next: ${prayerTimes.nextPrayer} in ${formatCountdown(prayerTimes.nextPrayerCountdownSec)}`}
              </Text>
            </HStack>
          </VStack>
        ) : (
          <Skeleton height={20} />
        )}

        {dailyContent ? (
          <DailyVerseCard
            arabic={dailyContent.verseArabic}
            translation={dailyContent.verseTranslation}
            reference={dailyContent.verseReference}
            onBookmark={() => {}}
          />
        ) : (
          <Skeleton height={140} />
        )}

        {dailyContent ? (
          <DailyHadithCard excerpt={dailyContent.hadithExcerpt} source={dailyContent.hadithSource} />
        ) : (
          <Skeleton height={100} />
        )}

        {hifzStats ? (
          <HifzProgressWidget stats={hifzStats} revisionDueCount={revisionDueCount} />
        ) : (
          <Skeleton height={90} />
        )}

        <VStack gap={2}>
          <Text variant="headingSm">{i18n.t('home.quickActions')}</Text>
          <QuickActions />
        </VStack>
      </VStack>
    </ScreenWrapper>
  );
}
