import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useAppTheme } from '../theme';

/** Decorative light over an opaque surface; never intercepts touches or blurs text. */
export function SurfaceSheen({ radius = 24 }: { radius?: number }) {
  const { themeName } = useAppTheme();
  const dark = themeName === 'dark';
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
    <Svg width="100%" height="100%">
      <Defs><LinearGradient id="surfaceSheen" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="white" stopOpacity={dark ? 0.07 : 0.28} />
        <Stop offset="0.5" stopColor="white" stopOpacity={0} />
        <Stop offset="1" stopColor="#a7c8ed" stopOpacity={dark ? 0.035 : 0.08} />
      </LinearGradient></Defs>
      <Rect width="100%" height="100%" fill="url(#surfaceSheen)" />
    </Svg>
    <View style={{ position: 'absolute', top: 0, left: radius, right: radius, height: 1,
      backgroundColor: dark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.85)' }} />
  </View>;
}
