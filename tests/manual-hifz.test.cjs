// Run with Node 22+: node --test tests/manual-hifz.test.cjs
// Executes the production repository against an in-memory SQLite database.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE hifz_progress (
    surah_id INTEGER, ayah_number INTEGER, status TEXT, last_reviewed_at TEXT,
    updated_at TEXT, source TEXT, synced INTEGER,
    PRIMARY KEY(surah_id, ayah_number));
    CREATE TABLE ayahs (surah_id INTEGER, ayah_number INTEGER, juz INTEGER);`);
  const api = {
    getAllSync: (sql, ...args) => db.prepare(sql).all(...args),
    runSync: (sql, ...args) => db.prepare(sql).run(...args),
  };
  const source = readFileSync(path.join(__dirname, '../src/features/hifz/api/hifzRepository.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (name) => {
    if (name === '@/services/storage/sqlite') return { getDb: () => api };
    if (name === '../utils/scoreRecitation') return { isDueForRevision: () => false };
    throw new Error('Unexpected import: ' + name);
  } });
  return { db, repository: exports.hifzRepository };
}

test('manual marks persist, are idempotent, and can be undone', () => {
  const { db, repository } = fixture();
  try {
    assert.equal(repository.getOverallStats().totalMemorized, 0);
    repository.upsertStatus(1, 1, 'memorized', 'manual');
    repository.upsertStatus(1, 1, 'memorized', 'manual');
    assert.equal(repository.getOverallStats().totalMemorized, 1);
    assert.equal(repository.getOverallStats().overallPercentComplete, 1 / 6236);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM hifz_progress').get().n, 1);
    repository.upsertStatus(1, 1, 'not_started', 'manual');
    assert.equal(repository.getOverallStats().totalMemorized, 0);
  } finally { db.close(); }
});

test('legacy AI records are preserved but excluded from manual statistics', () => {
  const { db, repository } = fixture();
  try {
    repository.upsertStatus(1, 1, 'strong', 'ai_session');
    repository.upsertStatus(1, 2, 'memorized', 'manual');
    db.exec('INSERT INTO ayahs VALUES (1, 1, 1), (1, 2, 1)');
    assert.equal(repository.getAllProgress().length, 1);
    assert.equal(repository.getOverallStats().totalMemorized, 1);
    assert.equal(repository.getJuzSummary({ 1: 148 })[0].memorizedAyahs, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM hifz_progress').get().n, 2);
    repository.upsertStatus(1, 1, 'memorized', 'manual');
    assert.equal(repository.getOverallStats().totalMemorized, 2);
  } finally { db.close(); }
});
