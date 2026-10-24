/** Seed expo-sqlite's native source cache without a network request. */
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const SQLITE_VERSION = '3450300';
const ARCHIVE = `sqlite-amalgamation-${SQLITE_VERSION}.zip`;
const SHA256 = 'ea170e73e447703e8359308ca2e4366a3ae0c4304a8665896f068c736781c651';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

function prepareSqliteBuild(root, env = process.env) {
  if (env.EAS_BUILD_PLATFORM && env.EAS_BUILD_PLATFORM !== 'android') return null;

  const moduleDir = path.join(root, 'node_modules', 'expo-sqlite', 'android');
  const gradle = fs.readFileSync(path.join(moduleDir, 'build.gradle'), 'utf8');
  const version = gradle.match(/def SQLITE_VERSION\s*=\s*['"](\d+)['"]/)?.[1];
  // Fail explicitly on dependency changes instead of supplying the wrong
  // engine or silently reverting to the unreliable network download.
  if (version !== SQLITE_VERSION || !/overwrite\(false\)/.test(gradle)) {
    throw new Error('expo-sqlite download configuration changed; update the vendored SQLite archive/hook.');
  }
  const bytes = fs.readFileSync(path.join(root, 'vendor', 'sqlite', ARCHIVE));
  if (hash(bytes) !== SHA256) throw new Error('Vendored SQLite archive failed SHA-256 verification.');

  const override = env.REACT_NATIVE_DOWNLOADS_DIR;
  if (override && !path.isAbsolute(override)) {
    throw new Error('REACT_NATIVE_DOWNLOADS_DIR must be absolute for the SQLite build hook.');
  }
  const directory = override || path.join(moduleDir, 'build', 'downloads');
  const destination = path.join(directory, ARCHIVE);
  fs.mkdirSync(directory, { recursive: true });
  if (!fs.existsSync(destination) || hash(fs.readFileSync(destination)) !== SHA256) {
    const temporary = `${destination}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, bytes);
    fs.renameSync(temporary, destination);
  }
  console.log(`[SQLite build] Verified SQLite 3.45.3 source archive in ${destination}`);
  return destination;
}

if (require.main === module) {
  try {
    prepareSqliteBuild(path.resolve(__dirname, '..'));
  } catch (error) {
    console.error(`[SQLite build] ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { prepareSqliteBuild };
