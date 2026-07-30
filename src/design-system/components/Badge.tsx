import React from 'react';
import { View } from 'react-native';
import { Text } from '../primitives/Text';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import { useAppTheme } from '../theme';

export type BadgeStatus = 'memorized' | 'needsRevision' | 'weak' | 'strong' | 'notStarted' | 'neutral';

const statusLabel: Record<BadgeStatus, string> = {
  memorized: 'Memorized',
  needsRevision: 'Needs Revision',
  weak: 'Weak',
  strong: 'Strong',
  notStarted: 'Not Started',
  neutral: '',
};

export interface BadgeProps {
  status: BadgeStatus;
  label?: string;
}

export function Badge({ status, label }: BadgeProps) {
  const { tokens } = useAppTheme();

  const palette: Record<BadgeStatus, { bg: string; fg: string }> = {
    memorized: { bg: tokens.semantic.success + '22', fg: tokens.semantic.success },
    strong: { bg: tokens.semantic.success + '22', fg: tokens.semantic.success },
    needsRevision: { bg: tokens.semantic.warning + '22', fg: tokens.semantic.warning },
    weak: { bg: tokens.semantic.error + '22', fg: tokens.semantic.error },
    notStarted: { bg: tokens.border.subtle, fg: tokens.text.muted },
    neutral: { bg: tokens.background.secondary, fg: tokens.text.secondary },
  };
  const { bg, fg } = palette[status];

  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: radii.pill,
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[1],
        alignSelf: 'flex-start',
      }}
    >
      <Text variant="caption" weight="600" style={{ color: fg }}>
        {label ?? statusLabel[status]}
      </Text>
    </View>
  );
}
