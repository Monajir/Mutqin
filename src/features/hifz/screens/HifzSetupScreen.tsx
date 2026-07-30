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
    <ScreenWrapper>
      <VStack gap={4} style={{ flex: 1, paddingTop: 16 }}>
        <Text variant="headingLg">New Hifz Session</Text>
        <Text variant="bodySm" color="secondary">
          Choose the surah and starting ayah you'll recite from memory.
        </Text>
        {surahs ? (
          <SurahAyahPicker
            surahs={surahs}
            onSelect={(surahId, startAyah) => {
              beginSession(surahId, startAyah);
              router.push('/(tabs)/hifz/session');
            }}
          />
        ) : null}
      </VStack>
    </ScreenWrapper>
  );
}
