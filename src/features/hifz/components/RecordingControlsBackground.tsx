import React, { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, InteractionManager, NativeModules, Platform, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';
import type { BlurViewProps } from 'expo-blur';
import { useAppTheme } from '@/design-system/theme';

const available = Platform.OS === 'web' || Boolean(NativeModules.NativeUnimoduleProxy?.viewManagersMetadata?.ExpoBlurView);
const NativeBlur: React.ComponentType<BlurViewProps> | null = available
  // eslint-disable-next-line @typescript-eslint/no-var-requires -- Older development clients may not include this native view.
  ? require('expo-blur').BlurView : null;

/** Keep Android's experimental blur out of native-stack transitions. */
export function RecordingControlsBackground() {
  const { themeName, tokens } = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const [settled, setSettled] = useState(false);
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useFocusEffect(useCallback(() => {
    const task = InteractionManager.runAfterInteractions(() => setSettled(true));
    return () => { task.cancel(); setSettled(false); };
  }, []));
  useEffect(() => {
    const start = navigation.addListener('transitionStart', () => setSettled(false));
    const end = navigation.addListener('transitionEnd', ({ data }) => setSettled(!data.closing && navigation.isFocused()));
    return () => { start(); end(); };
  }, [navigation]);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then((value) => {
      if (active) setReduceTransparency(value);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduceTransparency);
    return () => { active = false; subscription.remove(); };
  }, []);

  const dark = themeName === 'dark';
  const blur = NativeBlur && settled && !reduceTransparency;
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {blur && NativeBlur ? <NativeBlur style={StyleSheet.absoluteFill} tint={dark ? 'dark' : 'light'}
      intensity={45} experimentalBlurMethod="dimezisBlurView" blurReductionFactor={4} /> : null}
    <View style={[StyleSheet.absoluteFill, { backgroundColor: reduceTransparency ? tokens.background.elevated
      : dark ? 'rgba(18,31,45,0.40)' : 'rgba(247,250,252,0.38)' }]} />
  </View>;
}
