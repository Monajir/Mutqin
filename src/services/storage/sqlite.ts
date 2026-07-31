import * as SQLite from 'expo-sqlite';
import { importDatabaseFromAssetAsync } from 'expo-sqlite';

/**
 * Offline-first content and user-data database (§10 of the spec: Quran,
 * Hadith, Dua/Adhkar, Names, bookmarks, and Hifz progress must all be fully
 * available offline). Bulk reference content ships pre-populated in the app
 * bundle/downloaded packs; user-generated data (progress, bookmarks) is
 * written locally first and queued for sync (see useSyncQueueStore).
 */
const DB_NAME = 'mutqin.db';
const BUNDLED_CONTENT_DB_NAME = 'mutqin-quran-content.db';
const EXPECTED_SURAH_COUNT = 114;
const EXPECTED_AYAH_COUNT = 6236;
const QURAN_CONTENT_ASSET = require('../../../assets/db/quran-content.db');

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initializationPromise: Promise<void> | null = null;

/**
 * Installs the complete bundled Quran database on first launch, then applies
 * the app's additive migrations. The asset import is deliberately
 * non-destructive: an existing database containing user progress and
 * bookmarks is never overwritten.
 *
 * This must finish before any code calls getDb().
 */
export function initializeDatabase(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = initializeDatabaseOnce();
  }

  return initializationPromise;
}

async function initializeDatabaseOnce(): Promise<void> {
  await importDatabaseFromAssetAsync(DB_NAME, {
    assetId: QURAN_CONTENT_ASSET,
    forceOverwrite: false,
  });

  runMigrations();

  const db = getDb();
  const surahCount = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM surahs;'
  )?.count ?? 0;
  const ayahCount = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM ayahs;'
  )?.count ?? 0;

  if (surahCount !== EXPECTED_SURAH_COUNT || ayahCount !== EXPECTED_AYAH_COUNT) {
    await importDatabaseFromAssetAsync(BUNDLED_CONTENT_DB_NAME, {
      assetId: QURAN_CONTENT_ASSET,
      // This separate database contains no user data and is safe to refresh.
      forceOverwrite: true,
    });
    replaceQuranContentFromBundledDatabase();
  }
}

interface BundledSurahRow {
  id: number;
  name_arabic: string;
  name_translit: string;
  name_translation: string;
  ayah_count: number;
  revelation_place: string;
}

interface BundledAyahRow {
  surah_id: number;
  ayah_number: number;
  text_arabic: string;
  text_translation: string;
  juz: number;
}

/**
 * Upgrades installations that still contain the old three-surah demo seed.
 * Only reference-content tables are replaced; all user-owned tables remain
 * untouched.
 */
function replaceQuranContentFromBundledDatabase(): void {
  const contentDb = SQLite.openDatabaseSync(BUNDLED_CONTENT_DB_NAME);
  let surahs: BundledSurahRow[];
  let ayahs: BundledAyahRow[];

  try {
    surahs = contentDb.getAllSync<BundledSurahRow>(
      'SELECT * FROM surahs ORDER BY id;'
    );
    ayahs = contentDb.getAllSync<BundledAyahRow>(
      'SELECT * FROM ayahs ORDER BY surah_id, ayah_number;'
    );
  } finally {
    contentDb.closeSync();
  }

  if (surahs.length !== EXPECTED_SURAH_COUNT || ayahs.length !== EXPECTED_AYAH_COUNT) {
    throw new Error(
      `Bundled Quran database is incomplete: found ${surahs.length} surahs and ${ayahs.length} ayahs`
    );
  }

  const db = getDb();
  db.withTransactionSync(() => {
    db.execSync('DELETE FROM ayahs; DELETE FROM surahs;');

    const insertSurah = db.prepareSync(
      `INSERT INTO surahs
        (id, name_arabic, name_translit, name_translation, ayah_count, revelation_place)
       VALUES (?, ?, ?, ?, ?, ?);`
    );
    const insertAyah = db.prepareSync(
      `INSERT INTO ayahs
        (surah_id, ayah_number, text_arabic, text_translation, juz)
       VALUES (?, ?, ?, ?, ?);`
    );

    try {
      for (const surah of surahs) {
        insertSurah.executeSync(
          surah.id,
          surah.name_arabic,
          surah.name_translit,
          surah.name_translation,
          surah.ayah_count,
          surah.revelation_place
        );
      }

      for (const ayah of ayahs) {
        insertAyah.executeSync(
          ayah.surah_id,
          ayah.ayah_number,
          ayah.text_arabic,
          ayah.text_translation,
          ayah.juz
        );
      }
    } finally {
      insertSurah.finalizeSync();
      insertAyah.finalizeSync();
    }
  });

  const importedAyahCount = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM ayahs;'
  )?.count ?? 0;
  if (importedAyahCount !== EXPECTED_AYAH_COUNT) {
    throw new Error(`Quran content upgrade failed: imported ${importedAyahCount} ayahs`);
  }
}

