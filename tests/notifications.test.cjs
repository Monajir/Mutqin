const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, modules = {}) {
  const source = readFileSync(path.join(__dirname, '../', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, Date, setTimeout, clearTimeout, require: (name) => {
    if (name in modules) return modules[name];
    throw new Error('Unexpected import: ' + name);
  } });
  return exports;
}
const plan = load('src/features/notifications/notificationPlan.ts');
const defaults = {
  enabled: true, prayerReminders: true, morningAdhkar: true, eveningAdhkar: true,
  dailyVerse: true, dailyHadith: true, fridayReminder: true,
  hifzRevisionReminder: true, missedRevisionReminder: true,
  morningOffsetMinutes: 20, eveningOffsetMinutes: 20,
  dailyVerseTime: '09:00', dailyHadithTime: '18:00', fridayTime: '08:00',
};
function day(offset = 0) {
  const date = new Date(2026, 9, 23 + offset); // Friday, local calendar time.
  return { date, prayers: ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((name, i) => ({
    name, time: new Date(2026, 9, 23 + offset, [5, 6, 12, 15, 18, 20][i]).toISOString(),
  })), verse: { surahId: 2, ayahNumber: 3, translation: 'Verse', reference: '2:3' },
  hadith: { collectionId: 'bukhari', reference: 'Bukhari 1', excerpt: 'Hadith', source: 'Bukhari 1' } };
}

test('all supported reminders use future times, exclude sunrise and route to their content', () => {
  const items = plan.buildReminderPlan(defaults, [day()], new Date(2026, 9, 23).getTime());
  assert.equal(items.length, 10);
  assert.equal(items.filter(x => x.title.startsWith('Time for ')).length, 5);
  assert.ok(items.every(x => !x.title.includes('Sunrise') && !x.id.includes('revision')));
  assert.equal(items.find(x => x.id.endsWith('morning')).at, new Date(2026, 9, 23, 5, 20).getTime());
  assert.equal(items.find(x => x.id.endsWith('evening')).at, new Date(2026, 9, 23, 15, 20).getTime());
  assert.ok(items.find(x => x.id.endsWith('hadith')).route.endsWith('reference=Bukhari%201'));
  for (const item of items) assert.equal(plan.safeReminderRoute(item.route), item.route);
});

test('master off, individual opt-outs, missing location/content and past times are respected', () => {
  const now = new Date(2026, 9, 23, 18, 30).getTime();
  assert.equal(plan.buildReminderPlan({ ...defaults, enabled: false }, [day()], now).length, 0);
  const items = plan.buildReminderPlan(defaults, [day()], now);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Time for Isha');
  assert.equal(plan.buildReminderPlan({ ...defaults, prayerReminders: false }, [day()], now).length, 0);
  const noData = { ...day(), prayers: [], verse: null, hadith: null };
  assert.equal(plan.buildReminderPlan(defaults, [noData], now).length, 0);
});

test('three-day plan stays bounded and Friday only occurs on Friday', () => {
  const items = plan.buildReminderPlan(defaults, [day(), day(1), day(2)], new Date(2026, 9, 23).getTime());
  assert.equal(items.length, 28);
  assert.equal(items.filter(x => x.id.endsWith('friday')).length, 1);
  assert.equal(new Set(items.map(x => x.id)).size, items.length);
});

test('bad times and untrusted notification destinations are rejected', () => {
  for (const time of ['24:00', '12:60', '9:00', '', '12:3']) assert.equal(plan.validTime(time), false);
  for (const time of ['00:00', '23:59', '09:00']) assert.equal(plan.validTime(time), true);
  for (const route of ['https://evil.example', '/(tabs)/quran/999?ayah=1', '/(tabs)/quran/1?ayah=0', '/settings/appearance', null]) assert.equal(plan.safeReminderRoute(route), null);
});

