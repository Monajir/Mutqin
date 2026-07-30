# Mutqin — Frontend Scaffold

React Native (Expo Router) implementation scaffold for Mutqin, generated from `Project Specification v1.0`, `mutqin-frontend-architecture.md`, and the low-fidelity wireframes.

## What's in this scaffold

**Fully implemented (reference-quality, wired end-to-end):**
- Core infrastructure: design tokens, primitives, shared components, API client, AI provider abstraction, SQLite + MMKV storage, Zustand stores, React Query setup, i18n, DI composition root
- **Hifz feature** (flagship): setup → recitation → AI evaluation → progressive verse reveal → summary → spaced-revision tracking
- **Quran feature**: surah list, reader, last-read tracking (SQLite-backed, fully offline)
- **Prayer feature**: live countdown, daily times, Qibla compass, calculation method settings
- **Home feature**: daily content, prayer summary, Hifz progress widget, quick actions
- **Settings feature**: appearance (theme), notifications, language, about
- **Onboarding flow**: welcome → language → permissions
- Root navigation shell: tabs, modals, offline banner, error boundaries, toast system

**Scaffolded as Phase 2 (pattern established, not yet built)**: Hadith, Dua & Adhkar, Allah's Names, Bookmarks. These follow the *exact* repository → queries → components → screens pattern used by the Quran feature. The "More" tab hub links to them with a visible "Phase 2" badge rather than a dead link, so the app never lies about what's implemented.

See `IMPLEMENTATION_ROADMAP.md` for the full plan, build order, and what's left.

## Getting started

```bash
npm install
npx expo start
```

Requires Expo CLI and either a simulator/emulator or the Expo Go app (note: `expo-sqlite`, `expo-av`, and native modules require a development build rather than Expo Go for full functionality — run `npx expo prebuild` and `npx expo run:ios` / `run:android`).

## Environment

Set `EXPO_PUBLIC_API_BASE_URL` to point at your backend; defaults to `https://api.mutqin.app/v1` (placeholder — no such backend exists yet, see roadmap Phase 3).

## Project structure

```
app/                    Expo Router routes (thin — screens live in src/features/*)
src/
  design-system/        tokens, primitives, composite components (framework-agnostic of features)
  components/            shared, app-aware composites (ScreenWrapper, EmptyState, ErrorBoundary...)
  services/              api client, AI provider abstraction, storage (SQLite + MMKV)
  stores/                cross-cutting Zustand stores (auth, theme, connectivity, audio player...)
  hooks/                 shared hooks
  lib/                   framework utilities (query client, date/time, RTL, error reporting)
  types/, constants/, config/, i18n/
  features/
    <feature>/
      screens/           full-page components, bound to app/ routes
      components/        feature-local UI
      hooks/              feature-local hooks
      api/                React Query hooks + repository (SQLite) or fetchers (services/api)
      store/              feature-local Zustand state (if any)
      types/, utils/, constants/
      index.ts            PUBLIC API — the only thing other code may import
```

**The one rule that matters most:** never import from inside another feature's `screens/`, `components/`, `hooks/`, `store/`, or `api/` — always go through that feature's `index.ts`. This is enforced by the `boundaries` ESLint plugin configured in `.eslintrc.js`.
