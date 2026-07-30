import { useCallback, useRef, useState } from 'react';
import { Audio } from 'expo-av';

export type RecorderStatus = 'idle' | 'recording' | 'stopping' | 'error';

interface UseRecitationRecorderResult {
  status: RecorderStatus;
  durationSec: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>; // returns local file URI
  cancelRecording: () => Promise<void>;
  errorMessage: string | null;
}

/**
 * Wraps expo-av recording with press-and-hold semantics for the Hifz
 * Assistant record button (spec §6: "user presses and holds the record
 * button"). Kept independent from evaluation/UI state — screens compose
 * this hook with useHifzSessionStore and the AI provider.
 */
export function useRecitationRecorder(): UseRecitationRecorderResult {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [durationSec, setDurationSec] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setErrorMessage(null);
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setStatus('error');
        setErrorMessage('Microphone permission is required to use the Hifz Assistant.');
        return;
      }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recording.setOnRecordingStatusUpdate((s) => {
        if (s.durationMillis !== undefined) setDurationSec(s.durationMillis / 1000);
      });

      recordingRef.current = recording;
      setStatus('recording');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Could not start recording.');
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    const recording = recordingRef.current;
    if (!recording) return null;

    setStatus('stopping');
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      setStatus('idle');
      setDurationSec(0);
      return uri;
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Could not stop recording.');
      return null;
    }
  }, []);

  const cancelRecording = useCallback(async () => {
    const recording = recordingRef.current;
    if (recording) {
      await recording.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
    setStatus('idle');
    setDurationSec(0);
  }, []);

  return { status, durationSec, startRecording, stopRecording, cancelRecording, errorMessage };
}
