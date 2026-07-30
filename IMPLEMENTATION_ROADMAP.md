# Mutqin — Implementation Roadmap

**Author:** Technical Lead / Senior React Native Architect
**Status:** v1.0 — companion to `Project Specification v1.0` and `mutqin-frontend-architecture.md`
**Scope of this document:** what's built in the attached scaffold, what's left, in what order, and the engineering decisions made to fill gaps the spec left open.

---

## 1. What "done" looks like for this deliverable

I reviewed the Project Specification, the frontend architecture document, and the low-fidelity wireframes (10 screens: Home, Quran, Prayer, Hifz, Recorder, Results, Bookmarks, Hadith, Dua, Settings). None of the three contradicted each other, so no redesign decisions were needed — only implementation decisions where the documents were silent (documented in §7).

This isn't a fully-coded 12-feature app — that's not a one-sitting deliverable, and shipping 8 shallow features would be worse than shipping 5 solid ones the team can extend by copy-pattern. Instead:

- **Full production-quality implementation** of the architectural core (design system, services, stores, DI, offline storage) — every feature depends on this, so it had to be right first.
- **Four complete, wired, reference-quality features**: Hifz (the flagship — this is the hardest part to get right, and getting it right first de-risks the rest), Quran (Hifz depends on it), Prayer, Home, plus a functional Settings feature.
- **A visible, honest Phase 2 boundary**: Hadith, Dua & Adhkar, Allah's Names, and Bookmarks are not stubbed with fake data or TODOs — they're simply not built yet, and the "More" tab says so with a "Phase 2" badge rather than a dead link.

Every file that exists is real, working code — no `// TODO: implement this screen` files.

---

## 2. Architecture decisions & refinements to the frontend-architecture doc

The architecture document was thorough; the refinements below are additive, not corrective.

### 2.1 Feature module boundary — enforced, not just documented
The architecture doc specifies a `features/*` structure with public APIs. I made this **mechanically enforced** via an ESLint `boundaries` config (`.eslintrc.js`) rather than relying on convention: any import reaching into `features/x/screens/*`, `features/x/components/*`, etc. from outside `features/x` fails lint. This matters because "please only import from index.ts" conventions silently rot within a few sprints without tooling.

### 2.2 AI provider abstraction as a first-class layer
Spec §11 says "AI services should be abstracted behind interfaces." I made this concrete:
- `services/ai/hifzEvaluationProvider.ts` — the interface. `features/hifz/**` imports *only* this.
- `services/ai/providers/openaiCompatibleProvider.ts` — the one concrete implementation, isolated so it's the only file that knows about the vendor contract, multipart upload shape, timeout tuning, etc.
- `config/di.ts` — the composition root. One singleton binds interface to implementation. Adding a second provider (e.g., a different vendor, or an on-device fallback) means writing one new file and changing one line in `di.ts` — zero changes inside `features/hifz`.

This is the single most important architectural bet in this codebase, because the spec explicitly calls out the AI Hifz Assistant as the flagship feature and says future versions may need "multiple AI model support for recitation analysis" (§14). Getting the seam right now avoids a rewrite later.

### 2.3 Offline-first data layer — two stores, two purposes, no blur
The spec (§10) requires Quran/Hadith/Dua/Names/bookmarks/Hifz-progress/preferences to be fully offline. I split storage by access pattern rather than using one generic "storage" layer:
- **SQLite** (`services/storage/sqlite.ts`) — bulk, queryable, relational content: surahs, ayahs, hifz_progress, hifz_sessions, bookmarks, sync_queue. Anything you'd `WHERE`, `JOIN`, or `GROUP BY`.
- **MMKV** (`services/storage/mmkv.ts`) — small, hot, synchronous key-value reads: auth tokens, theme/language/notification prefs, last-read position. Anything read on every render or app boot.
- **React Query + MMKV persister** (`services/storage/queryPersister.ts`) — caches *server-derived* data (prayer times, future recommendations) so cold starts render instantly, offline, before any refetch.

Feature code never touches `getDb()` or `kvStorage` directly except inside that feature's `api/*Repository.ts` — this keeps SQL and storage-key strings from leaking into components.

### 2.4 Sync is additive, not blocking
`hifz_progress`, `hifz_sessions`, and `bookmarks` tables carry a `synced` flag; writes go to SQLite immediately (so the UI never waits on network) and are queued in `useSyncQueueStore` / `sync_queue` table. The actual push-to-server worker is **not implemented** in this scaffold — it's Phase 3 (needs a real backend contract first) — but the queue and the `OfflineBanner` UI that surfaces "Syncing N pending changes" are wired and ready for it.

### 2.5 Design tokens duplicated once, deliberately
`tailwind.config.js` can't `require()` a `.ts` file under plain Node, so token *values* are mirrored in JS there with an explicit comment pointing back to the TS source of truth. This is a known, contained piece of tech debt — not an oversight — and is called out as a Phase 0 tooling task (a `check-tokens.js` sync-verification script) rather than silently left inconsistent.

