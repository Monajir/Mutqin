import fs from 'node:fs/promises';
import { Presentation, PresentationFile } from '@oai/artifact-tool';
import { buildSlide01 } from './grid/slide-01.mjs';
import { buildSlide05 } from './grid/slide-05.mjs';
import { buildSlide07 } from './grid/slide-07.mjs';
import { buildSlide10 } from './grid/slide-10.mjs';
import { buildSlide13 } from './grid/slide-13.mjs';
import { buildSlide17 } from './grid/slide-17.mjs';
import { buildSlide18 } from './grid/slide-18.mjs';
import { buildSlide19 } from './grid/slide-19.mjs';
import { buildSlide26 } from './grid/slide-26.mjs';

const outputDir = 'D:/Learning Programming/MAD/mutqin-frontend-scaffold/mutqin/.tmp/progress-deck/rendered';
const finalPath = 'D:/Learning Programming/MAD/mutqin-frontend-scaffold/mutqin/Mutqin_Project_Progress_Presentation.pptx';

function addNotes(slide, talkTrack, sources) {
  slide.speakerNotes.textFrame.setText(
    `${talkTrack}\n\n[Sources]\n${sources.map((source) => `- ${source}`).join('\n')}\n[/Sources]`
  );
}

function textBlock(title, body) {
  return { titleHere: title, loremIpsumDolorSitAmetConsecteturAdipiscing: body };
}

function pointBlock(title, body) {
  return { titleGoesHere: title, loremIpsumDolorSitAmetConsecteturAdipiscing: body };
}

