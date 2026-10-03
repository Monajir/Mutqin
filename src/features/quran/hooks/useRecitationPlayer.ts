import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Audio } from 'expo-av';
import { useAudioPlayerStore } from '@/stores';
import { RecitationPlayer, type PlayerState } from '../audio/RecitationPlayer';

export function useRecitationPlayer(surahId: number, count: number) {
  const [state, setState] = useState<PlayerState | null>(null);
  const player = useMemo(() => new RecitationPlayer(count, async (ayah, update) => {
    await useAudioPlayerStore.getState().stop();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, staysActiveInBackground: false });
    const filename = String(surahId).padStart(3, '0') + String(ayah).padStart(3, '0');
    const { sound } = await Audio.Sound.createAsync(
      { uri: `https://everyayah.com/data/Alafasy_128kbps/${filename}.mp3` },
      { shouldPlay: false },
      (status) => {
        if (status.isLoaded) update({ playing: status.isPlaying, position: status.positionMillis / 1000,
          duration: (status.durationMillis ?? 0) / 1000, ended: status.didJustFinish });
        else if (status.error) update({ playing: false, position: 0, duration: 0, error: status.error });
      },
    );
    return { play: () => sound.playAsync(), pause: () => sound.pauseAsync(), unload: () => sound.unloadAsync() };
  }, setState), [surahId, count]);
  useFocusEffect(useCallback(() => {
    setState(player.state);
    return () => player.stop();
  }, [player]));
  return { player, state: state ?? player.state };
}
