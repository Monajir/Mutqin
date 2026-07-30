import React, { useState } from 'react';
import { FlashList } from '@shopify/flash-list';
import { ListRow } from '@/design-system/components';
import { Input } from '@/design-system/primitives/Input';
import { VStack } from '@/design-system/primitives/Stack';
import type { Surah } from '@/types';

export interface SurahAyahPickerProps {
  surahs: Surah[];
  onSelect: (surahId: number, startAyah: number) => void;
}

/**
 * Setup-step picker (wireframe screen 05 precursor). v1 keeps ayah entry as
 * a simple numeric field once a surah is chosen rather than a full ayah
 * grid, per "reliable verse progression" being the v1 bar (spec §6 scope).
 */
export function SurahAyahPicker({ surahs, onSelect }: SurahAyahPickerProps) {
  const [query, setQuery] = useState('');
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [startAyahInput, setStartAyahInput] = useState('1');

  const filtered = surahs.filter(
    (s) =>
      s.nameTransliteration.toLowerCase().includes(query.toLowerCase()) ||
      s.nameTranslation.toLowerCase().includes(query.toLowerCase())
  );

  if (selectedSurah) {
    const ayahNum = Math.max(1, Math.min(selectedSurah.ayahCount, Number(startAyahInput) || 1));
    return (
      <VStack gap={4}>
        <ListRow
          title={selectedSurah.nameTransliteration}
          subtitle={`${selectedSurah.ayahCount} ayahs`}
          onPress={() => setSelectedSurah(null)}
          showChevron
        />
        <Input
          label="Starting ayah"
          keyboardType="number-pad"
          value={startAyahInput}
          onChangeText={setStartAyahInput}
          onSubmitEditing={() => onSelect(selectedSurah.id, ayahNum)}
        />
      </VStack>
    );
  }

  return (
    <VStack gap={3} style={{ flex: 1 }}>
      <Input placeholder="Search surah" value={query} onChangeText={setQuery} />
      <FlashList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        estimatedItemSize={56}
        renderItem={({ item }) => (
          <ListRow
            title={`${item.id}. ${item.nameTransliteration}`}
            subtitle={item.nameTranslation}
            onPress={() => setSelectedSurah(item)}
            showChevron
          />
        )}
      />
    </VStack>
  );
}