export function getDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
    dbInstance.execSync('PRAGMA journal_mode = WAL;');
    dbInstance.execSync('PRAGMA foreign_keys = ON;');
  }
  return dbInstance;
}

/**
 * Ordered, additive migrations. Never edit a past migration once shipped —
 * append a new one. Run once at app startup, before any feature queries.
 */
const migrations: { version: number; statements: string[] }[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS surahs (
        id INTEGER PRIMARY KEY,
        name_arabic TEXT NOT NULL,
        name_translit TEXT NOT NULL,
        name_translation TEXT NOT NULL,
        ayah_count INTEGER NOT NULL,
        revelation_place TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS ayahs (
        surah_id INTEGER NOT NULL,
        ayah_number INTEGER NOT NULL,
        text_arabic TEXT NOT NULL,
        text_translation TEXT NOT NULL,
        juz INTEGER NOT NULL,
        PRIMARY KEY (surah_id, ayah_number),
        FOREIGN KEY (surah_id) REFERENCES surahs(id)
      );`,
      `CREATE TABLE IF NOT EXISTS hifz_progress (
        surah_id INTEGER NOT NULL,
        ayah_number INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('not_started','memorized','needs_revision','weak','strong')),
        last_reviewed_at TEXT,
        updated_at TEXT NOT NULL,
        source TEXT NOT NULL CHECK (source IN ('manual','ai_session')),
        synced INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (surah_id, ayah_number)
      );`,
      `CREATE TABLE IF NOT EXISTS hifz_sessions (
        id TEXT PRIMARY KEY,
        surah_id INTEGER NOT NULL,
        start_ayah INTEGER NOT NULL,
        end_ayah INTEGER,
        overall_accuracy REAL,
        created_at TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0
      );`,
      `CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        content_type TEXT NOT NULL CHECK (content_type IN ('quran','hadith','dua','name')),
        content_ref TEXT NOT NULL,
        collection_id TEXT,
        note TEXT,
        created_at TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0
      );`,
      `CREATE TABLE IF NOT EXISTS bookmark_collections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK (operation IN ('create','update','delete')),
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0
      );`,
      `CREATE INDEX IF NOT EXISTS idx_ayahs_juz ON ayahs(juz);`,
      `CREATE INDEX IF NOT EXISTS idx_bookmarks_type ON bookmarks(content_type);`,
    ],
  },
];

export function runMigrations(): void {
  const db = getDb();
  db.execSync(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);`);
  const row = db.getFirstSync<{ version: number }>('SELECT version FROM schema_version LIMIT 1;');
  const currentVersion = row?.version ?? 0;

  const pending = migrations.filter((m) => m.version > currentVersion).sort((a, b) => a.version - b.version);
  for (const migration of pending) {
    db.withTransactionSync(() => {
      for (const statement of migration.statements) db.execSync(statement);
      if (currentVersion === 0 && migration.version === pending[0]?.version) {
        db.runSync('INSERT INTO schema_version (version) VALUES (?);', migration.version);
      } else {
        db.runSync('UPDATE schema_version SET version = ?;', migration.version);
      }
    });
  }
}
