import { create } from 'zustand';
import { Audio, AVPlaybackStatus } from 'expo-av';

export interface AudioTrack {
  id: string;
  title: string;
  uri: string;
}

interface AudioPlayerState {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  positionSec: number;
  durationSec: number;
  sound: Audio.Sound | null;
  play: (track: AudioTrack) => Promise<void>;
  togglePlayback: () => Promise<void>;
  seekTo: (sec: number) => Promise<void>;
  stop: () => Promise<void>;
}

/**
 * Global mini-player state, shared across Quran recitation, Dua audio, and
 * Allah's Names audio (§5). Only one track plays at a time app-wide.
 */
export const useAudioPlayerStore = create<AudioPlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  positionSec: 0,
  durationSec: 0,
  sound: null,

  play: async (track) => {
    const { sound: existing } = get();
    if (existing) await existing.unloadAsync().catch(() => {});
    set({ currentTrack: null, sound: null, isPlaying: false, positionSec: 0, durationSec: 0 });

    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });

      const { sound } = await Audio.Sound.createAsync({ uri: track.uri }, { shouldPlay: true });
      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;
        set({
          positionSec: status.positionMillis / 1000,
          durationSec: (status.durationMillis ?? 0) / 1000,
          isPlaying: status.isPlaying,
        });
        if (status.didJustFinish) set({ isPlaying: false, positionSec: 0 });
      });

      set({ currentTrack: track, sound, isPlaying: true });
    } catch (error) {
      set({ currentTrack: null, sound: null, isPlaying: false, positionSec: 0, durationSec: 0 });
      throw error;
    }
  },

  togglePlayback: async () => {
    const { sound, isPlaying } = get();
    if (!sound) return;
    if (isPlaying) await sound.pauseAsync();
    else await sound.playAsync();
  },

  seekTo: async (sec) => {
    const { sound } = get();
    if (!sound) return;
    await sound.setPositionAsync(sec * 1000);
  },

  stop: async () => {
    const { sound } = get();
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }
    set({ currentTrack: null, sound: null, isPlaying: false, positionSec: 0, durationSec: 0 });
  },
}));