---

## 3. Reusable components (design-system + shared)

| Layer | Component | Purpose |
|---|---|---|
| Primitives | `Box`, `VStack`/`HStack`, `Text`, `Pressable`, `Button`, `IconButton`, `Icon`, `Input`, `Divider`, `Surface` | Token-driven building blocks. No feature code should hardcode a hex color, px value, or font size — always through these. |
| Composites | `Card`, `Badge`, `ProgressBar`, `Skeleton`/`SkeletonListRow`, `SearchBar`, `ListRow`, `SegmentedControl`, `Modal`, `AppBottomSheet`, `AudioPlayerBar`, `ToastProvider` | Cross-feature UI patterns (used by ≥3 features each). |
| App-aware shared | `ScreenWrapper`, `EmptyState` (4 variants: no-data / no-results / offline / error), `ErrorBoundary`, `ArabicText`, `OfflineBanner` | Depend on stores/theme; still feature-agnostic. |

**Design principle enforced throughout:** every list-rendering screen must explicitly handle all four `EmptyState` variants (empty / no search results / offline / error) — not just the happy path. This was a deliberate response to spec §4's "never overwhelm the user" and the wireframes' consistent inclusion of state affordances.

---

## 4. Shared services

- **`services/api/client.ts`** — single `apiRequest<T>()` wrapping fetch: timeout, auth header injection, FormData vs JSON body handling, session-expiry side effect, and normalization of every failure into `ApiError` (never a raw fetch/Axios error reaches a screen).
- **`services/api/errors.ts`** — `ApiError` with a `retryable` flag consumed directly by the React Query default retry policy (`lib/queryClient.ts`), so retry logic isn't reimplemented per feature.
- **`services/ai/*`** — see §2.2.
- **`services/storage/*`** — see §2.3.

## 5. Custom hooks

| Hook | Location | Purpose |
|---|---|---|
| `useHifzSession` | `features/hifz/hooks` | Orchestrates record → evaluate → apply-status-updates → persist-session for one recitation cycle. |
| `useRecitationRecorder` | `features/hifz/hooks` | Press-and-hold audio recording via `expo-av`, decoupled from evaluation logic. |
| `usePrayerTimes` | `features/prayer/hooks` | Location acquisition + live-ticking countdown + calculation. |
| `useQibla` | `features/prayer/hooks` | Magnetometer heading vs. great-circle bearing to the Kaaba. |
| `useHomeData` | `features/home/api` | Aggregates prayer/hifz/daily-content queries for the Home screen without Home knowing internals of other features (all via public barrels). |
| `useDebouncedValue`, `useNetworkStatus` | `hooks/` | Cross-feature utilities. |

## 6. Contexts / stores

| Store | Kind | Scope |
|---|---|---|
| `ThemeContext` (+ `useThemeStore`) | Context + Zustand | Resolved light/dark tokens; persisted preference. |
| `useAuthStore` | Zustand | Optional — gates only cloud sync/personalization, never core offline reading (per spec §10). |
| `useConnectivityStore` | Zustand | Live online/offline flag, drives `OfflineBanner`. |
| `useSyncQueueStore` | Zustand | In-memory mirror of the `sync_queue` SQLite table. |
| `useAudioPlayerStore` | Zustand | One global mini-player shared by Quran/Dua/Names audio. |
| `useNotificationSettingsStore` | Zustand | Per-category notification toggles (spec §9). |
| `useAppStore` | Zustand | Onboarding-complete + DB-ready flags — gates root navigation. |
| `useHifzSessionStore` | Zustand, feature-local | Ephemeral active-session UI state — deliberately not persisted/synced (a session either completes into durable SQLite rows or is abandoned). |
| `usePrayerSettingsStore` | Zustand, feature-local | Calculation method, location mode. |

## 7. Engineering decisions made where the spec was silent

| Gap | Decision | Rationale |
|---|---|---|
| Prayer time calculation algorithm | v1 uses documented fixed-offset approximation, function signature designed for a drop-in swap to the `adhan` library | Spec didn't mandate a calculation library; shipping the UI/UX correctly now and swapping the math later is lower-risk than blocking on library evaluation |
| Hifz status thresholds (what accuracy % = "strong" vs "needs revision") | 95%+ → strong, 80–94% → memorized, 50–79% with errors → needs_revision, else weak; spaced-revision intervals 14/3/1 days | Spec defines the five statuses and that they matter for scheduling, not the exact thresholds — pure function in `scoreRecitation.ts`, isolated and swappable pending real usage data |
| Hifz session verse-range size | Look ahead 15 ayahs per session start | Balances "don't overwhelm" (spec §4) against not requiring mid-session refetches |
| Auth requirement | Fully optional/guest-first | Spec §10 explicitly scopes auth to sync/backup/personalization only |
| Which screens are in v1 vs Phase 2 | Hifz, Quran, Prayer, Home, Settings, Onboarding now; Hadith/Dua/Adhkar/Names/Bookmarks next, following the same pattern | All four Phase-2 features are structurally identical (browse → detail → bookmark) — building one well and documenting the pattern is higher-leverage than building four shallowly |
| Notification scheduling implementation | Store + settings UI built; actual `expo-notifications` scheduling logic deferred | Needs prayer-time-calculation accuracy finalized first (notifications reference prayer times) — sequencing issue, not a design gap |

