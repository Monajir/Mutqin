import React from 'react';
import { View } from 'react-native';
import { ArabicText, ScreenWrapper } from '@/components';
import { HStack, VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Icon } from '@/design-system/primitives/Icon';
import { IconButton } from '@/design-system/primitives/IconButton';
import { Card, Skeleton, useToast } from '@/design-system/components';
import { useAppTheme } from '@/design-system/theme';
import { formatTime } from '@/lib/dateTime';
import { useHomeData } from '../api/useHomeData';
import { DailyVerseCard } from '../components/DailyVerseCard';
import { DailyHadithCard } from '../components/DailyHadithCard';
import { HifzProgressWidget } from '../components/HifzProgressWidget';
import { QuickActions } from '../components/QuickActions';
import { formatCountdown } from '@/features/prayer';
import { useBookmarkRefs, useToggleBookmark } from '@/features/bookmarks';
import type { PrayerTimeEntry } from '@/features/prayer';

const prayerIcons = {
  Fajr: 'CloudSun',
  Sunrise: 'Sunrise',
  Dhuhr: 'Sun',
  Asr: 'SunMedium',
  Maghrib: 'Sunset',
  Isha: 'MoonStar',
} as const;

export function HomeScreen() {
  const { tokens } = useAppTheme();
  const { show: showToast } = useToast();
  const { prayerTimes, hifzStats, revisionDueCount, dailyVerse, dailyHadith, hijriDate } = useHomeData();
  const { data: quranBookmarkRefs = [] } = useBookmarkRefs('quran');
  const toggleBookmark = useToggleBookmark();
  const dailyVerseRef = dailyVerse ? `${dailyVerse.surahId}:${dailyVerse.ayahNumber}` : '';

  return (
    <ScreenWrapper scroll>
      <VStack gap={5} style={{ paddingTop: 12 }}>
        <HStack justify="space-between" align="center">
          <VStack gap={1}>
            <ArabicText variant="ui" size={24} lineHeight={34}>
              السَّلَامُ عَلَيْكُمْ
            </ArabicText>
            <Text variant="bodySm" color="secondary">{hijriDate}</Text>
          </VStack>
          <IconButton name="Bell" variant="soft" accessibilityLabel="Notifications" />
        </HStack>

        {prayerTimes ? (
          <Card
            style={{
              overflow: 'hidden',
              backgroundColor: tokens.background.elevated,
              borderColor: tokens.border.strong,
            }}
          >
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: 180,
                height: 180,
                borderRadius: 90,
                right: -70,
                top: -110,
                backgroundColor: tokens.brand.primary,
                opacity: 0.18,
              }}
            />
            <VStack gap={4}>
              <HStack justify="space-between" align="flex-start">
                <VStack gap={1}>
                  <Text variant="caption" color="brand" weight="700">NEXT PRAYER</Text>
                  <Text variant="displaySm">{prayerTimes.nextPrayer}</Text>
                </VStack>
                <VStack gap={1} align="flex-end">
                  <Text variant="headingSm">{formatCountdown(prayerTimes.nextPrayerCountdownSec)}</Text>
                  <Text variant="caption" color="secondary">remaining</Text>
                </VStack>
              </HStack>

              <HStack justify="space-between">
                {prayerTimes.prayers.map((prayer: PrayerTimeEntry) => {
                  const active = prayer.name === prayerTimes.nextPrayer;
                  return (
                    <VStack
                      key={prayer.name}
                      gap={1}
                      align="center"
                      style={{
                        minWidth: 52,
                        paddingVertical: 8,
                        borderRadius: 18,
                        backgroundColor: active ? tokens.brand.primary : 'transparent',
                      }}
                    >
                      <Icon
                        name={prayerIcons[prayer.name]}
                        size={17}
                        color={active ? 'inverse' : 'secondary'}
                      />
                      <Text variant="caption" color={active ? 'inverse' : 'secondary'} weight="600">
                        {prayer.name}
                      </Text>
                      <Text variant="caption" color={active ? 'inverse' : 'muted'}>
                        {formatTime(new Date(prayer.time))}
                      </Text>
                    </VStack>
                  );
                })}
              </HStack>
            </VStack>
          </Card>
        ) : (
          <Skeleton height={172} />
        )}

        <VStack gap={3}>
          <Text variant="headingSm">Explore</Text>
          <QuickActions />
        </VStack>

        {dailyVerse ? (
          <DailyVerseCard
            arabic={dailyVerse.arabic}
            translation={dailyVerse.translation}
            reference={dailyVerse.reference}
            isBookmarked={quranBookmarkRefs.includes(dailyVerseRef)}
            onBookmark={() => {
              toggleBookmark.mutate(
                { contentType: 'quran', contentRef: dailyVerseRef },
                {
                  onSuccess: (result) => showToast(result.added ? 'Verse bookmarked' : 'Bookmark removed', 'success'),
                  onError: () => showToast('Could not update bookmark', 'error'),
                }
              );
            }}
          />
        ) : (
          <Skeleton height={190} />
        )}

        {hifzStats ? (
          <HifzProgressWidget stats={hifzStats} revisionDueCount={revisionDueCount} />
        ) : (
          <Skeleton height={110} />
        )}

        {dailyHadith ? (
          <DailyHadithCard excerpt={dailyHadith.excerpt} source={dailyHadith.source} />
        ) : (
          <Skeleton height={120} />
        )}
      </VStack>
    </ScreenWrapper>
  );
}
