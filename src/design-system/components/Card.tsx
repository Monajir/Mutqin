import React from 'react';
import { Surface } from '../primitives/Surface';
import { Pressable } from '../primitives/Pressable';
import { spacing } from '../tokens/spacing';
import type { StyleProp, ViewStyle } from 'react-native';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  padded?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  polished?: boolean;
}

/** Standard content card used for Hadith cards, Dua cards, Home widgets, etc. */
export function Card({ children, onPress, padded = true, polished = true, testID, style }: CardProps) {
  const content = (
    <Surface polished={polished} rounded={polished ? 'xl' : 'lg'} elevationLevel="low" p={padded ? 4 : undefined} testID={testID} style={style}>
      {children}
    </Surface>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ borderRadius: polished ? 24 : 16 }}>
      <Surface
        polished={polished}
        rounded={polished ? 'xl' : 'lg'}
        elevationLevel="low"
        p={padded ? 4 : undefined}
        testID={testID}
        style={[{ padding: padded ? spacing[4] : 0 }, style]}
      >
        {children}
      </Surface>
    </Pressable>
  );
}
