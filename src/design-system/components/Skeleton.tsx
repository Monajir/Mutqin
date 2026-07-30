import React, { useEffect } from 'react';
import { DimensionValue } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { radii, type RadiusKey } from '../tokens/radii';
import { useAppTheme } from '../theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  rounded?: RadiusKey;
}

export function Skeleton({ width = '100%', height = 16, rounded = 'sm' }: SkeletonProps) {
  const { tokens } = useAppTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radii[rounded], backgroundColor: tokens.border.subtle },
        animatedStyle,
      ]}
    />
  );
}

/** Convenience skeleton block for a standard list row (avatar + two lines). */
export function SkeletonListRow() {
  return (
    <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
      <Skeleton width={40} height={40} rounded="pill" />
      <Animated.View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="90%" height={12} />
      </Animated.View>
    </Animated.View>
  );
}
