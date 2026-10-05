import React from 'react';
import { HStack, VStack } from '../primitives/Stack';
import { Text } from '../primitives/Text';
import { IconButton } from '../primitives/IconButton';
import { ProgressBar } from './ProgressBar';
import { Surface } from '../primitives/Surface';
import { useAudioPlayerStore } from '@/stores/useAudioPlayerStore';

/** Persistent mini-player for recitation audio, rendered above the tab bar when active. */
export function AudioPlayerBar() {
  const { currentTrack, isPlaying, positionSec, durationSec, togglePlayback, stop } = useAudioPlayerStore();

  if (!currentTrack) return null;

  const progress = durationSec > 0 ? positionSec / durationSec : 0;

  return (
    <Surface polished elevationLevel="medium" p={3} rounded="xl" style={{ marginHorizontal: 12, marginBottom: 8 }}>
      <HStack gap={3} justify="space-between">
        <VStack style={{ flex: 1 }} gap={1}>
          <Text variant="bodySm" weight="600" numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <ProgressBar progress={progress} height={4} accessibilityLabel="Audio progress" />
        </VStack>
        <HStack gap={2}>
          <IconButton
            name={isPlaying ? 'Pause' : 'Play'}
            variant="soft"
            color="brand"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            onPress={togglePlayback}
          />
          <IconButton name="X" accessibilityLabel="Close player" onPress={stop} />
        </HStack>
      </HStack>
    </Surface>
  );
}
