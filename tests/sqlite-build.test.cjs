const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { prepareSqliteBuild } = require('../scripts/prepare-sqlite-build.cjs');

const archive = 'sqlite-amalgamation-3450300.zip';
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mutqin-sqlite-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, 'vendor', 'sqlite', archive);
  const gradle = path.join(root, 'node_modules', 'expo-sqlite', 'android', 'build.gradle');
  fs.mkdirSync(path.dirname(source), { recursive: true });
  fs.mkdirSync(path.dirname(gradle), { recursive: true });
  fs.copyFileSync(path.join(__dirname, '..', 'vendor', 'sqlite', archive), source);
  fs.copyFileSync(path.join(__dirname, '..', 'node_modules', 'expo-sqlite', 'android', 'build.gradle'), gradle);
  return { root, source, gradle };
}

test('SQLite hook seeds, preserves, and repairs the native download cache', (t) => {
  const { root, source } = fixture(t);
  const output = prepareSqliteBuild(root, { EAS_BUILD_PLATFORM: 'android' });
  assert.deepEqual(fs.readFileSync(output), fs.readFileSync(source));
  fs.utimesSync(output, 1000, 1000);
  prepareSqliteBuild(root, {});
  assert.equal(fs.statSync(output).mtimeMs, 1000000);
  fs.writeFileSync(output, 'partial failed download');
  prepareSqliteBuild(root, {});
  assert.deepEqual(fs.readFileSync(output), fs.readFileSync(source));
});

test('SQLite hook rejects damaged vendor files and changed engine versions', (t) => {
  const { root, source, gradle } = fixture(t);
  fs.appendFileSync(source, 'corrupt');
  assert.throws(() => prepareSqliteBuild(root, {}), /SHA-256/);
  fs.writeFileSync(gradle, "def SQLITE_VERSION = '9999999'\noverwrite(false)");
  assert.throws(() => prepareSqliteBuild(root, {}), /configuration changed/);
});

test('SQLite hook honors an absolute download override and skips iOS', (t) => {
  const { root } = fixture(t);
  const directory = path.join(root, 'custom-downloads');
  assert.equal(prepareSqliteBuild(root, { REACT_NATIVE_DOWNLOADS_DIR: directory }), path.join(directory, archive));
  assert.throws(() => prepareSqliteBuild(root, { REACT_NATIVE_DOWNLOADS_DIR: 'relative' }), /must be absolute/);
  assert.equal(prepareSqliteBuild('/nonexistent', { EAS_BUILD_PLATFORM: 'ios' }), null);
});
