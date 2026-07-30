import React from 'react';
import { Surface } from '../primitives/Surface';
import { Pressable } from '../primitives/Pressable';
import { spacing } from '../tokens/spacing';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  padded?: boolean;
  testID?: string;
}

/** Standard content card used for Hadith cards, Dua cards, Home widgets, etc. */
export function Card({ children, onPress, padded = true, testID }: CardProps) {
  const content = (
    <Surface elevationLevel="low" p={padded ? 4 : undefined} testID={testID}>
      {children}
    </Surface>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ borderRadius: 16 }}>
      <Surface elevationLevel="low" p={padded ? 4 : undefined} testID={testID} style={{ padding: padded ? spacing[4] : 0 }}>
        {children}
      </Surface>
    </Pressable>
  );
}
