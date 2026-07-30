import { create } from 'zustand';
import type { AyahReference, RecitationEvaluationResult, WordEvaluation } from '@/services/ai/types';
import type { HifzSessionPhase } from '../types/hifz.types';

interface HifzSessionState {
  phase: HifzSessionPhase;
  surahId: number | null;
  startAyah: number | null;
  currentAyahIndex: number;
  revealedWords: Record<string, WordEvaluation[]>; // key: "surahId-ayahNumber"
  result: RecitationEvaluationResult | null;
  isRecording: boolean;

  startSetup: () => void;
  beginSession: (surahId: number, startAyah: number) => void;
  setRecording: (recording: boolean) => void;
  revealWord: (ayah: AyahReference, word: WordEvaluation) => void;
  completeWithResult: (result: RecitationEvaluationResult) => void;
  retrySameRange: () => void;
  reset: () => void;
}

const ayahKey = (ayah: AyahReference) => `${ayah.surahId}-${ayah.ayahNumber}`;

/**
 * Ephemeral, client-only state for the active Hifz Assistant session
 * (spec §6). Deliberately NOT persisted or synced — a session is either
 * completed (its result is saved via useApplyEvaluationResult /
 * hifzRepository.saveSession) or abandoned. This keeps the "what's on
 * screen right now" concern separate from durable progress data in SQLite.
 */
export const useHifzSessionStore = create<HifzSessionState>((set, get) => ({
  phase: 'setup',
  surahId: null,
  startAyah: null,
  currentAyahIndex: 0,
  revealedWords: {},
  result: null,
  isRecording: false,

  startSetup: () => set({ phase: 'setup' }),

  beginSession: (surahId, startAyah) =>
    set({ phase: 'reciting', surahId, startAyah, currentAyahIndex: 0, revealedWords: {}, result: null }),

  setRecording: (recording) => set({ isRecording: recording }),

  revealWord: (ayah, word) => {
    const key = ayahKey(ayah);
    const existing = get().revealedWords[key] ?? [];
    set({ revealedWords: { ...get().revealedWords, [key]: [...existing, word] } });
  },

  completeWithResult: (result) => set({ phase: 'summary', result, isRecording: false }),

  retrySameRange: () => set({ phase: 'reciting', currentAyahIndex: 0, revealedWords: {}, result: null }),

  reset: () => set({ phase: 'setup', surahId: null, startAyah: null, currentAyahIndex: 0, revealedWords: {}, result: null, isRecording: false }),
}));
