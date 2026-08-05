import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { calculatePrayerTimesForDay, getLivePrayerTiming } from '../utils/prayerTimeCalculator';
import { usePrayerSettingsStore } from '../store/usePrayerSettingsStore';
import { fetchPrayerTimesFromAlAdhan } from '@/services/prayer/aladhanClient';

interface Coordinates {
  latitude: number;
  longitude: number;
}

function useDeviceLocation(enabled: boolean) {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [resolved, setResolved] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setResolved(true);
      return;
    }
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!cancelled) {
          setPermissionDenied(true);
          setResolved(true);
        }
        return;
      }
      try {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      } catch {
        // The caller will use the clearly-labelled fallback location.
      } finally {
        if (!cancelled) setResolved(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { coords, permissionDenied, resolved };
}

/** Ticks every second so countdowns update live without a full query refetch. */
function useClockTick(intervalMs = 1000) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return nowMs;
}

export function usePrayerTimes() {
  const settings = usePrayerSettingsStore((s) => s.settings);
  const { coords, permissionDenied, resolved: locationResolved } = useDeviceLocation(settings.locationMode === 'auto');
  const nowMs = useClockTick();

  const fallbackCoords: Coordinates = { latitude: 21.4225, longitude: 39.8262 }; // Makkah, used only if location unavailable
  const effectiveCoords = coords ?? fallbackCoords;
  const latitude = Number(effectiveCoords.latitude.toFixed(4));
  const longitude = Number(effectiveCoords.longitude.toFixed(4));

  const query = useQuery({
    queryKey: ['prayer', 'times', 'v2', latitude, longitude, settings.calculationMethodId, new Date().toDateString()],
    queryFn: async () => {
      try {
        return await fetchPrayerTimesFromAlAdhan(new Date(), latitude, longitude, settings.calculationMethodId);
      } catch {
        return calculatePrayerTimesForDay(new Date(), latitude, longitude, settings.calculationMethodId);
      }
    },
    enabled: locationResolved,
    staleTime: 30 * 60 * 1000,
  });

  const liveData = query.data ? getLivePrayerTiming(query.data, nowMs) : undefined;

  return { ...query, data: liveData, permissionDenied, usingFallbackLocation: !coords };
}
