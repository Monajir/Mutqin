export const HIFZ_STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  memorized: 'Memorized',
  needs_revision: 'Needs Revision',
  weak: 'Weak',
  strong: 'Strong',
};

/** Days since last review after which an ayah is surfaced in the revision queue. */
export const REVISION_INTERVAL_DAYS: Record<'strong' | 'needs_revision' | 'weak', number> = {
  strong: 14,
  needs_revision: 3,
  weak: 1,
};

export const MAX_RECORDING_DURATION_SEC = 600;
