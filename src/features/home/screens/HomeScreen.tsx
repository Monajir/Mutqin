import React from 'react';
import { View } from 'react-native';
import { ArabicText, ScreenWrapper } from '@/components';
import { HStack, VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Icon } from '@/design-system/primitives/Icon';
import { IconButton } from '@/design-system/primitives/IconButton';
import { Card, Skeleton, useToast } from '@/design-system/components';
import { useAppTheme } from '@/design-system/theme';
import { fontFamilies } from '@/design-system/tokens/typography';
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
  const { prayerTimes, hifzStats, dailyVerse, dailyHadith, hijriDate } = useHomeData();
  const { data: quranBookmarkRefs = [] } = useBookmarkRefs('quran');
  const toggleBookmark = useToggleBookmark();
  const dailyVerseRef = dailyVerse ? `${dailyVerse.surahId}:${dailyVerse.ayahNumber}` : '';

  return (
    <ScreenWrapper scroll>
      <VStack gap={5} style={{ paddingTop: 12 }}>
        <HStack justify="space-between" align="center">
          <VStack gap={2} style={{ flex: 1, marginRight: 16 }}>
            <ArabicText variant="ui" size={30} lineHeight={44}
              style={{ fontFamily: fontFamilies.quran, textAlign: 'left', color: tokens.brand.primary }}>
              السلام عليكم
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

              <HStack justify="space-between" align="stretch">
                {prayerTimes.prayers.map((prayer: PrayerTimeEntry) => {
                  const active = prayer.name === prayerTimes.nextPrayer;
                  return (
                    <VStack
                      key={prayer.name}
                      gap={1}
                      align="center"
                      accessible
                      accessibilityLabel={`${prayer.name}, ${formatTime(new Date(prayer.time))}${active ? ', next prayer' : ''}`}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        paddingTop: 8,
                        paddingBottom: 18,
                      }}
                    >
                      <Icon
                        name={prayerIcons[prayer.name]}
                        size={17}
                        color={active ? 'brand' : 'secondary'}
                      />
                      <Text variant="caption" color={active ? 'brand' : 'secondary'} weight="600" numberOfLines={1} adjustsFontSizeToFit>
                        {prayer.name}
                      </Text>
                      <Text variant="caption" color={active ? 'primary' : 'muted'}
                        weight={active ? '600' : '400'} style={{ textAlign: 'center', marginTop: 3 }}>
                        {formatTime(new Date(prayer.time))}
                      </Text>
                      {active ? <View pointerEvents="none" style={{
                        position: 'absolute', bottom: 2, width: 24, height: 3,
                        borderRadius: 2, backgroundColor: tokens.brand.primary,
                      }} /> : null}
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
          <HifzProgressWidget stats={hifzStats} />
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
