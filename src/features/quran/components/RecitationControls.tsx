import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/design-system/primitives/Text';
import { HStack, VStack } from '@/design-system/primitives/Stack';
import { Button } from '@/design-system/primitives/Button';
import { IconButton } from '@/design-system/primitives/IconButton';
import { Input } from '@/design-system/primitives/Input';
import { SurfaceSheen } from '@/design-system/primitives/SurfaceSheen';
import { Card, ProgressBar } from '@/design-system/components';
import { useAppTheme } from '@/design-system/theme';
import { REPEAT_OPTIONS, validSettings, cycleProgress, type Repeat, type RecitationSettings, type RecitationPlayer, type PlayerState } from '../audio/RecitationPlayer';

export function RecitationControls({ player, state, onSettings }: { player: RecitationPlayer; state: PlayerState; onSettings: () => void }) {
  if (!state.settings) return null;
  const repeat = state.settings.repeat;
  return <Card>
    <VStack gap={2}>
      <HStack justify="space-between">
        <Text variant="bodySm" weight="600">{state.loading ? 'Loading' : state.finished ? 'Finished' : state.playing ? 'Playing' : 'Paused'} · Ayah {state.ayah}</Text>
        <Text variant="caption" color="secondary">{state.settings.start}–{state.settings.end} · {repeat === 'infinite' ? 'Loop ∞' : `Play ${state.cycle + 1}/${repeat + 1}`}</Text>
      </HStack>
      <ProgressBar progress={cycleProgress(state)} accessibilityLabel="Selected passage playback progress for this cycle" />
      {state.error ? <Text variant="caption" color="error" accessibilityLiveRegion="polite">{state.error}</Text> : null}
      <HStack justify="space-between">
        <IconButton name="RotateCcw" accessibilityLabel="Restart selected passage" onPress={() => player.restart()} />
        <IconButton name="SkipBack" accessibilityLabel="Previous ayah" disabled={state.ayah <= state.settings.start} onPress={() => player.previous()} />
        <IconButton name={state.playing ? 'Pause' : 'Play'} variant="soft" color="brand" size={26} disabled={state.loading}
          accessibilityLabel={state.playing ? 'Pause recitation' : 'Play recitation'} onPress={() => void player.toggle()} />
        <IconButton name="SkipForward" accessibilityLabel="Next ayah" disabled={state.ayah >= state.settings.end} onPress={() => player.next()} />
        <IconButton name="Square" accessibilityLabel="Stop recitation" onPress={() => player.stop()} />
        <IconButton name="Settings2" accessibilityLabel="Audio settings" onPress={onSettings} />
      </HStack>
    </VStack>
  </Card>;
}

/** Mount on open so Cancel discards draft edits without affecting current audio. */
export function RecitationSettingsSheet({ count, initial, onCancel, onPlay }: {
  count: number; initial: RecitationSettings | null; onCancel: () => void; onPlay: (settings: RecitationSettings) => void;
}) {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [start, setStart] = useState(String(initial?.start ?? 1));
  const [end, setEnd] = useState(String(initial?.end ?? count));
  const [repeat, setRepeat] = useState<Repeat>(initial?.repeat ?? 0);
  const settings = { start: Number(start), end: Number(end), repeat };
  const valid = /^\d+$/.test(start) && /^\d+$/.test(end) && validSettings(settings, count);
  return <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <Pressable accessibilityLabel="Close audio settings" accessibilityRole="button" onPress={onCancel} style={{ position: 'absolute', top: 0, bottom: 0, right: 0, left: 0 }} />
        <View accessibilityViewIsModal style={{ maxHeight: '85%', backgroundColor: tokens.background.elevated, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderColor: tokens.border.strong }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingBottom: Math.max(insets.bottom, 16) + 12 }}>
            <VStack gap={4}>
              <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: tokens.border.strong }} />
              <Text variant="headingLg">Play audio</Text>
              <Text variant="caption" color="secondary">Mishary Alafasy · internet required</Text>
              <HStack gap={3} align="flex-start">
                <View style={{ flex: 1 }}><Input label="Start ayah" accessibilityLabel="Start ayah" keyboardType="number-pad" value={start} onChangeText={setStart} /></View>
                <View style={{ flex: 1 }}><Input label="End ayah" accessibilityLabel="End ayah" keyboardType="number-pad" value={end} onChangeText={setEnd} /></View>
              </HStack>
              {!valid ? <Text variant="caption" color="error">Enter whole ayah numbers from 1 to {count}, with the end at or after the start.</Text> : null}
              <Text weight="600">Repeat selection</Text>
              <HStack gap={2} wrap>
                {REPEAT_OPTIONS.map((option) => <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: repeat === option }}
                  accessibilityLabel={option === 0 ? 'No repeats' : option === 'infinite' ? 'Repeat infinitely' : `Repeat ${option} times`}
                  onPress={() => setRepeat(option)} style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1,
                    borderColor: repeat === option ? tokens.brand.primary : tokens.border.strong,
                    backgroundColor: repeat === option ? tokens.background.elevated : tokens.background.secondary }}>
                  {repeat === option ? <SurfaceSheen radius={20} /> : null}
                  <Text variant="bodySm" weight={repeat === option ? '600' : '400'} color={repeat === option ? 'brand' : 'primary'}>{option === 0 ? 'None' : option === 'infinite' ? 'Infinite' : option}</Text>
                </Pressable>)}
              </HStack>
              <Text variant="caption" color="secondary">{repeat === 'infinite' ? 'The selected passage loops until you stop it.' : `The whole passage plays ${repeat + 1} ${repeat === 0 ? 'time' : 'times'} (${repeat} additional repeats).`}</Text>
              <HStack gap={3}>
                <Button label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={onCancel} />
                <Button label="Play" disabled={!valid} style={{ flex: 1 }} onPress={() => onPlay(settings)} />
              </HStack>
            </VStack>
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
