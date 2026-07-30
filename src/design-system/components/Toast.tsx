import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Text } from '../primitives/Text';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import { useAppTheme } from '../theme';

interface ToastMessage {
  id: number;
  message: string;
  variant: 'default' | 'success' | 'error';
}

interface ToastContextValue {
  show: (message: string, variant?: ToastMessage['variant']) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { tokens } = useAppTheme();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const idRef = useRef(0);

  const show = useCallback((message: string, variant: ToastMessage['variant'] = 'default') => {
    const id = ++idRef.current;
    setToast({ id, message, variant });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 2400);
  }, []);

  const bg =
    toast?.variant === 'success'
      ? tokens.semantic.success
      : toast?.variant === 'error'
      ? tokens.semantic.error
      : tokens.text.primary;

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast ? (
        <Animated.View
          entering={FadeInDown}
          exiting={FadeOutDown}
          style={{
            position: 'absolute',
            bottom: spacing[10],
            left: spacing[4],
            right: spacing[4],
            backgroundColor: bg,
            borderRadius: radii.md,
            padding: spacing[4],
          }}
        >
          <Text style={{ color: tokens.text.inverse }} align="center">
            {toast.message}
          </Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}
