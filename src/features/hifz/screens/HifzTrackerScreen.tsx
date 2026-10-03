import React, { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { ScreenWrapper } from '@/components';
import { HStack, VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Input } from '@/design-system/primitives/Input';
import { Icon } from '@/design-system/primitives/Icon';
import { Card, ProgressBar, Skeleton } from '@/design-system/components';
import { useAppTheme } from '@/design-system/theme';
import { useQuranSurahs } from '@/features/quran';
import { useManualHifzProgress } from '../api/hifzQueries';

function ProgressRing({ progress }: { progress: number }) {
  const { tokens } = useAppTheme();
  const circumference = 2 * Math.PI * 27;
  return (
    <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={64} height={64} style={{ position: 'absolute' }}>
        <Circle cx={32} cy={32} r={27} stroke={tokens.border.strong} strokeWidth={4} fill="none" />
        <Circle cx={32} cy={32} r={27} stroke={tokens.semantic.success} strokeWidth={4} fill="none"
          strokeDasharray={[circumference, circumference]} strokeDashoffset={circumference * (1 - progress)}
          rotation={-90} origin="32,32" strokeLinecap="round" />
      </Svg>
      <Text variant="caption" weight="700">{Math.floor(progress * 100)}%</Text>
    </View>
  );
}

export function HifzTrackerScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data: surahs, isError: surahError } = useQuranSurahs();
  const { data: progress, isError: progressError } = useManualHifzProgress();
  const counts = useMemo(() => {
    const result = new Map<number, number>();
    progress?.forEach((entry) => {
      if (entry.status === 'memorized' || entry.status === 'strong') {
        result.set(entry.surahId, (result.get(entry.surahId) ?? 0) + 1);
      }
    });
    return result;
  }, [progress]);
  const total = surahs?.reduce((sum, s) => sum + s.ayahCount, 0) || 6236;
  const memorized = surahs?.reduce((sum, s) => sum + Math.min(counts.get(s.id) ?? 0, s.ayahCount), 0) ?? 0;
  const complete = surahs?.filter((s) => (counts.get(s.id) ?? 0) >= s.ayahCount).length ?? 0;
  const filtered = surahs?.filter((s) => [s.id, s.nameTransliteration, s.nameTranslation, s.nameArabic].join(' ').toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <ScreenWrapper contentStyle={{ flex: 1, paddingBottom: 0 }}>
      <FlatList data={progress ? filtered ?? [] : []} keyExtractor={(s) => String(s.id)}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 110 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <VStack gap={4} style={{ marginBottom: 16 }}>
            <VStack gap={1}>
              <Text variant="headingLg">Your Hifz journey</Text>
              <Text variant="bodySm" color="secondary">One ayah at a time, at your own pace.</Text>
            </VStack>
            <Card>
              {!progress || !surahs ? <Skeleton height={110} /> : <VStack gap={3}>
                <HStack justify="space-between" align="center">
                  <VStack gap={1}><Text variant="caption" color="secondary">QURAN MEMORIZED</Text>
                    <Text variant="displayLg">{(memorized / total * 100).toFixed(2)}%</Text></VStack>
                  <Icon name="BookOpenCheck" color="brand" size={36} />
                </HStack>
                <ProgressBar progress={memorized / total} accessibilityLabel="Manually memorized Quran" />
                <HStack justify="space-between">
                  <Text variant="bodySm">{memorized} / {total} ayahs</Text>
                  <Text variant="bodySm">{complete} / {surahs.length} surahs</Text>
                </HStack>
              </VStack>}
            </Card>
            <Card onPress={() => router.push('/(tabs)/hifz/setup')}>
              <HStack gap={3} align="center">
                <Icon name="Mic" color="brand" size={25} />
                <VStack gap={1} style={{ flex: 1 }}>
                  <Text weight="600">Recitation checker</Text>
                  <Text variant="caption" color="secondary">Practice a passage with AI feedback</Text>
                </VStack>
                <Icon name="ChevronRight" color="secondary" />
              </HStack>
            </Card>
            <Text variant="caption" color="secondary">Only ayahs you mark as memorized count toward your progress.</Text>
            <Input placeholder="Find a surah" value={search} onChangeText={setSearch} />
          </VStack>
        }
        ListEmptyComponent={<Text color="secondary">{surahError || progressError ? 'Could not load your progress. Reopen Hifz to try again.' : !progress || !surahs ? 'Loading surahs…' : 'No matching surahs.'}</Text>}
        renderItem={({ item }) => {
          const count = counts.get(item.id) ?? 0;
          return <Card style={{ marginBottom: 12 }} onPress={() => router.push({ pathname: '/(tabs)/hifz/[surahId]', params: { surahId: item.id } })}>
            <HStack gap={3} align="center">
              <ProgressRing progress={Math.min(count / item.ayahCount, 1)} />
              <VStack gap={1} style={{ flex: 1 }}>
                <Text weight="600">{item.id}. {item.nameTransliteration}</Text>
                <Text variant="caption" color="secondary">{item.nameTranslation}</Text>
                <Text variant="caption" color={count === item.ayahCount ? 'success' : 'secondary'}>{count} / {item.ayahCount} ayahs memorized</Text>
              </VStack>
              <Icon name="ChevronRight" color="muted" size={18} />
            </HStack>
          </Card>;
        }} />
    </ScreenWrapper>
  );
}
