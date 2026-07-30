import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { radii } from '../tokens/radii';
import { useAppTheme } from '../theme';

export interface ProgressBarProps {
  progress: number; // 0-1
  height?: number;
  color?: string;
  trackColor?: string;
  accessibilityLabel?: string;
}

export function ProgressBar({ progress, height = 8, color, trackColor, accessibilityLabel }: ProgressBarProps) {
  const { tokens } = useAppTheme();
  const width = useSharedValue(0);
  const clamped = Math.max(0, Math.min(1, progress));

  useEffect(() => {
    width.value = withTiming(clamped, { duration: 400 });
  }, [clamped, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      accessibilityLabel={accessibilityLabel}
      style={{
        height,
        borderRadius: radii.pill,
        backgroundColor: trackColor ?? tokens.border.subtle,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          { height: '100%', borderRadius: radii.pill, backgroundColor: color ?? tokens.brand.primary },
          animatedStyle,
        ]}
      />
    </View>
  );
}
