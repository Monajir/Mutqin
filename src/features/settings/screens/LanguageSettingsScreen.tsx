import React, { useState } from 'react';
import { ScreenWrapper } from '@/components';
import { VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { ListRow } from '@/design-system/components';
import { Icon } from '@/design-system/primitives/Icon';
import { setAppLocale } from '@/i18n';
import { applyLayoutDirectionForLocale } from '@/lib/rtl';

const languages: { code: 'en' | 'ar' | 'bn'; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية (Arabic)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
];

/** Per spec's internationalization note: English/Arabic/Bengali planned from the start. */
export function LanguageSettingsScreen() {
  const [selected, setSelected] = useState<'en' | 'ar' | 'bn'>('en');
  const [restartRequired, setRestartRequired] = useState(false);

  return (
    <ScreenWrapper>
      <VStack gap={4} style={{ paddingTop: 16 }}>
        <Text variant="headingLg">Language</Text>
        <VStack>
          {languages.map((lang) => (
            <ListRow
              key={lang.code}
              title={lang.label}
              trailing={selected === lang.code ? <Icon name="Check" color="brand" /> : undefined}
              onPress={() => {
                setSelected(lang.code);
                setAppLocale(lang.code);
                const needsRestart = applyLayoutDirectionForLocale(lang.code);
                setRestartRequired(needsRestart);
              }}
            />
          ))}
        </VStack>
        {restartRequired ? (
          <Text variant="bodySm" color="warning">
            Restart the app for the layout direction change to fully take effect.
          </Text>
        ) : null}
      </VStack>
    </ScreenWrapper>
  );
}