async function writeBlob(path, blob) {
  await fs.writeFile(path, new Uint8Array(await blob.arrayBuffer()));
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });

  let slide = buildSlide01(presentation, {
    title: 'MUTQIN • PROGRESS REVIEW',
    title2: 'Mutqin\nProject Progress',
    title3: 'Offline-first Islamic learning app\nCurrent condition • 5 August 2026',
  });
  addNotes(
    slide,
    'Open by positioning Mutqin as a working mobile foundation rather than a finished production service. The purpose of this review is to show what can already be demonstrated and what must be completed next.',
    ['Local Mutqin repository', 'Current workspace date: 2026-08-05']
  );

  slide = buildSlide05(presentation, {
    title: 'Mutqin is now a usable offline mobile application',
    body1: textBlock(
      'Working today',
      '• Android development build\n• Modern tab-based interface\n• Offline Quran and library\n• Local bookmarks and progress\n• Live prayer countdown'
    ),
    body2: textBlock(
      'Not production-complete',
      '• AI service not deployed\n• Authentication and cloud sync pending\n• Recitation audio host unresolved\n• Notification scheduling incomplete\n• Release QA still required'
    ),
    footer1: '2',
  });
  addNotes(
    slide,
    'The key message is that the project has crossed the scaffold stage. Core content and navigation work on-device, while server-dependent and release-hardening work remains.',
    ['app/ routes', 'src/features/', 'app.config.js', 'src/services/api/client.ts']
  );

  slide = buildSlide07(presentation, {
    title: 'Core learning and worship flows are functional',
    body1: 'QURAN\n\nFull surah list, three reading modes, Uthmani font, daily verse, last-read tracking and verse bookmarks.',
    body2: 'ISLAMIC LIBRARY\n\nHadith collections, dua categories, Names of Allah, offline search and unified bookmarks.',
    body3: 'DAILY PRACTICE\n\nPrayer countdown, Qibla, Hifz tracking, daily content, onboarding and preferences.',
    footer1: '3',
  });
  addNotes(
    slide,
    'Walk through the app as three connected experiences: reading, reference content, and daily practice. Avoid presenting the AI evaluation as production-ready on this slide.',
    ['src/features/quran/', 'src/features/library/', 'src/features/bookmarks/', 'src/features/prayer/', 'src/features/home/']
  );

  slide = buildSlide19(presentation, {
    title: 'The offline library has moved beyond demo data',
    body1: {
      topic: 'BUNDLED CONTENT',
      loremIpsumDolorSitAmetConsecteturAdipiscing: 'The app installs a validated SQLite content pack and upgrades existing installations without replacing user-owned bookmarks or Hifz progress.',
    },
    stat1: '6,236',
    stat2: '33,511',
    stat3: '99 + 70',
    body2: 'Ayahs across all 114 surahs',
    body3: 'Hadiths across six collections',
    body4: 'Names of Allah + verified duas',
    footer1: '4',
  });
  addNotes(
    slide,
    'These figures come directly from the bundled database, not estimated progress percentages. The content pack is currently about 55 MB and passed SQLite integrity checks.',
    ['assets/db/quran-content.db', 'src/services/storage/sqlite.ts']
  );

  slide = buildSlide17(presentation, {
    title: 'The architecture keeps content local and AI replaceable',
    label1: 'DEVICE',
    label2: 'LOCAL DATA',
    label3: 'SERVICES',
    body1: textBlock('Expo client', 'Navigation, reading, recording and responsive UI.'),
    body2: textBlock('SQLite + MMKV', 'Content, bookmarks, preferences and Hifz progress.'),
    body3: textBlock('API boundary', 'Backend and AI providers can evolve without rewriting features.'),
    footer1: '5',
  });
  addNotes(
    slide,
    'Explain that offline reference content is the source of truth on the device, while server-dependent functions are isolated behind service interfaces. This reduces the cost of changing the eventual AI provider.',
    ['src/services/storage/', 'src/services/ai/hifzEvaluationProvider.ts', 'src/config/di.ts', 'src/lib/queryClient.ts']
  );

  slide = buildSlide05(presentation, {
    title: 'Hifz is a complete workflow—but not yet a trusted AI feature',
    body1: textBlock(
      'Already implemented',
      '• Session setup and audio recording\n• Evaluation provider contract\n• Word-level result model\n• Summary and revision status\n• Python scoring service prototype'
    ),
    body2: textBlock(
      'Required before beta',
      '• Valid start/end ayah ranges\n• Remove non-spoken Quran marks\n• Real-audio accuracy benchmark\n• Secure deployment and rate limits\n• User approval before saving progress'
    ),
    footer1: '6',
  });
  addNotes(
    slide,
    'The mobile workflow and server contract exist, but the AI service should still be treated as a prototype. Real inference requires a backend; the full general backend does not need to be finished first.',
    ['src/features/hifz/', 'src/services/ai/', 'mutqin-ai-service/app/', 'mutqin-ai-service/README.md']
  );

  slide = buildSlide10(presentation, {
    title: 'The current baseline is stable enough for controlled integration',
    body1: 'VALIDATED LOCALLY\n\nCode, content and the scoring prototype pass the available structural checks.',
    body2: {
      loremIpsumDolorSitAmetConsecteturAdipiscing: '',
      loremIpsumDolorSitAmetConsecteturAdipiscing2: '',
    },
    label1: 'TypeScript compilation passed',
    label2: 'SQLite integrity check passed',
    label3: '114 surahs / 6,236 ayahs verified',
    label4: 'Hadith, dua and Names counts verified',
    label5: '2 standalone AI scoring tests passed',
    footer1: '7',
  });
  addNotes(
    slide,
    'Be precise about the evidence. The app has a sound structural baseline, but this is not the same as a complete device test matrix or a validated recitation model.',
    ['npm run typecheck output, 2026-08-05', 'SQLite PRAGMA integrity_check output, 2026-08-05', 'mutqin-ai-service/tests/test_scoring.py', 'mutqin-ai-service/tests/test_session.py']
  );

  slide = buildSlide13(presentation, {
    title: 'Four gaps separate the prototype from a release candidate',
    body1: pointBlock('Backend', 'Authentication, sync and production AI hosting.'),
    body2: pointBlock('AI validation', 'Real-recitation benchmarks and failure handling.'),
    body3: pointBlock('Media', 'Reliable recitation audio and notifications.'),
    body4: pointBlock('Release quality', 'Mobile tests, accessibility and translations.'),
    footer1: '8',
  });
  addNotes(
    slide,
    'Frame these as concentrated workstreams rather than a rewrite. The offline content foundation is already in place; remaining risk is primarily service integration and release quality.',
    ['src/services/api/', 'src/services/ai/', 'src/features/settings/screens/NotificationsSettingsScreen.tsx', '.eslintrc.js', 'package.json']
  );

  slide = buildSlide18(presentation, {
    title: 'The next phase should convert the Hifz prototype into a trusted beta',
    body1: textBlock('Stabilize', 'Limit session ranges, correct recording states and harden scoring against Quranic marks.'),
    body2: textBlock('Integrate', 'Run the real model locally, connect a device and test representative recordings end to end.'),
    body3: textBlock('Release beta', 'Deploy behind HTTPS with authentication, rate limits, monitoring and a controlled feature flag.'),
    label1: 'NOW',
    label2: 'NEXT',
    label3: 'THEN',
    footer1: '9',
  });
  addNotes(
    slide,
    'The recommended sequence avoids building the entire cloud backend before learning whether the recitation model is accurate enough. First correct the contract and user flow, then validate locally, then deploy securely.',
    ['Current repository dependency analysis', 'mutqin-ai-service/Dockerfile', 'src/config/featureFlags.ts']
  );

  slide = buildSlide26(presentation, {
    title: 'RECOMMENDATION',
    title2: 'Proceed with a\ncontrolled Hifz beta',
    title3: {
      loremIpsumDetails: 'Harden the AI service',
      loremIpsumDetails2: 'Integrate real recordings',
      loremIpsumDetails3: 'Expand after accuracy review',
    },
  });
  addNotes(
    slide,
    'Close on the decision: preserve the working offline app, focus the next milestone on a safe Hifz beta, and avoid presenting pronunciation confidence as authoritative tajweed analysis.',
    ['Synthesis of slides 2–9; local repository evidence only']
  );

  for (const [index, currentSlide] of presentation.slides.items.entries()) {
    const png = await presentation.export({ slide: currentSlide, format: 'png', scale: 1 });
    await writeBlob(`${outputDir}/slide-${String(index + 1).padStart(2, '0')}.png`, png);
    const layout = await currentSlide.export({ format: 'layout' });
    await fs.writeFile(`${outputDir}/slide-${String(index + 1).padStart(2, '0')}.layout.json`, await layout.text());
  }

  const montage = await presentation.export({ format: 'webp', montage: true, scale: 1 });
  await writeBlob(`${outputDir}/montage.webp`, montage);

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(finalPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
