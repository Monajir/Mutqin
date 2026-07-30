import React, { forwardRef } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { Text } from './Text';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import { useAppTheme } from '../theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
}

/**
 * Themed text input, forwards ref so it can be registered with
 * react-hook-form via `control` + `Controller` render props.
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, helperText, style, ...rest },
  ref
) {
  const { tokens } = useAppTheme();

  return (
    <View style={{ gap: spacing[1] }}>
      {label ? (
        <Text variant="bodySm" color="secondary" weight="600">
          {label}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={tokens.text.muted}
        style={[
          {
            borderWidth: 1,
            borderColor: error ? tokens.semantic.error : tokens.border.subtle,
            borderRadius: radii.md,
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
            fontSize: 16,
            color: tokens.text.primary,
            backgroundColor: tokens.background.primary,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text variant="caption" color="error">
          {error}
        </Text>
      ) : helperText ? (
        <Text variant="caption" color="muted">
          {helperText}
        </Text>
      ) : null}
    </View>
  );
});
