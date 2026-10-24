# Local notifications — 2026-10-24

Implemented in `src/features/notifications`. Notifications are local to the phone;
Groq, the AI backend, push tokens, and a push service are not involved.

## Available behavior

- Home bell directly toggles the master preference, then briefly slides up a
  non-interactive status message that dismisses automatically. No second switch
  or confirmation is required. Home and Settings share a persisted master
  preference. The displayed on
  state also requires OS permission and an unblocked Android reminder channel.
- Onboarding and Settings create the Android channel before asking for permission.
  Denied access is explained with a link to phone settings; no automatic repeated prompts.
- Settings includes a test notification (five seconds), refresh, scheduled count,
  schedule horizon, permission/error status, and foreground location refresh.
- Prayer: five daily prayers, no sunrise. Uses the same AlAdhan query/cache and
  on-device fallback calculation as Prayer. No reminders for the UI's Makkah
  fallback; an actual location fix from the last 24 hours and location permission
  are required when refreshing the schedule. No background location permission.
- Morning/evening Adhkar: default 20 minutes after Fajr/Asr, adjustable 0–120 minutes.
  Tapping opens the corresponding Dua & Adhkar category.
- Daily verse: default 09:00, adjustable 24-hour local time. Uses Home's daily
  selection and opens that ayah.
- Daily hadith: default 18:00, adjustable. Uses Home's daily selection and opens
  the matching collection with the reference prefilled in search.
- Friday: default 08:00, adjustable. Opens Al-Kahf; no assumption about local
  congregational prayer time.
- Hifz revision and missed-revision alerts remain unavailable, visibly explained
  in Settings. Existing stored flags are preserved but never scheduled. The
  current manual memorization workflow cannot reliably identify completed or
  missed revision sessions; implement that workflow first.

New installs start with the master off, prayer category on, other categories off.
Existing saved preferences are preserved and merged with new timing defaults.
The master switch does not erase category preferences.

## Scheduling and limitations

Schedules cover the current local calendar day and the next two days, using
one-off dates, not perpetual repeats of a stale prayer time or verse. Refresh
runs after onboarding, on app foreground, after notification/prayer setting
changes, and every 30 minutes while active. Open the app daily to replenish the
schedule. There is no background task to replenish it after the app stays closed
for three days. Travel/timezone changes are repaired on refresh; refresh location
explicitly after travelling.

Changing preferences reconciles stable reminder identifiers; unchanged pending
notifications are retained, obsolete managed reminders are cancelled, and rapid
refreshes serialize native mutations. Master off or revoked permission cancels
pending managed reminders, including the test. Other notification identifiers
are not touched. Taps are validated against known destinations and deduplicated
across cold starts.

This build does NOT declare/request exact-alarm access. Installed Expo
notifications 0.28 uses Android's inexact `setAndAllowWhileIdle` fallback without
that access. Delivery can be delayed by idle/battery restrictions. Five seconds
is the test's requested delay, not a hard timing guarantee. Channel settings,
Do Not Disturb, force-stop, and device power restrictions can affect delivery.
Adding precise prayer alarms needs a separately tested native configuration and
permission flow, followed by an APK rebuild. This implementation uses the already
installed native modules and does not need a rebuild.

## Verification

`npm test`, `npm run typecheck`, and targeted ESLint checks. Notification tests
cover date/category filtering, no sunrise, Friday, bounded schedule, content tap
routes, invalid times/routes, denied permission, blocked channels, cancellation,
missing location, rapid disable, and recovery after native scheduling failure.

Device acceptance: Settings → Notifications → enable → Send test notification.
Check foreground and locked-phone delivery, tap to reopen Settings, then turn the
master off and confirm pending reminders are cancelled. Repeat a category change
and verify scheduled counts. Test exact timing separately before making any
punctual prayer-alert claim.

On the connected Xiaomi Android 13 device (existing target-SDK-34 development
APK), OS permission and the reminder channel were verified. Android's notification
manager confirmed delivery of the five-second test and a scheduled Maghrib
reminder. The native pending schedule contained 20 remaining unique one-off
reminders through October 26, with correct prayer/content destinations. The new
Settings screen rendered correctly; no React Native/Android runtime error was
reported during this check. On October 24, 2026 (Asia/Dhaka), the user confirmed
both remaining delivery/navigation checks: tapping the test notification opened
Notifications settings, and a second test notification arrived with the phone
locked. This confirms basic delivery and tap navigation on this device; it does
not establish exact prayer-time delivery or long-term background reliability.
