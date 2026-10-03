import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScreenWrapper } from '@/components';
import { useAyahRange, useQuranSurahs } from '@/features/quran';
import { getJson, setJson } from '@/services/storage/mmkv';
import { HStack, VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Icon, type IconName } from '@/design-system/primitives/Icon';
import { ProgressBar } from '@/design-system/components';
import { fontFamilies } from '@/design-system/tokens/typography';
import { useAppTheme } from '@/design-system/theme';
import { useManualHifzProgress } from '../api/hifzQueries';
import { useUpdateHifzStatus } from '../api/hifzMutations';
import { useAyahPlayback } from '../hooks/useAyahPlayback';

function Control({ icon, label, onPress, disabled = false, selected = false, prominent = false }: {
  icon: IconName; label: string; onPress: () => void; disabled?: boolean; selected?: boolean; prominent?: boolean;
}) {
  const { tokens } = useAppTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ width: prominent ? 64 : 52, height: prominent ? 64 : 56, borderRadius: 32,
      alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.3 : pressed ? 0.65 : 1,
      backgroundColor: selected ? tokens.semantic.success : prominent ? tokens.brand.primary : tokens.background.secondary })}>
    <Icon name={icon} size={26} color={prominent ? 'inverse' : 'primary'} />
  </Pressable>;
}

function AyahReader({ surahId }: { surahId: number }) {
  const { tokens } = useAppTheme();
  const { data: surahs } = useQuranSurahs();
  const surah = surahs?.find((s) => s.id === surahId);
  const positionKey = `hifz.manual.position.${surahId}`;
  const [position, setPosition] = useState(() => {
    const saved = getJson<number>(positionKey);
    return Number.isInteger(saved) && Number(saved) > 0 ? Number(saved) : 1;
  });
  const number = Math.min(position, surah?.ayahCount ?? position);
  const { data: ayahs, isError } = useAyahRange(surah ? surahId : null, number, 1);
  const ayah = ayahs?.[0];
  const { data: progress, isError: progressError } = useManualHifzProgress();
  const mutation = useUpdateHifzStatus();
  const entry = progress?.find((p) => p.surahId === surahId && p.ayahNumber === number);
  const memorized = entry?.status === 'memorized' || entry?.status === 'strong';
  const count = progress?.filter((p) => p.surahId === surahId && (p.status === 'memorized' || p.status === 'strong')).length ?? 0;
  const audio = useAyahPlayback(surahId, number);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    if (surah) setJson(positionKey, number);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [positionKey, number, surah]);

  if (!surah) return <ScreenWrapper edges={['left', 'right']}><Text>{surahs ? 'Surah not found.' : 'Loading surah…'}</Text></ScreenWrapper>;
  return <ScreenWrapper edges={['left', 'right']} contentStyle={{ flex: 1 }}>
    <Stack.Screen options={{ title: surah.nameTransliteration }} />
    <VStack gap={2} style={{ paddingTop: 12 }}>
      <HStack justify="space-between">
        <Text variant="caption" color="secondary">{count} / {surah.ayahCount} memorized</Text>
        <Text variant="caption" color="brand">Ayah {number} of {surah.ayahCount}</Text>
      </HStack>
      <ProgressBar progress={count / surah.ayahCount} accessibilityLabel="Surah memorization progress" />
    </VStack>
    <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 28 }}>
      {!ayah ? <Text align="center">{isError ? 'Could not load this ayah.' : 'Loading ayah…'}</Text> : <VStack gap={5}>
        <Text align="center" color="brand" weight="600">{surahId}:{number}</Text>
        <Text variant="arabicAyah" align="center" style={{ fontFamily: fontFamilies.quran, fontSize: 32, lineHeight: 64, writingDirection: 'rtl' }}>{ayah.textArabic}</Text>
        <Text align="center" color="secondary">{ayah.textTranslation}</Text>
      </VStack>}
    </ScrollView>
    <VStack gap={3}>
      <Text align="center" variant="bodySm" color={memorized ? 'success' : 'secondary'} accessibilityLiveRegion="polite">
        {memorized ? 'Memorized · tap the check to undo' : 'Tap the check when you have memorized this ayah'}
      </Text>
      {mutation.isError || progressError ? <Text variant="caption" color="error">Could not load or save progress. Please try again.</Text> : null}
      {audio.error ? <Text variant="caption" color="error">{audio.error}</Text> : null}
      <HStack justify="space-between" align="center" style={{ padding: 12, borderRadius: 32, backgroundColor: tokens.background.elevated, borderWidth: 1, borderColor: tokens.border.strong }}>
        {audio.loading ? <ActivityIndicator style={{ width: 52 }} color={tokens.brand.primary} /> : <Control icon={audio.playing ? 'Pause' : 'Play'} label={audio.playing ? 'Pause ayah' : 'Play this ayah'} disabled={!ayah} onPress={() => void audio.toggle()} />}
        <Control icon="ChevronLeft" label="Previous ayah" disabled={number <= 1 || mutation.isPending} onPress={() => { mutation.reset(); setPosition(number - 1); }} />
        <Control icon="Check" label={memorized ? 'Unmark ayah as memorized' : 'Mark ayah as memorized'} selected={memorized} prominent
          disabled={!ayah || !progress || mutation.isPending} onPress={() => mutation.mutate({ surahId, ayahNumber: number, status: memorized ? 'not_started' : 'memorized' })} />
        <Control icon="ChevronRight" label="Next ayah" disabled={number >= surah.ayahCount || mutation.isPending} onPress={() => { mutation.reset(); setPosition(number + 1); }} />
      </HStack>
      <Text variant="caption" color="muted" align="center">Mishary Alafasy · audio requires internet</Text>
    </VStack>
  </ScreenWrapper>;
}

export function HifzAyahScreen() {
  const { surahId } = useLocalSearchParams<{ surahId: string }>();
  return <AyahReader key={surahId} surahId={Number(surahId)} />;
}
