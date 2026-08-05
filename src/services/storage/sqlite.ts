import * as SQLite from 'expo-sqlite';
import { importDatabaseFromAssetAsync } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

/**
 * Offline-first content and user-data database (§10 of the spec: Quran,
 * Hadith, Dua/Adhkar, Names, bookmarks, and Hifz progress must all be fully
 * available offline). Bulk reference content ships pre-populated in the app
 * bundle/downloaded packs; user-generated data (progress, bookmarks) is
 * written locally first and queued for sync (see useSyncQueueStore).
 */
const DB_NAME = 'mutqin.db';
const BUNDLED_CONTENT_DB_NAME = 'mutqin-content-pack.db';
const BUNDLED_CONTENT_VERSION = '2026-07-31-library-with-names';
const EXPECTED_SURAH_COUNT = 114;
const EXPECTED_AYAH_COUNT = 6236;
const EXPECTED_HADITH_COUNT = 33511;
const EXPECTED_DUA_COUNT = 70;
const EXPECTED_NAME_COUNT = 99;
const CONTENT_ASSET = require('../../../assets/db/quran-content.db');

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
  const databaseDirectory = `${FileSystem.documentDirectory}SQLite`;
  const databasePath = `${databaseDirectory}/${DB_NAME}`;
  const databaseAlreadyExisted = (await FileSystem.getInfoAsync(databasePath)).exists;

  await importDatabaseFromAssetAsync(DB_NAME, {
    assetId: CONTENT_ASSET,
    forceOverwrite: false,
  });

  runMigrations();

  const db = getDb();
  const installedVersion = db.getFirstSync<{ version: string }>(
    'SELECT version FROM content_pack_state WHERE id = 1;'
  )?.version;

  if (!databaseAlreadyExisted) {
    validateInstalledContent();
    setInstalledContentVersion();
  } else if (installedVersion !== BUNDLED_CONTENT_VERSION) {
    await importDatabaseFromAssetAsync(BUNDLED_CONTENT_DB_NAME, {
      assetId: CONTENT_ASSET,
      // This separate database contains no user data and is safe to refresh.
      forceOverwrite: true,
    });
    replaceReferenceContentFromBundledDatabase(databaseDirectory);
  }
}

/**
 * Upgrades installations containing an older bundled content pack.
 * Only reference-content tables are replaced; all user-owned tables remain
 * untouched.
 */