function fixture() {
  const state = { settings: { ...defaults }, granted: true, channelBlocked: false, canAskAgain: true, lastLocation: null };
  const pending = new Map();
  const calls = { schedules: 0, permissionRequests: 0, channels: 0, prayers: 0 };
  const settingsStore = { getState: () => ({ settings: state.settings, setSetting: (key, value) => { state.settings = { ...state.settings, [key]: value }; } }) };
  const Notifications = {
    AndroidImportance: { HIGH: 4, NONE: 0 }, IosAuthorizationStatus: { PROVISIONAL: 3 },
    setNotificationChannelAsync: async () => { calls.channels++; },
    getNotificationChannelAsync: async () => ({ importance: state.channelBlocked ? 0 : 4 }),
    getPermissionsAsync: async () => ({ granted: state.granted, canAskAgain: state.canAskAgain }),
    requestPermissionsAsync: async () => { calls.permissionRequests++; },
    getAllScheduledNotificationsAsync: async () => [...pending.values()],
    cancelScheduledNotificationAsync: async (id) => { pending.delete(id); },
    scheduleNotificationAsync: async (item) => {
      calls.schedules++;
      if (state.failScheduling) throw Error('native failure');
      pending.set(item.identifier, item);
      return item.identifier;
    },
  };
  let generatedDays;
  const fixtureAt = Date.now() + 3600000;
  const runtime = load('src/features/notifications/notificationRuntime.ts', {
    'react-native': { Platform: { OS: 'android' }, Linking: { openSettings: async () => {} } },
    'expo-notifications': Notifications,
    'expo-location': { getForegroundPermissionsAsync: async () => ({ granted: true }), getLastKnownPositionAsync: async () => state.lastLocation },
    zustand: { create: (factory) => {
      let data = factory();
      const store = () => data;
      store.getState = () => data;
      store.setState = (patch) => { data = { ...data, ...patch }; };
      return store;
    } },
    '@/stores': { useNotificationSettingsStore: settingsStore },
    '@/features/prayer': { usePrayerSettingsStore: { getState: () => ({ settings: { locationMode: 'auto', calculationMethodId: 'karachi' } }) }, calculatePrayerTimesForDay: () => ({ prayers: [] }) },
    '@/features/quran': { quranRepository: { getDailyVerse: () => null } },
    '@/features/library': { libraryRepository: { getDailyHadith: () => null } },
    '@/services/prayer/aladhanClient': { fetchPrayerTimesFromAlAdhan: async () => { calls.prayers++; return { prayers: [] }; } },
    '@/lib/queryClient': { queryClient: { fetchQuery: (options) => options.queryFn() } },
    './notificationPlan': { ...plan, buildReminderPlan: (settings, days) => {
      generatedDays = days;
      return settings.enabled ? [{ id: plan.REMINDER_PREFIX + 'fixture', at: fixtureAt,
        title: 'Fixture', body: 'Body', route: '/(tabs)/prayer' }] : [];
    } },
  });
  return { runtime, state, pending, calls, getDays: () => generatedDays };
}

test('blocked permission and master off cancel managed reminders and tests only', async () => {
  for (const blocked of [true, false]) {
    const { runtime, state, pending } = fixture();
    state.granted = !blocked;
    state.settings.enabled = blocked;
    for (const id of [plan.REMINDER_PREFIX + 'old', plan.TEST_ID, 'another-feature']) pending.set(id, { identifier: id });
    await runtime.refreshNotifications();
    assert.deepEqual([...pending.keys()], ['another-feature']);
    assert.equal(runtime.useNotificationStatus.getState().count, 0);
  }
});

test('channel disabled is treated as blocked, without claiming successful enablement', async () => {
  const { runtime, state } = fixture();
  state.channelBlocked = true;
  assert.equal(await runtime.setNotificationsEnabled(true), false);
  assert.equal(state.settings.enabled, false);
  assert.equal(runtime.useNotificationStatus.getState().permission, 'blocked');
});

test('denied permission does not enable reminders, and test delivery requires permission', async () => {
  const { runtime, state, calls } = fixture();
  state.granted = false;
  state.canAskAgain = false;
  assert.equal(await runtime.setNotificationsEnabled(true), false);
  assert.equal(calls.permissionRequests, 0);
  assert.equal(calls.schedules, 0);
  await assert.rejects(runtime.sendTestNotification(), /Enable notifications/);
});

test('refresh removes obsolete reminders and never fabricates fallback-location prayers', async () => {
  const { runtime, calls, pending, getDays } = fixture();
  pending.set(plan.REMINDER_PREFIX + 'old', { identifier: plan.REMINDER_PREFIX + 'old' });
  await runtime.refreshNotifications();
  assert.equal(calls.prayers, 0);
  assert.ok(getDays().every(day => day.prayers.length === 0));
  assert.equal(pending.size, 1);
  assert.equal(pending.has(plan.REMINDER_PREFIX + 'old'), false);
  assert.equal(runtime.useNotificationStatus.getState().busy, false);
});

test('rapid refresh then disable leaves no scheduled reminder', async () => {
  const { runtime, state, pending } = fixture();
  const first = runtime.refreshNotifications();
  state.settings = { ...state.settings, enabled: false };
  await Promise.all([first, runtime.refreshNotifications()]);
  assert.equal(pending.size, 0);
  assert.equal(runtime.useNotificationStatus.getState().busy, false);
});

test('native scheduling failure is visible and a later refresh recovers', async () => {
  const { runtime, state } = fixture();
  state.failScheduling = true;
  await runtime.refreshNotifications();
  assert.match(runtime.useNotificationStatus.getState().error, /Could not refresh/);
  state.failScheduling = false;
  await runtime.refreshNotifications();
  assert.equal(runtime.useNotificationStatus.getState().error, null);
  assert.equal(runtime.useNotificationStatus.getState().count, 1);
});


test('unchanged refresh retains the existing schedule without duplicates', async () => {
  const { runtime, calls, pending } = fixture();
  await runtime.refreshNotifications();
  await runtime.refreshNotifications();
  assert.equal(calls.schedules, 1);
  assert.equal(pending.size, 1);
});
