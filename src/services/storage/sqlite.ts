import * as SQLite from 'expo-sqlite';

/**
 * Offline-first content and user-data database (§10 of the spec: Quran,
 * Hadith, Dua/Adhkar, Names, bookmarks, and Hifz progress must all be fully
 * available offline). Bulk reference content ships pre-populated in the app
 * bundle/downloaded packs; user-generated data (progress, bookmarks) is
 * written locally first and queued for sync (see useSyncQueueStore).
 */
const DB_NAME = 'mutqin.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

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
