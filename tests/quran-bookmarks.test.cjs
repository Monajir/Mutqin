// Run with Node 22+: node --test tests/quran-bookmarks.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

test('Quran bookmark toggles persist and remain separate from other content', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE bookmarks (id TEXT PRIMARY KEY, content_type TEXT,
    content_ref TEXT, collection_id TEXT, note TEXT, created_at TEXT, synced INTEGER)`);
  const api = {
    getAllSync: (sql, ...args) => db.prepare(sql).all(...args),
    getFirstSync: (sql, ...args) => db.prepare(sql).get(...args),
    runSync: (sql, ...args) => db.prepare(sql).run(...args),
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(path.join(__dirname,
    '../src/features/bookmarks/api/bookmarkRepository.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, require: (name) => {
    assert.equal(name, '@/services/storage/sqlite');
    return { getDb: () => api };
  } });
  const repo = exports.bookmarkRepository;
  const input = { contentType: 'quran', contentRef: '1:2' };
  try {
    assert.equal(repo.toggleBookmark(input).added, true);
    assert.equal(repo.getBookmarkRefs('quran')[0], '1:2');
    repo.toggleBookmark({ contentType: 'dua', contentRef: '1:2' });
    assert.equal(repo.toggleBookmark(input).added, false);
    assert.equal(repo.getBookmarkRefs('quran').length, 0);
    assert.equal(repo.getBookmarkRefs('dua').length, 1);
    assert.equal(repo.toggleBookmark(input).added, true);
    assert.equal(repo.getBookmarkRefs('quran').length, 1);
  } finally { db.close(); }
});
