import React, { forwardRef, useMemo } from 'react';
import GorhomBottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import { useAppTheme } from '../theme';

export interface AppBottomSheetProps {
  children: React.ReactNode;
  snapPoints?: (string | number)[];
  onDismiss?: () => void;
}

/** Wraps @gorhom/bottom-sheet with themed styling — used for pickers, filters, Qari selection. */
export const AppBottomSheet = forwardRef<GorhomBottomSheet, AppBottomSheetProps>(function AppBottomSheet(
  { children, snapPoints = ['50%', '85%'], onDismiss },
  ref
) {
  const { tokens } = useAppTheme();
  const points = useMemo(() => snapPoints, [snapPoints]);

  return (
    <GorhomBottomSheet
      ref={ref}
      index={-1}
      snapPoints={points}
      enablePanDownToClose
      onClose={onDismiss}
      backgroundStyle={{ backgroundColor: tokens.background.elevated, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl }}
      handleIndicatorStyle={{ backgroundColor: tokens.border.strong }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.4} />
      )}
    >
      <BottomSheetView style={{ padding: spacing[4] }}>{children}</BottomSheetView>
    </GorhomBottomSheet>
  );
});
