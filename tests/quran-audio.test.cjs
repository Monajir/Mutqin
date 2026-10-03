// Run with: node --test tests/quran-audio.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const exportsForTest = {};
vm.runInNewContext(ts.transpileModule(readFileSync(path.join(__dirname,
  '../src/features/quran/audio/RecitationPlayer.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: exportsForTest });
const { RecitationPlayer, validSettings, cycleProgress } = exportsForTest;
const flush = () => new Promise(resolve => setImmediate(resolve));

test('passage progress continues across ayahs and resets for the next cycle', async () => {
  const { player, loads, finish } = fixture();
  player.start({ start: 2, end: 3, repeat: 1 });
  await flush();
  assert.equal(cycleProgress(player.state), 0);
  loads.at(-1).update({ playing: true, position: 5, duration: 10 });
  assert.equal(cycleProgress(player.state), 0.25);
  await finish();
  assert.equal(cycleProgress(player.state), 0.5);
  loads.at(-1).update({ playing: true, position: 15, duration: 30 });
  assert.equal(cycleProgress(player.state), 0.75);
  await finish();
  assert.equal(player.state.cycle, 1);
  assert.equal(cycleProgress(player.state), 0);
  await finish(); await finish();
  assert.equal(cycleProgress(player.state), 1);
  player.restart(); await flush();
  assert.equal(cycleProgress(player.state), 0);
  player.stop();
  assert.equal(cycleProgress(player.state), 0);
});

test('single-ayah progress and navigation reflect the selected passage position', async () => {
  const { player, loads } = fixture();
  player.start({ start: 7, end: 7, repeat: 0 }); await flush();
  loads.at(-1).update({ playing: true, position: 5, duration: 10 });
  assert.equal(cycleProgress(player.state), 0.5);
  player.start({ start: 2, end: 5, repeat: 0 }); await flush();
  player.next(); await flush();
  assert.equal(cycleProgress(player.state), 0.25);
  player.previous(); await flush();
  assert.equal(cycleProgress(player.state), 0);
  player.stop();
});

function fixture() {
  const loads = [];
  const player = new RecitationPlayer(7, async (ayah, update) => {
    const entry = { ayah, update, plays: 0, pauses: 0, unloaded: false };
    loads.push(entry);
    return {
      play: async () => { entry.plays++; },
      pause: async () => { entry.pauses++; },
      unload: async () => { entry.unloaded = true; },
    };
  }, () => {});
  const finish = async () => {
    loads.at(-1).update({ playing: false, position: 10, duration: 10, ended: true });
    await flush();
  };
  return { player, loads, finish };
}

test('range validation rejects invalid, reversed and fractional ayahs', () => {
  for (const [start, end] of [[0, 3], [4, 2], [1, 8], [1.5, 3], [NaN, 3]]) {
    assert.equal(validSettings({ start, end, repeat: 0 }, 7), false);
  }
  assert.equal(validSettings({ start: 7, end: 7, repeat: 'infinite' }, 7), true);
});

test('None plays only the selected range once and finishes', async () => {
  const { player, loads, finish } = fixture();
  player.start({ start: 2, end: 3, repeat: 0 });
  await flush();
  await finish(); await finish();
  assert.deepEqual(loads.map(x => x.ayah), [2, 3]);
  assert.equal(player.state.finished, true);
  assert.equal(player.state.playing, false);
  await player.toggle(); await flush();
  assert.equal(loads.at(-1).ayah, 2);
  player.stop();
});

test('finite repeats replay the whole range the exact requested number of times', async () => {
  for (const repeat of [1, 3, 5, 11, 19]) {
    const { player, loads, finish } = fixture();
    player.start({ start: 2, end: 3, repeat });
    await flush();
    for (let i = 0; i < 2 * (repeat + 1); i++) await finish();
    assert.equal(loads.length, 2 * (repeat + 1));
    assert.equal(player.state.finished, true);
    assert.deepEqual(loads.map(x => x.ayah), Array.from({ length: repeat + 1 }, () => [2, 3]).flat());
    player.stop();
  }
});

test('infinite loops stop, and stale completion callbacks cannot restart them', async () => {
  const { player, loads, finish } = fixture();
  player.start({ start: 7, end: 7, repeat: 'infinite' });
  await flush();
  for (let i = 0; i < 6; i++) await finish();
  assert.equal(loads.length, 7);
  player.stop();
  await finish();
  assert.equal(loads.length, 7);
  assert.equal(player.state.settings, null);
});

test('pause/resume, previous/next boundaries, restart and replacing settings', async () => {
  const { player, loads } = fixture();
  player.start({ start: 2, end: 4, repeat: 1 });
  await flush();
  await player.toggle();
  assert.equal(loads[0].pauses, 1);
  await player.toggle();
  assert.equal(loads[0].plays, 2);
  player.previous(); await flush();
  assert.equal(loads.length, 1);
  player.next(); await flush();
  player.next(); await flush();
  player.next(); await flush();
  assert.equal(loads.length, 3);
  player.previous(); await flush();
  assert.equal(player.state.ayah, 3);
  player.restart(); await flush();
  assert.equal(player.state.ayah, 2);
  player.start({ start: 6, end: 7, repeat: 0 }); await flush();
  assert.equal(player.state.ayah, 6);
  assert.equal(loads.at(-2).unloaded, true);
  player.stop();
});

test('stop during a pending download unloads it without playing', async () => {
  let resolve;
  let plays = 0;
  let unloaded = false;
  const player = new RecitationPlayer(7, () => new Promise(r => { resolve = r; }), () => {});
  player.start({ start: 1, end: 1, repeat: 0 });
  player.stop();
  resolve({ play: async () => { plays++; }, pause: async () => {}, unload: async () => { unloaded = true; } });
  await flush();
  assert.equal(plays, 0);
  assert.equal(unloaded, true);
});

test('download failure can be retried without skipping an ayah', async () => {
  let attempt = 0;
  const player = new RecitationPlayer(7, async () => {
    if (attempt++ === 0) throw new Error('offline');
    return { play: async () => {}, pause: async () => {}, unload: async () => {} };
  }, () => {});
  player.start({ start: 3, end: 5, repeat: 0 }); await flush();
  assert.ok(player.state.error);
  await player.toggle(); await flush();
  assert.equal(player.state.error, null);
  assert.equal(player.state.ayah, 3);
  assert.equal(player.state.playing, true);
  player.stop();
});
