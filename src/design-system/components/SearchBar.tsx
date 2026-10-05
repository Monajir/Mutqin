import React, { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Icon } from '../primitives/Icon';
import { IconButton } from '../primitives/IconButton';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import { useAppTheme } from '../theme';
import { SurfaceSheen } from '../primitives/SurfaceSheen';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  debounceMs?: number;
  onDebouncedChange?: (text: string) => void;
  autoFocus?: boolean;
}

/** Themed search input with debounce built in, per design-system spec (§12). */
export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
  debounceMs = 300,
  onDebouncedChange,
  autoFocus,
}: SearchBarProps) {
  const { tokens } = useAppTheme();
  const [internal, setInternal] = useState(value);

  useEffect(() => setInternal(value), [value]);

  useEffect(() => {
    if (!onDebouncedChange) return;
    const handle = setTimeout(() => onDebouncedChange(internal), debounceMs);
    return () => clearTimeout(handle);
  }, [internal, debounceMs, onDebouncedChange]);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[2],
        backgroundColor: tokens.background.secondary,
        borderRadius: radii.lg,
        paddingHorizontal: spacing[3],
        height: 44,
        borderWidth: 1,
        borderColor: tokens.border.subtle,
      }}
    >
      <SurfaceSheen radius={radii.lg} />
      <Icon name="Search" size={18} color="muted" />
      <TextInput
        autoFocus={autoFocus}
        value={internal}
        onChangeText={(t) => {
          setInternal(t);
          onChangeText(t);
        }}
        placeholder={placeholder}
        placeholderTextColor={tokens.text.muted}
        style={{ flex: 1, color: tokens.text.primary, fontSize: 16 }}
        returnKeyType="search"
        accessibilityLabel={placeholder}
      />
      {internal.length > 0 ? (
        <IconButton
          name="X"
          size={16}
          accessibilityLabel="Clear search"
          onPress={() => {
            setInternal('');
            onChangeText('');
          }}
        />
      ) : null}
    </View>
  );
}
