import React from 'react';
import { View } from 'react-native';
import { VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Icon } from '@/design-system/primitives/Icon';
import { EmptyState } from '@/components';
import { useAppTheme } from '@/design-system/theme';
import { useQibla } from '../hooks/useQibla';

/** Wireframe screen 03 modal — device-heading-relative compass pointing to the Kaaba. */
export function QiblaCompass() {
  const { tokens } = useAppTheme();
  const { qibla, deviceHeading, error } = useQibla();

  if (error) {
    return <EmptyState variant="error" title="Compass unavailable" description={error} />;
  }

  if (!qibla) {
    return <EmptyState variant="no-data" title="Locating..." />;
  }

  const rotation = qibla.bearingDegrees - deviceHeading;

  return (
    <VStack align="center" gap={4} style={{ paddingVertical: 32 }}>
      <View
        style={{
          width: 240,
          height: 240,
          borderRadius: 120,
          borderWidth: 2,
          borderColor: tokens.border.strong,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ transform: [{ rotate: `${rotation}deg` }] }}>
          <Icon name="Navigation" size={64} color="brand" />
        </View>
      </View>
      <Text variant="bodySm" color="secondary">{`Qibla bearing: ${Math.round(qibla.bearingDegrees)}°`}</Text>
    </VStack>
  );
}
