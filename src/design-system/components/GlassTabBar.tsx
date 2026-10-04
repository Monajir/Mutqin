import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, NativeModules, Platform, StyleSheet, View } from 'react-native';
import type { BlurViewProps } from 'expo-blur';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Icon, type IconName } from '../primitives/Icon';
import { useAppTheme } from '../theme';

// SDK 51 view metadata lets existing development APKs use the translucent
// fallback until rebuilt with expo-blur. Do not load a missing native view.
const hasNativeBlur = Platform.OS === 'web' || Boolean(
  NativeModules.NativeUnimoduleProxy?.viewManagersMetadata?.ExpoBlurView,
);
const NativeBlur: React.ComponentType<BlurViewProps> | null = hasNativeBlur
  ? require('expo-blur').BlurView
  : null;

export function GlassTabBackground() {
  const { themeName, tokens } = useAppTheme();
  const dark = themeName === 'dark';
  const [reduceTransparency, setReduceTransparency] = useState(false);
  const blurEnabled = NativeBlur !== null && !reduceTransparency;
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then((value) => {
      if (active) setReduceTransparency(value);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduceTransparency);
    return () => { active = false; subscription.remove(); };
  }, []);
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glass, {
    backgroundColor: blurEnabled ? 'transparent' : tokens.background.elevated,
    borderColor: dark ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.8)',
  }]}>
    {NativeBlur && blurEnabled ? <NativeBlur tint={dark ? 'dark' : 'light'} intensity={90}
      experimentalBlurMethod="dimezisBlurView" blurReductionFactor={4} style={StyleSheet.absoluteFill} /> : null}
    {/* The tint must sit ABOVE the blur so legibility does not depend on the
        Android blur renderer or the contrast of the content underneath. */}
    {blurEnabled ? <View style={[StyleSheet.absoluteFill, {
      backgroundColor: dark ? 'rgba(18,31,45,0.84)' : 'rgba(247,250,252,0.88)',
    }]} /> : null}
    {!reduceTransparency ? <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs><LinearGradient id="tabGlassSheen" x1="0" y1="0" x2="0.8" y2="1">
        <Stop offset="0" stopColor="white" stopOpacity={dark ? 0.1 : 0.3} />
        <Stop offset="0.45" stopColor="white" stopOpacity={0.02} />
        <Stop offset="1" stopColor={dark ? '#a7c8ed' : '#ccdff5'} stopOpacity={0.12} />
      </LinearGradient></Defs>
      <Rect width="100%" height="100%" fill="url(#tabGlassSheen)" />
    </Svg> : null}
    <View style={[styles.rim, { backgroundColor: dark ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.9)' }]} />
  </View>;
}

export function GlassTabIcon({ name, color, focused }: { name: IconName; color: string; focused: boolean }) {
  const { themeName } = useAppTheme();
  const scale = useRef(new Animated.Value(focused ? 1 : 0.92)).current;
  useEffect(() => {
    // Keep the selection animation subtle and honor the system motion setting.
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!active) return;
      if (reduce) scale.setValue(focused ? 1 : 0.92);
      else Animated.spring(scale, { toValue: focused ? 1 : 0.92, useNativeDriver: true, friction: 9, tension: 130 }).start();
    }).catch(() => scale.setValue(1));
    return () => { active = false; scale.stopAnimation(); };
  }, [focused, scale]);
  return <Animated.View style={[styles.selection, { transform: [{ scale }],
    backgroundColor: focused ? themeName === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.7)' : 'transparent',
    borderColor: focused ? 'rgba(255,255,255,0.25)' : 'transparent',
  }]}>
    <Icon name={name} rawColor={color} size={22} strokeWidth={focused ? 2.4 : 1.8} />
  </Animated.View>;
}

const styles = StyleSheet.create({
  glass: { borderRadius: 32, overflow: 'hidden', borderWidth: 1 },
  rim: { position: 'absolute', top: 0, left: 28, right: 28, height: 1 },
  selection: { width: 54, height: 32, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
});
