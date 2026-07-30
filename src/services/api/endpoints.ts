/** Centralized endpoint path constants — no inline URL strings in fetchers. */
export const endpoints = {
  auth: {
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
  },
  quran: {
    contentManifest: '/quran/content-manifest',
    lastRead: '/quran/last-read',
  },
  hadith: {
    contentManifest: '/hadith/content-manifest',
  },
  dua: {
    contentManifest: '/dua/content-manifest',
  },
  namesOfAllah: {
    contentManifest: '/names-of-allah/content-manifest',
  },
  prayer: {
    times: '/prayer/times',
  },
  hifz: {
    progress: '/hifz/progress',
    sessions: '/hifz/sessions',
    evaluate: '/hifz/evaluate',
  },
  bookmarks: {
    root: '/bookmarks',
    collections: '/bookmarks/collections',
  },
  recommendations: {
    quran: '/recommendations/quran',
    hadith: '/recommendations/hadith',
    dua: '/recommendations/dua',
  },
  sync: {
    push: '/sync/push',
  },
} as const;
