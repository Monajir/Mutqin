import React from 'react';
import { Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/design-system/theme';
import { Text } from '@/design-system/primitives/Text';
import { VStack, HStack } from '@/design-system/primitives/Stack';
import { IconButton } from '@/design-system/primitives/IconButton';
import { Icon } from '@/design-system/primitives/Icon';
import { Button } from '@/design-system/primitives/Button';
import { Card, useToast } from '@/design-system/components';
import { PRAYER_CALCULATION_METHODS, type PrayerName } from '@/constants';
import { formatTime } from '@/lib/dateTime';
import { usePrayerSettingsStore } from '../store/usePrayerSettingsStore';
import type { PrayerTimesForDay } from '../types/prayer.types';

export function PrayerToolsSheet({ tool, onClose, data, usingFallbackLocation }: {
  tool: 'calculation' | 'forbidden'; onClose: () => void;
  data?: PrayerTimesForDay; usingFallbackLocation: boolean;
}) {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  const methodId = usePrayerSettingsStore((s) => s.settings.calculationMethodId);
  const updateSettings = usePrayerSettingsStore((s) => s.updateSettings);
  const toast = useToast();
  const time = (name: PrayerName) => {
    const value = data?.prayers.find((p) => p.name === name)?.time;
    return value && Number.isFinite(Date.parse(value)) ? formatTime(new Date(value)) : 'Unavailable';
  };
  const openSource = (url: string) => {
    void Linking.openURL(url).catch(() => toast.show('Could not open the reference.', 'error'));
  };
  return <Modal transparent visible animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}>
      <Pressable style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} accessibilityRole="button" accessibilityLabel="Close prayer tools" onPress={onClose} />
      <View accessibilityViewIsModal style={{ maxHeight: '85%', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: tokens.background.elevated }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: Math.max(insets.bottom, 16) + 12 }}>
          <VStack gap={4}>
            <HStack justify="space-between">
              <Text variant="headingLg" style={{ flex: 1 }}>{tool === 'calculation' ? 'Calculation method' : 'Forbidden Salah Times'}</Text>
              <IconButton name="X" accessibilityLabel="Close" onPress={onClose} />
            </HStack>
            {tool === 'calculation' ? <>
              <Text variant="bodySm" color="secondary">Choose the method used by your local mosque. Your choice updates the prayer schedule and is saved on this device.</Text>
              {PRAYER_CALCULATION_METHODS.map((method) => <Pressable key={method.id}
                accessibilityRole="radio" accessibilityState={{ checked: method.id === methodId }}
                onPress={() => {
                  try { updateSettings({ calculationMethodId: method.id }); onClose(); }
                  catch { toast.show('Could not save the calculation method. Please try again.', 'error'); }
                }} style={{ borderWidth: 1, borderColor: method.id === methodId ? tokens.brand.primary : tokens.border.subtle, borderRadius: 16, padding: 16 }}>
                <HStack gap={3}><Text style={{ flex: 1 }}>{method.label}</Text>
                  <Icon name={method.id === methodId ? 'CircleCheck' : 'Circle'} color={method.id === methodId ? 'brand' : 'muted'} />
                </HStack>
              </Pressable>)}
              <Text variant="caption" color="secondary">Asr currently uses the standard shadow-length method (Shafi‘i, Maliki and Hanbali), rather than the Hanafi method. Calculation-method selection does not change this.</Text>
            </> : <>
              <Text variant="bodySm" color="secondary">Prayer restrictions relate to the sun’s position. These are today’s timetable reference points, not exact start/end windows for every restriction.</Text>
              {usingFallbackLocation ? <Text color="warning" variant="bodySm">Location is unavailable. Any reference times below use Makkah, not your current location.</Text> : null}
              {!data ? <Text color="secondary">Today’s times are unavailable or still loading. The guidance below remains available.</Text> : null}
              <Text variant="caption" color="muted">Times are displayed in your phone’s time zone.</Text>
              <Card><VStack gap={2}>
                <Text weight="600">Sunrise</Text>
                <Text color="brand">Sunrise: {time('Sunrise')}</Text>
                <Text variant="bodySm" color="secondary">Avoid prayer while the sun rises, until it has risen sufficiently above the horizon.</Text>
              </VStack></Card>
              <Card><VStack gap={2}>
                <Text weight="600">Solar noon (zenith)</Text>
                <Text color="brand">Dhuhr begins: {time('Dhuhr')}</Text>
                <Text variant="bodySm" color="secondary">Avoid prayer while the sun is at its highest point, until it passes the meridian. Dhuhr is a reference after this point; its timetable time is not the start of the restricted period.</Text>
              </VStack></Card>
              <Card><VStack gap={2}>
                <Text weight="600">Sunset</Text>
                <Text color="brand">Maghrib begins: {time('Maghrib')}</Text>
                <Text variant="bodySm" color="secondary">Avoid prayer as the sun is setting, until it has fully set. Maghrib is the timetable reference for the end of sunset.</Text>
              </VStack></Card>
              <Text weight="600">Voluntary prayers after Fajr and Asr</Text>
              <Text variant="bodySm" color="secondary">General restrictions also apply after praying Fajr until sunrise, and after praying Asr until sunset. The sunrise restriction above continues until the sun has risen sufficiently.</Text>
              <Text variant="bodySm">Fajr: {time('Fajr')} · Asr: {time('Asr')}</Text>
              <Text variant="caption" color="secondary">Exceptions depend on the prayer and school of law. Follow your local scholar’s guidance for obligatory, missed, or other exceptional prayers and precise boundaries.</Text>
              <Button variant="ghost" label="Reference: Sahih Muslim 831" onPress={() => openSource('https://sunnah.com/muslim:831')} />
              <Button variant="ghost" label="Reference: Sahih al-Bukhari 586" onPress={() => openSource('https://sunnah.com/bukhari:586')} />
            </>}
          </VStack>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
