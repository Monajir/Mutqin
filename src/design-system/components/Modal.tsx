import React from 'react';
import { Modal as RNModal, View, Pressable as RNPressable } from 'react-native';
import { Surface } from '../primitives/Surface';
import { spacing } from '../tokens/spacing';
import { useAppTheme } from '../theme';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/** Centered modal dialog for confirmations, pickers, etc. */
export function Modal({ visible, onClose, children }: ModalProps) {
  const { tokens } = useAppTheme();

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <RNPressable
        onPress={onClose}
        accessibilityLabel="Close dialog"
        style={{
          flex: 1,
          backgroundColor: tokens.overlay,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing[6],
        }}
      >
        <RNPressable onPress={(e) => e.stopPropagation()} style={{ width: '100%' }}>
          <Surface elevationLevel="high" p={5}>
            {children}
          </Surface>
        </RNPressable>
      </RNPressable>
    </RNModal>
  );
}
