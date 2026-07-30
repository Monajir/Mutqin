import React from 'react';
import { View } from 'react-native';
import { Pressable } from '@/design-system/primitives/Pressable';
import { Icon } from '@/design-system/primitives/Icon';
import { Text } from '@/design-system/primitives/Text';
import { VStack } from '@/design-system/primitives/Stack';
import { useAppTheme } from '@/design-system/theme';

export interface RecordButtonProps {
  isRecording: boolean;
  disabled?: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  durationSec: number;
}

/**
 * Press-and-hold record control (spec §6). Deliberately uses onPressIn /
 * onPressOut rather than a toggle — releasing early is how the user signals
 * "finish evaluating what I've recited so far," matching the wireframe's
 * "Release to finish" hint.
 */
export function RecordButton({ isRecording, disabled, onPressIn, onPressOut, durationSec }: RecordButtonProps) {
  const { tokens } = useAppTheme();
  const minutes = Math.floor(durationSec / 60);
  const seconds = Math.floor(durationSec % 60);

  return (
    <VStack align="center" gap={2}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isRecording ? 'Recording — release to finish' : 'Hold to record'}
        disabled={disabled}
        haptic
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={{
          width: 84,
          height: 84,
          borderRadius: 42,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isRecording ? tokens.semantic.error : tokens.brand.primary,
        }}
      >
        <Icon name={isRecording ? 'Square' : 'Mic'} size={32} color="inverse" />
      </Pressable>
      <Text variant="bodySm" color="secondary">
        {isRecording
          ? `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} — Release to finish`
          : 'Hold to record'}
      </Text>
    </VStack>
  );
}
