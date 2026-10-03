import React from 'react';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components';
import { VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { useQuranSurahs } from '@/features/quran';
import { SurahAyahPicker } from '../components/SurahAyahPicker';
import { useHifzSessionStore } from '../store/useHifzSessionStore';

/** Wireframe screen 04 -> "New Hifz Session" flow entry point. */
export function HifzSetupScreen() {
  const router = useRouter();
  const { data: surahs } = useQuranSurahs();
  const beginSession = useHifzSessionStore((s) => s.beginSession);

  return (
    <ScreenWrapper edges={['left', 'right']}>
      <VStack gap={4} style={{ flex: 1, paddingTop: 16 }}>
        <Text variant="headingLg">Choose your passage</Text>
        <Text variant="bodySm" color="secondary">
          Choose a surah and ayah range to check your recitation. Results do not change your memorization progress.
        </Text>
        {surahs ? (
          <SurahAyahPicker
            surahs={surahs}
            onSelect={(surahId, startAyah, endAyah) => {
              beginSession(surahId, startAyah, endAyah);
              router.push('/(tabs)/hifz/session');
            }}
          />
        ) : null}
      </VStack>
    </ScreenWrapper>
  );
}
