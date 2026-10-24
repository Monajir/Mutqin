const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(relativePath, dependencies = {}) {
  const source = readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, FormData: class { append() {} }, require: (name) => {
    if (name in dependencies) return dependencies[name];
    throw new Error('Unexpected import: ' + name);
  } });
  return exports;
}

const { ApiError } = load('src/services/api/errors.ts');
const types = load('src/services/ai/types.ts');
function provider(apiRequest) {
  const { MutqinApiHifzEvaluationProvider } = load('src/services/ai/providers/mutqinApiProvider.ts', {
    '../types': types,
    '@/services/api/client': { apiRequest },
    '@/services/api/endpoints': { endpoints: { hifz: { evaluate: '/hifz/evaluate' } } },
    '@/services/api/errors': { ApiError },
  });
  return new MutqinApiHifzEvaluationProvider();
}
const input = { audioUri: 'recording.m4a', expectedAyahs: [{ surahId: 1, ayahNumber: 1 }] };

test('no-speech response reaches the session as a retry message, not a result', async () => {
  const apiError = ApiError.fromResponse(422, { code: 'no_speech', detail: 'No speech detected. Please record again.' });
  assert.equal(apiError.responseCode, 'no_speech');
  await assert.rejects(provider(async () => { throw apiError; }).evaluateRecitation(input), error => {
    assert.ok(error instanceof types.RecitationEvaluationError);
    assert.equal(error.reason, 'no_speech');
    assert.equal(error.message, 'No speech detected. Please record again.');
    return true;
  });
});

test('invalid audio and service errors remain separate from no speech', async () => {
  for (const [status, body, reason] of [
    [422, { detail: 'Invalid audio' }, 'validation_error'],
    [503, { code: 'no_speech', detail: 'Unavailable' }, 'service_unavailable'],
  ]) {
    await assert.rejects(provider(async () => { throw ApiError.fromResponse(status, body); }).evaluateRecitation(input),
      error => error.reason === reason);
  }
});

test('successful recitation results pass through unchanged', async () => {
  const result = { ayahs: [], correctWordCount: 4, overallAccuracy: 1 };
  assert.equal(await provider(async () => ({ result })).evaluateRecitation(input), result);
});
