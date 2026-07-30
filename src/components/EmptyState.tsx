import React from 'react';
import { VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Button } from '@/design-system/primitives/Button';
import { Icon, type IconName } from '@/design-system/primitives/Icon';
import { spacing } from '@/design-system/tokens/spacing';

export type EmptyStateVariant = 'no-data' | 'no-results' | 'offline' | 'error';

export interface EmptyStateProps {
  variant: EmptyStateVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const defaults: Record<EmptyStateVariant, { icon: IconName; title: string; description: string }> = {
  'no-data': {
    icon: 'Inbox',
    title: 'Nothing here yet',
    description: 'Once you add content, it will show up here.',
  },
  'no-results': {
    icon: 'SearchX',
    title: 'No results found',
    description: 'Try a different search term.',
  },
  offline: {
    icon: 'WifiOff',
    title: 'You are offline',
    description: 'This requires an internet connection. Please reconnect and try again.',
  },
  error: {
    icon: 'AlertTriangle',
    title: 'Something went wrong',
    description: 'Please try again.',
  },
};

/**
 * Single shared empty-state component used everywhere (§17 of the
 * architecture doc). Every list-rendering screen must handle all four
 * variants explicitly rather than only the happy path.
 */
export function EmptyState({ variant, title, description, actionLabel, onAction }: EmptyStateProps) {
  const fallback = defaults[variant];

  return (
    <VStack align="center" justify="center" gap={4} style={{ flex: 1, paddingVertical: spacing[10] }}>
      <Icon name={fallback.icon} size={40} color="muted" />
      <VStack align="center" gap={1}>
        <Text variant="headingSm" align="center">
          {title ?? fallback.title}
        </Text>
        <Text variant="bodySm" color="secondary" align="center">
          {description ?? fallback.description}
        </Text>
      </VStack>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant={variant === 'error' ? 'primary' : 'secondary'} />
      ) : null}
    </VStack>
  );
}
