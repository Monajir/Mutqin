/**
 * Single funnel for non-fatal error reporting. Swap the console.error below
 * for a crash-reporting SDK (Sentry, etc.) in one place — no feature code
 * should import a reporting SDK directly.
 */
export function reportError(error: Error, context?: Record<string, unknown>): void {
  if (__DEV__) {
    console.error('[Mutqin error]', error, context);
    return;
  }
  // TODO(infra): wire to crash reporting SDK once selected (see roadmap Phase 0).
  console.error('[Mutqin error]', error.message, context);
}
