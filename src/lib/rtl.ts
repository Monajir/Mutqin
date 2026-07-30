import { I18nManager } from 'react-native';

/**
 * Applies RTL layout direction for Arabic locale. Must be called before app
 * render and may require an app restart to fully take effect (RN limitation
 * — see AppearanceSettingsScreen for the "restart required" prompt).
 */
export function applyLayoutDirectionForLocale(locale: string): boolean {
  const shouldBeRtl = locale === 'ar';
  if (I18nManager.isRTL !== shouldBeRtl) {
    I18nManager.allowRTL(shouldBeRtl);
    I18nManager.forceRTL(shouldBeRtl);
    return true; // restart required
  }
  return false;
}
