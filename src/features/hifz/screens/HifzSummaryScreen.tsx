import React from 'react';
import { Redirect } from 'expo-router';

/** Legacy result links now open the checker's inline feedback. */
export function HifzSummaryScreen() {
  return <Redirect href="/(tabs)/hifz/session" />;
}
