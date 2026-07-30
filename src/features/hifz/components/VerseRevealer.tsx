import React from 'react';
import { View } from 'react-native';
import { ArabicText } from '@/components';
import { useAppTheme } from '@/design-system/theme';
import type { WordEvaluation } from '@/services/ai/types';

export interface VerseRevealerProps {
  /** Full ayah text, used only while nothing has been revealed yet (obscured state). */
  fullText: string;
  /** Progressively-revealed word evaluations from the current recitation attempt. */
  revealedWords: WordEvaluation[];
  /** Total word count of the ayah, to size the obscured placeholder correctly. */
  totalWordCount: number;
}

/**
 * Core visual of the AI Hifz Assistant (spec §6): the target ayah starts
 * hidden, and correctly recited words are progressively revealed with
 * color-coded status (correct/pronunciation warning/incorrect). Previous
 * (already-passed) ayahs are rendered normally by the parent screen using
 * plain `ArabicText`; this component only renders the "active" ayah.
 */
export function VerseRevealer({ fullText, revealedWords, totalWordCount }: VerseRevealerProps) {
  const { tokens } = useAppTheme();

  if (revealedWords.length === 0) {
    return (
      <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
        {Array.from({ length: totalWordCount }).map((_, i) => (
          <View
            key={i}
            style={{
              width: 28 + (i % 3) * 10,
              height: 24,
              borderRadius: 6,
              backgroundColor: tokens.hifz.hidden,
            }}
          />
        ))}
      </View>
    );
  }

  const colorFor = (status: WordEvaluation['status']) => {
    switch (status) {
      case 'correct':
        return tokens.hifz.correct;
      case 'pronunciation_warning':
        return tokens.hifz.pronunciation;
      case 'incorrect':
      case 'skipped':
        return tokens.hifz.incorrect;
    }
  };

  return (
    <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
      {revealedWords.map((word) => (
        <ArabicText key={word.wordIndex} variant="quran" color="primary" style={{ color: colorFor(word.status) }}>
          {word.text}
        </ArabicText>
      ))}
      {revealedWords.length < totalWordCount ? (
        <View
          style={{
            width: 28,
            height: 24,
            borderRadius: 6,
            backgroundColor: tokens.hifz.hidden,
            alignSelf: 'center',
          }}
        />
      ) : null}
    </View>
  );
}
