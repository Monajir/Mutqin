export interface AyahReference {
  surahId: number;
  ayahNumber: number;
}

export type WordEvaluationStatus = 'correct' | 'incorrect' | 'skipped';

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
  suggestedRevisionAyahs: AyahReference[];
}

export interface EvaluateRecitationInput {
  /** Local file URI of the recorded audio segment. */
  audioUri: string;
  /** The ayah range the user was expected to recite, in order. */
  expectedAyahs: AyahReference[];
}

export type EvaluationFailureReason =
  | 'network_error'
  | 'timeout'
  | 'validation_error'
  | 'service_unavailable'
  | 'unknown';

export class RecitationEvaluationError extends Error {
  readonly reason: EvaluationFailureReason;
  constructor(reason: EvaluationFailureReason, message: string) {
    super(message);
    this.name = 'RecitationEvaluationError';
    this.reason = reason;
  }
}
