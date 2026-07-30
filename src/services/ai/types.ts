export interface AyahReference {
  surahId: number;
  ayahNumber: number;
}

export type WordEvaluationStatus = 'correct' | 'pronunciation_warning' | 'incorrect' | 'skipped';

export interface WordEvaluation {
  wordIndex: number;
  text: string;
  status: WordEvaluationStatus;
}

export interface AyahEvaluation {
  ayah: AyahReference;
  words: WordEvaluation[];
  isFullyRecited: boolean;
}

export interface RecitationEvaluationResult {
  ayahs: AyahEvaluation[];
  overallAccuracy: number; // 0-1
  correctWordCount: number;
  missedWordCount: number;
  incorrectWordCount: number;
  pronunciationWarningCount: number;
  suggestedRevisionAyahs: AyahReference[];
}

export interface EvaluateRecitationInput {
  /** Local file URI of the recorded audio segment. */
  audioUri: string;
  /** The ayah range the user was expected to recite, in order. */
  expectedAyahs: AyahReference[];
  qariIdForReference?: string;
}

/**
 * Streamed partial result, used to progressively reveal words as recitation
 * is processed rather than waiting for the full evaluation to complete.
 */
export interface PartialEvaluationUpdate {
  ayah: AyahReference;
  word: WordEvaluation;
}

export type EvaluationFailureReason = 'network_error' | 'timeout' | 'low_confidence' | 'unknown';

export class RecitationEvaluationError extends Error {
  readonly reason: EvaluationFailureReason;
  constructor(reason: EvaluationFailureReason, message: string) {
    super(message);
    this.name = 'RecitationEvaluationError';
    this.reason = reason;
  }
}