---

## 8. Build order (recommended sequence for the team from here)

### Phase 0 — Tooling & CI (before more feature work)
1. Wire up the actual dev/prod backend base URL and confirm `services/api/client.ts` against a real contract.
2. Add `scripts/check-tokens.js` to keep `tailwind.config.js` and `design-system/tokens/*.ts` in sync (see §2.5).
3. Pick and wire a crash-reporting SDK into `lib/errorReporting.ts` (currently console-only in dev, single TODO in the codebase).
4. Set up `jest-expo` test running in CI; add unit tests for the pure functions first — `scoreRecitation.ts`, `prayerTimeCalculator.ts` — since they're already isolated and dependency-free.

### Phase 1 — Content pipeline (blocks nearly everything downstream)
1. Real mushaf ingestion into SQLite (114 surahs, 6236 ayahs) — replace `seedContent.ts`'s 3-surah demo set. This is a data pipeline task (source verification per spec's "Authenticity first" note), not application code.
2. Hadith and Dua/Adhkar reference content ingestion, same authenticity bar.
3. Audio CDN/hosting for Qari recitations — `AyahRow`/`AudioPlayerBar` are already wired to consume `uri` strings; only the URL scheme needs to be finalized.

### Phase 2 — Remaining content features (follow the Quran pattern exactly)
Build order, each following `features/quran/{types,api/*Repository.ts,api/*Queries.ts,components,screens,index.ts}`:
1. **Hadith** — collections → list → detail, `hadith_collections`/`hadiths` SQLite tables (same migration-append pattern as `sqlite.ts`).
2. **Dua & Adhkar** — category grid → reader; note spec's "context-aware" recommendation requirement (morning/evening/Friday/travel) — this is a thin rules layer on top of the same content model, build after the base browse/read flow works.
3. **Allah's Names** — grid → detail; simplest of the four, good for a less-senior contributor to build first as a warm-up on the pattern.
4. **Bookmarks** — cross-cutting; the `bookmarks`/`bookmark_collections` SQLite tables already exist in the schema. Needs one query per content type plus a unified list/filter screen.

### Phase 3 — Sync & backend integration
1. Implement the actual sync worker consuming `sync_queue` (push on reconnect, per `useConnectivityStore`).
2. Auth screens (sign in/up) — `useAuthStore` is ready to receive tokens; no UI exists yet.
3. Recommendation engine integration — `useHomeData`'s `DAILY_CONTENT_POOL` is a documented placeholder for the real `/recommendations/*` endpoints already stubbed in `services/api/endpoints.ts`.

### Phase 4 — Hifz Assistant hardening
1. Real backend endpoint behind `OpenAICompatibleHifzEvaluationProvider` (currently calls a not-yet-existing `/hifz/evaluate`).
2. Streaming partial-word evaluation (the `onPartialUpdate` callback is already in the interface, unused by the v1 provider — this is the natural next increment without touching `features/hifz`).
3. Tajweed-level analysis — explicitly out of scope per spec §6, revisit post-v1.

### Phase 5 — Notifications
1. `expo-notifications` scheduling logic driven off `useNotificationSettingsStore` + finalized prayer-time accuracy (Phase 0/1 dependency).

### Phase 6 — Polish & internationalization
1. Full Arabic + Bengali translation coverage (i18n structure and RTL layout switching already implemented in `i18n/` and `lib/rtl.ts` — only string coverage is missing).
2. Accessibility audit (dynamic type scaling and screen-reader labels are in place on primitives; needs a pass on the four Phase-2 features once built).
3. Real app icons/splash/fonts (Inter, Noto Naskh Arabic, KFGQPC Uthmanic Script referenced in `typography.ts` but not bundled in this scaffold — `assets/` is a placeholder directory).

---

## 9. Known limitations of this scaffold (be upfront about these)

- **No backend exists.** `services/api/client.ts` and every endpoint in `endpoints.ts` point at a URL that returns nothing today. The app runs fully offline against seeded SQLite data.
- **Seed content is 3 surahs**, not the full mushaf — enough to demonstrate every screen and the Hifz flow end-to-end, not enough to actually memorize the Quran with.
- **Prayer time math is an approximation**, clearly flagged in code and here, not fiqh-accurate.
- **No test suite yet** — `jest`/`jest-expo` are in `package.json` but no test files are included; Phase 0 task.
- **Fonts aren't bundled** — `typography.ts` references font families that need to be added via `expo-font` + actual font files in `assets/fonts/`.

None of these block a `npx expo start` demo of the full navigation, offline Quran reading, live prayer countdown, Qibla compass, or a full (mocked-evaluation) Hifz session walkthrough once a real evaluation endpoint or a local stub is added.
