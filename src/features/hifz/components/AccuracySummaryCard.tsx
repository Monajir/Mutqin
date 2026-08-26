import React from 'react';
import { View } from 'react-native';
import { Card } from '@/design-system/components';
import { HStack, VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { useAppTheme } from '@/design-system/theme';
import type { RecitationEvaluationResult } from '@/services/ai/types';

export interface AccuracySummaryCardProps {
  result: RecitationEvaluationResult;
}

/** Session results card (wireframe screen 06): accuracy ring + word-count breakdown. */
export function AccuracySummaryCard({ result }: AccuracySummaryCardProps) {
  const { tokens } = useAppTheme();
  const accuracyPercent = Math.round(result.overallAccuracy * 100);

  const ringColor =
    accuracyPercent >= 90 ? tokens.semantic.success : accuracyPercent >= 70 ? tokens.semantic.warning : tokens.semantic.error;

  const stats: { label: string; value: number; color: string }[] = [
    { label: 'Correct words', value: result.correctWordCount, color: tokens.hifz.correct },
    { label: 'Missed words', value: result.missedWordCount, color: tokens.text.secondary },
    { label: 'Incorrect words', value: result.incorrectWordCount, color: tokens.hifz.incorrect },
  ];

  return (
    <Card>
      <VStack align="center" gap={2}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            borderWidth: 8,
            borderColor: ringColor,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="headingLg" weight="700">{`${accuracyPercent}%`}</Text>
        </View>
        <Text variant="bodySm" color="secondary">
          Overall Accuracy
        </Text>
      </VStack>

      <VStack gap={2} style={{ marginTop: 20 }}>
        {stats.map((stat) => (
          <HStack key={stat.label} justify="space-between">
            <Text variant="bodySm" color="secondary">
              {stat.label}
            </Text>
            <Text variant="bodySm" weight="600" style={{ color: stat.color }}>
              {stat.value}
            </Text>
          </HStack>
        ))}
      </VStack>
    </Card>
  );
}
