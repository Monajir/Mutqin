# Mutqin

Mutqin is an offline-first Islamic learning application built with React Native, Expo, and Expo Router. It combines Quran reading, an Islamic reference library, daily worship utilities, local progress tracking, and an in-development AI-assisted Hifz workflow.

## Current project status

The Android application is usable as a development build, but it is not yet production-ready.

| Area | Current condition |
| --- | --- |
| Quran | Complete 114-surah reader with Arabic, English, and combined modes, Uthmani font, last-read tracking, daily ayah, and verse bookmarks |
| Islamic library | Offline Hadith collections, categorized duas, the 99 Names of Allah, search, and unified bookmarks |
| Prayer | Device-location prayer times from AlAdhan, one-second live countdown, cached data, accurate offline calculation, and Qibla compass |
| Home | Live prayer summary, date-based daily ayah and hadith, Hifz progress, and quick actions |
| Hifz | Start/end range selection, recording, aligned backend contract, word-level review, explicit acceptance, and revision tracking |
| Settings and onboarding | Theme, notification preferences, language scaffolding, permissions, and onboarding flow |
| Backend | The general Mutqin API, authentication, cloud synchronization, and production AI hosting are not deployed |

## Offline content

The bundled [`assets/db/quran-content.db`](assets/db/quran-content.db) currently contains:

- 114 surahs and 6,236 ayahs
- 33,511 hadiths across six collections
- 70 verified duas
- 99 Names of Allah

The database is installed automatically on first launch. When the bundled content version changes, Mutqin replaces reference-content tables while preserving user-owned bookmarks and Hifz progress.

## Prayer-time behavior

Prayer times are no longer hardcoded.

1. The app requests the device's foreground location.
2. It fetches coordinate-based daily timings from the public AlAdhan API.
3. React Query persists the result locally for restarts and temporary loss of connectivity.
4. If the request fails, the `adhan` library performs the astronomical calculation on the device.
5. The next-prayer state and countdown are recalculated locally every second; no repeated API request is needed for the timer.

The prayer screen identifies whether the displayed schedule came from AlAdhan or the offline calculator. The selected calculation method is passed to both providers.

## Technology

- Expo SDK 51 and React Native 0.74
- Expo Router with typed routes
- TypeScript
- SQLite for reference content and user records
- MMKV and Zustand for local application state
- TanStack React Query with persisted caching
- AlAdhan API with `adhan` offline fallback
- KFGQPC Uthmanic Script HAFS font
- Python/FastAPI backend with a replaceable Quran ASR adapter

## Getting started

Install the dependencies:

```bash
npm install
```

Mutqin uses native modules and should be run with a development client rather than Expo Go.

### Android over USB

Connect an Android phone with USB debugging enabled, accept the authorization prompt, and confirm that `adb devices` reports it as `device` rather than `offline`.

```bash
adb reverse tcp:8081 tcp:8081
npx expo start --dev-client --localhost --clear
```

Open the installed Mutqin development app on the phone. After the first successful start, `--clear` is normally unnecessary unless Metro has stale assets or cached modules.

To create/install a local native development build:

```bash
npx expo run:android
```

Alternatively, create an EAS development APK using the `development` profile in [`eas.json`](eas.json).

## Environment configuration

Optional environment variables are read by [`app.config.js`](app.config.js):

```bash
EXPO_PUBLIC_API_BASE_URL=https://your-mutqin-backend.example.com/v1
EXPO_PUBLIC_AUDIO_BASE_URL=https://your-audio-host.example.com
```

`EXPO_PUBLIC_API_BASE_URL` currently defaults to `https://api.mutqin.app/v1`, which is a placeholder until the Mutqin backend is deployed. The AlAdhan prayer-time request is independent of this backend URL.

After changing an Expo public environment variable, restart Metro. A new native/EAS build is only required when the value must be baked into a distributed binary.

## Hifz evaluation service

[`mutqin-ai-service`](mutqin-ai-service/) contains the minimal FastAPI backend for `POST /v1/hifz/evaluate`. It validates a consecutive ayah range, retrieves canonical Quran text, transcribes the recording through a replaceable ASR adapter, and deterministically aligns the recognized words with the expected passage.

The workflow and service contract exist, but the AI feature still needs:

- Real-device and real-recitation accuracy benchmarking
- Authentication, rate limiting, monitoring, and secure deployment
- Selection of the production ASR model based on measured results

The first version reports word matches, substitutions, and omissions only. It does not claim pronunciation or Tajweed assessment. Evaluation results update local Hifz progress only after the user accepts them.

See [`mutqin-ai-service/README.md`](mutqin-ai-service/README.md) for setup and deployment details.
See [`BACKEND_AI_INTEGRATION_PLAN.md`](BACKEND_AI_INTEGRATION_PLAN.md) for the aligned architecture and controlled-beta plan.

## Project structure

```text
app/                         Expo Router route files
assets/db/                   Bundled SQLite content database
assets/fonts/                Bundled Quran font
mutqin-ai-service/           Standalone Hifz evaluation backend prototype
src/
  components/                Shared application components
  design-system/             Tokens, primitives, and reusable UI components
  features/                  Quran, library, bookmarks, prayer, Hifz, home, settings
  services/                  API, AI-provider, prayer-provider, and storage services
  stores/                    Cross-feature Zustand stores
  hooks/                     Shared hooks
  lib/                       Query, date/time, RTL, and framework utilities
  config/                    Runtime configuration and dependency composition
  constants/                 Shared domain constants
```

Features expose their public surface through their own `index.ts`. Code outside a feature should not import its internal screens, components, stores, hooks, or API modules directly.

## Verification

Run the TypeScript check before committing changes:

```bash
npm run typecheck
```

The standalone Hifz service has its own Python test suite:

```bash
cd mutqin-ai-service
pytest tests/ -v
```

## Main remaining work

- Validate, deploy, and secure the Hifz evaluation backend
- Implement authentication and cloud synchronization
- Configure a reliable Quran recitation audio host
- Complete notification scheduling and prayer-setting controls
- Add broader automated mobile tests, accessibility review, and translation coverage
- Perform release QA and prepare production builds

See [`IMPLEMENTATION_ROADMAP.md`](IMPLEMENTATION_ROADMAP.md) for the original implementation plan. Some earlier phase labels in that document may not reflect features that have since been completed.
