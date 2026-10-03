import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Audio } from 'expo-av';
import { useAudioPlayerStore } from '@/stores/useAudioPlayerStore';

/** Screen-scoped playback: changing ayah or leaving the reader releases audio. */
export function useAyahPlayback(surahId: number, ayahNumber: number) {
  const sound = useRef<Audio.Sound | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    setPlaying(false);
    setLoading(false);
    setError(null);
    return () => {
      generation.current += 1;
      busy.current = false;
      const previous = sound.current;
      sound.current = null;
      if (previous) void previous.unloadAsync().catch(() => {});
    };
  }, [surahId, ayahNumber]));

  const toggle = async () => {
    if (busy.current) return;
    busy.current = true;
    const request = generation.current;
    setError(null);
    setLoading(true);
    try {
      if (sound.current) {
        const status = await sound.current.getStatusAsync();
        if (request !== generation.current) return;
        if (status.isLoaded && status.isPlaying) await sound.current.pauseAsync();
        else await sound.current.replayAsync();
      } else {
        await useAudioPlayerStore.getState().stop();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
        if (request !== generation.current) return;
        const filename = String(surahId).padStart(3, '0') + String(ayahNumber).padStart(3, '0');
        const created = await Audio.Sound.createAsync(
          { uri: `https://everyayah.com/data/Alafasy_128kbps/${filename}.mp3` },
          { shouldPlay: false },
        );
        if (request !== generation.current) {
          await created.sound.unloadAsync();
          return;
        }
        sound.current = created.sound;
        created.sound.setOnPlaybackStatusUpdate((status) => {
          if (request !== generation.current) return;
          if (status.isLoaded) setPlaying(status.isPlaying);
          else if (status.error) setError('Audio could not play. Check your connection and try again.');
        });
        await created.sound.playAsync();
      }
    } catch {
      if (request === generation.current) {
        setError('Audio could not play. Check your connection and try again.');
        setPlaying(false);
        const previous = sound.current;
        sound.current = null;
        if (previous) await previous.unloadAsync().catch(() => {});
      }
    } finally {
      if (request === generation.current) {
        busy.current = false;
        setLoading(false);
      }
    }
  };
  return { playing, loading, error, toggle };
}
