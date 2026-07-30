import { useEffect, useState } from 'react';
import { Magnetometer } from 'expo-sensors';
import * as Location from 'expo-location';
import type { QiblaDirection } from '../types/prayer.types';

const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

function calculateQiblaBearing(lat: number, lng: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const lat1 = toRad(lat);
  const lat2 = toRad(KAABA_LAT);
  const deltaLng = toRad(KAABA_LNG - lng);

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Drives the Qibla Compass screen: device heading vs. calculated bearing to the Kaaba. */
export function useQibla(): { qibla: QiblaDirection | null; deviceHeading: number; error: string | null } {
  const [qibla, setQibla] = useState<QiblaDirection | null>(null);
  const [deviceHeading, setDeviceHeading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required for the Qibla compass.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setQibla({ bearingDegrees: calculateQiblaBearing(position.coords.latitude, position.coords.longitude) });

      Magnetometer.setUpdateInterval(200);
      subscription = Magnetometer.addListener(({ x, y }) => {
        const angle = (Math.atan2(y, x) * 180) / Math.PI;
        setDeviceHeading((angle + 360) % 360);
      });
    })();

    return () => subscription?.remove();
  }, []);

  return { qibla, deviceHeading, error };
}
