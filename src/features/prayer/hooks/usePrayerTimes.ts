import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { calculatePrayerTimesForDay, getLivePrayerTiming } from '../utils/prayerTimeCalculator';
import { usePrayerSettingsStore } from '../store/usePrayerSettingsStore';

interface Coordinates {
  latitude: number;
  longitude: number;
}

function useDeviceLocation(enabled: boolean) {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!cancelled) setPermissionDenied(true);
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (!cancelled) setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { coords, permissionDenied };
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
  const { coords, permissionDenied } = useDeviceLocation(settings.locationMode === 'auto');
  const nowMs = useClockTick();

  const fallbackCoords: Coordinates = { latitude: 21.4225, longitude: 39.8262 }; // Makkah, used only if location unavailable
  const effectiveCoords = coords ?? fallbackCoords;

  const query = useQuery({
    queryKey: ['prayer', 'times', effectiveCoords.latitude, effectiveCoords.longitude, settings.calculationMethodId, new Date().toDateString()],
    queryFn: () =>
      calculatePrayerTimesForDay(new Date(), effectiveCoords.latitude, effectiveCoords.longitude, settings.calculationMethodId),
    staleTime: 60 * 1000,
  });

  const liveData = query.data ? getLivePrayerTiming(query.data, nowMs) : undefined;

  return { ...query, data: liveData, permissionDenied, usingFallbackLocation: !coords };
}