function replaceReferenceContentFromBundledDatabase(databaseDirectory: string): void {
  const contentDb = SQLite.openDatabaseSync(BUNDLED_CONTENT_DB_NAME);
  try {
    const surahCount = getTableCount(contentDb, 'surahs');
    const ayahCount = getTableCount(contentDb, 'ayahs');
    const hadithCount = getTableCount(contentDb, 'hadiths');
    const duaCount = getTableCount(contentDb, 'duas');
    const nameCount = getTableCount(contentDb, 'names_of_allah');
    if (
      surahCount !== EXPECTED_SURAH_COUNT ||
      ayahCount !== EXPECTED_AYAH_COUNT ||
      hadithCount !== EXPECTED_HADITH_COUNT ||
      duaCount !== EXPECTED_DUA_COUNT ||
      nameCount !== EXPECTED_NAME_COUNT
    ) {
      throw new Error(
        `Bundled content database is incomplete: found ${surahCount} surahs, ${ayahCount} ayahs, ` +
        `${hadithCount} hadiths, ${duaCount} duas and ${nameCount} Names`
      );
    }
  } finally {
    contentDb.closeSync();
  }

  const db = getDb();
  const sourcePath = `${databaseDirectory}/${BUNDLED_CONTENT_DB_NAME}`
    .replace(/^file:\/\//, '')
    .replace(/'/g, "''");

  db.execSync(`ATTACH DATABASE '${sourcePath}' AS bundled_content;`);
  try {
    db.withTransactionSync(() => {
      db.execSync(`
        DELETE FROM ayahs;
        DELETE FROM surahs;
        DELETE FROM hadiths;
        DELETE FROM hadith_books;
        DELETE FROM hadith_collections;
        DELETE FROM duas;
        DELETE FROM dua_categories;
        DELETE FROM names_of_allah;
        DELETE FROM content_sources;

        INSERT INTO surahs (id, name_arabic, name_translit, name_translation, ayah_count, revelation_place)
          SELECT id, name_arabic, name_translit, name_translation, ayah_count, revelation_place
          FROM bundled_content.surahs;
        INSERT INTO ayahs (surah_id, ayah_number, text_arabic, text_translation, juz)
          SELECT surah_id, ayah_number, text_arabic, text_translation, juz
          FROM bundled_content.ayahs;
        INSERT INTO content_sources (id, title, url, license, attribution)
          SELECT id, title, url, license, attribution FROM bundled_content.content_sources;
        INSERT INTO dua_categories (id, name_english, name_arabic)
          SELECT id, name_english, name_arabic FROM bundled_content.dua_categories;
        INSERT INTO duas (id, category_id, title, text_arabic, transliteration, text_translation, reference, repetitions)
          SELECT id, category_id, title, text_arabic, transliteration, text_translation, reference, repetitions
          FROM bundled_content.duas;
        INSERT INTO hadith_collections (id, name_arabic, name_english, source, license)
          SELECT id, name_arabic, name_english, source, license FROM bundled_content.hadith_collections;
        INSERT INTO hadith_books (collection_id, book_number, title)
          SELECT collection_id, book_number, title FROM bundled_content.hadith_books;
        INSERT INTO hadiths
          (id, collection_id, book_number, chapter_number, hadith_number, reference, text_arabic,
           text_translation, narrator, grade, grader, source_url, chain_indices)
          SELECT id, collection_id, book_number, chapter_number, hadith_number, reference, text_arabic,
                 text_translation, narrator, grade, grader, source_url, chain_indices
          FROM bundled_content.hadiths;
        INSERT INTO names_of_allah
          (id, name_arabic, name_translit, name_translation, explanation, evidence_json)
          SELECT id, name_arabic, name_translit, name_translation, explanation, evidence_json
          FROM bundled_content.names_of_allah;
      `);
      validateInstalledContent();
      setInstalledContentVersion();
    });
  } finally {
    db.execSync('DETACH DATABASE bundled_content;');
  }
}

function getTableCount(database: SQLite.SQLiteDatabase, table: string): number {
  return database.getFirstSync<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table};`)?.count ?? 0;
}

function validateInstalledContent(): void {
  const db = getDb();
  const surahCount = getTableCount(db, 'surahs');
  const ayahCount = getTableCount(db, 'ayahs');
  const hadithCount = getTableCount(db, 'hadiths');
  const duaCount = getTableCount(db, 'duas');
  const nameCount = getTableCount(db, 'names_of_allah');
  if (
    surahCount !== EXPECTED_SURAH_COUNT ||
    ayahCount !== EXPECTED_AYAH_COUNT ||
    hadithCount !== EXPECTED_HADITH_COUNT ||
    duaCount !== EXPECTED_DUA_COUNT ||
    nameCount !== EXPECTED_NAME_COUNT
  ) {
    throw new Error(
      `Content installation failed: found ${surahCount} surahs, ${ayahCount} ayahs, ` +
      `${hadithCount} hadiths, ${duaCount} duas and ${nameCount} Names`
    );
  }
}

function setInstalledContentVersion(): void {
  getDb().runSync(
    `INSERT INTO content_pack_state (id, version, installed_at)
     VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET version = excluded.version, installed_at = excluded.installed_at;`,
    BUNDLED_CONTENT_VERSION,
    new Date().toISOString()
  );
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
  {
    version: 2,
    statements: [
      `CREATE TABLE IF NOT EXISTS content_sources (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        license TEXT NOT NULL,
        attribution TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS dua_categories (
        id TEXT PRIMARY KEY,
        name_english TEXT NOT NULL,
        name_arabic TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS duas (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        title TEXT NOT NULL,
        text_arabic TEXT NOT NULL,
        transliteration TEXT,
        text_translation TEXT NOT NULL,
        reference TEXT NOT NULL,
        repetitions INTEGER NOT NULL DEFAULT 1 CHECK (repetitions > 0),
        FOREIGN KEY (category_id) REFERENCES dua_categories(id)
      );`,
      `CREATE INDEX IF NOT EXISTS idx_duas_category ON duas(category_id);`,
    ],
  },
  {
    version: 3,
    statements: [
      `CREATE TABLE IF NOT EXISTS hadith_collections (
        id TEXT PRIMARY KEY,
        name_arabic TEXT NOT NULL,
        name_english TEXT NOT NULL,
        source TEXT NOT NULL,
        license TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS hadiths (
        id TEXT PRIMARY KEY,
        collection_id TEXT NOT NULL,
        book_number TEXT,
        chapter_number TEXT,
        hadith_number TEXT NOT NULL,
        reference TEXT NOT NULL,
        text_arabic TEXT NOT NULL,
        text_translation TEXT NOT NULL,
        narrator TEXT,
        grade TEXT,
        grader TEXT,
        source_url TEXT NOT NULL,
        chain_indices TEXT,
        FOREIGN KEY (collection_id) REFERENCES hadith_collections(id)
      );`,
      `CREATE TABLE IF NOT EXISTS hadith_books (
        collection_id TEXT NOT NULL,
        book_number TEXT NOT NULL,
        title TEXT NOT NULL,
        PRIMARY KEY (collection_id, book_number),
        FOREIGN KEY (collection_id) REFERENCES hadith_collections(id)
      );`,
      `CREATE INDEX IF NOT EXISTS idx_hadiths_collection ON hadiths(collection_id);`,
      `CREATE INDEX IF NOT EXISTS idx_hadiths_reference ON hadiths(collection_id, hadith_number);`,
      `CREATE INDEX IF NOT EXISTS idx_hadiths_book ON hadiths(collection_id, book_number);`,
    ],
  },
  {
    version: 4,
    statements: [
      `CREATE TABLE IF NOT EXISTS names_of_allah (
        id INTEGER PRIMARY KEY CHECK (id BETWEEN 1 AND 99),
        name_arabic TEXT NOT NULL,
        name_translit TEXT NOT NULL,
        name_translation TEXT NOT NULL,
        explanation TEXT NOT NULL,
        evidence_json TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS content_pack_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        version TEXT NOT NULL,
        installed_at TEXT NOT NULL
      );`,
    ],
  },
  {
    version: 5,
    statements: [
      `DELETE FROM bookmarks
       WHERE rowid NOT IN (
         SELECT MIN(rowid) FROM bookmarks GROUP BY content_type, content_ref
       );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_content
       ON bookmarks(content_type, content_ref);`,
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
