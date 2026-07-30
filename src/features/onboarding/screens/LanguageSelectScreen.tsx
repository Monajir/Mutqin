import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components';
import { VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Button } from '@/design-system/primitives/Button';
import { ListRow } from '@/design-system/components';
import { Icon } from '@/design-system/primitives/Icon';
import { setAppLocale } from '@/i18n';

const languages: { code: 'en' | 'ar' | 'bn'; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية (Arabic)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
];

export function LanguageSelectScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<'en' | 'ar' | 'bn'>('en');

  return (
    <ScreenWrapper>
      <VStack gap={5} style={{ paddingTop: 32, flex: 1 }}>
        <Text variant="headingLg">Choose your language</Text>
        <VStack>
          {languages.map((lang) => (
            <ListRow
              key={lang.code}
              title={lang.label}
              trailing={selected === lang.code ? <Icon name="Check" color="brand" /> : undefined}
              onPress={() => setSelected(lang.code)}
            />
          ))}
        </VStack>
        <Button
          label="Continue"
          fullWidth
          onPress={() => {
            setAppLocale(selected);
            router.push('/(onboarding)/permissions');
          }}
          style={{ marginTop: 'auto' }}
        />
      </VStack>
    </ScreenWrapper>
  );
}
