import { getDb } from '@/services/storage/sqlite';
import type { HifzStatus } from '@/constants';
import type { HifzOverallStats, HifzProgressEntry, JuzProgressSummary, RevisionQueueItem } from '../types/hifz.types';
import { isDueForRevision } from '../utils/scoreRecitation';

interface HifzProgressRow {
  surah_id: number;
  ayah_number: number;
  status: HifzStatus;
  last_reviewed_at: string | null;
  updated_at: string;
  source: 'manual' | 'ai_session';
}

function rowToEntry(row: HifzProgressRow): HifzProgressEntry {
  return {
    surahId: row.surah_id,
    ayahNumber: row.ayah_number,
    status: row.status,
    lastReviewedAt: row.last_reviewed_at,
    updatedAt: row.updated_at,
    source: row.source,
  };
}

/**
 * Local-first data access for Hifz progress. All reads/writes hit SQLite
 * directly and are the source of truth offline; a background sync worker
 * (see useSyncQueueStore + services/api) reconciles with the server when
 * connectivity is available. Feature hooks/screens must go through this
 * repository rather than querying `getDb()` directly.
 */
export const hifzRepository = {
  getAllProgress(): HifzProgressEntry[] {
    const rows = getDb().getAllSync<HifzProgressRow>('SELECT * FROM hifz_progress;');
    return rows.map(rowToEntry);
  },

  upsertStatus(surahId: number, ayahNumber: number, status: HifzStatus, source: 'manual' | 'ai_session'): void {
    const now = new Date().toISOString();
    getDb().runSync(
      `INSERT INTO hifz_progress (surah_id, ayah_number, status, last_reviewed_at, updated_at, source, synced)
       VALUES (?, ?, ?, ?, ?, ?, 0)
       ON CONFLICT(surah_id, ayah_number) DO UPDATE SET
         status = excluded.status,
         last_reviewed_at = excluded.last_reviewed_at,
         updated_at = excluded.updated_at,
         source = excluded.source,
         synced = 0;`,
      surahId, ayahNumber, status, now, now, source
    );
  },

  getJuzSummary(totalAyahsPerJuz: Record<number, number>): JuzProgressSummary[] {
    const rows = getDb().getAllSync<{ juz: number; memorized: number }>(
      `SELECT a.juz as juz, COUNT(*) as memorized
       FROM hifz_progress hp
       JOIN ayahs a ON a.surah_id = hp.surah_id AND a.ayah_number = hp.ayah_number
       WHERE hp.status IN ('memorized', 'strong')
       GROUP BY a.juz;`
    );
    const byJuz = new Map(rows.map((r) => [r.juz, r.memorized]));

    return Object.entries(totalAyahsPerJuz).map(([juzStr, total]) => {
      const juz = Number(juzStr);
      const memorized = byJuz.get(juz) ?? 0;
      return { juz, totalAyahs: total, memorizedAyahs: memorized, percentComplete: total > 0 ? memorized / total : 0 };
    });
  },

  getOverallStats(): HifzOverallStats {
    const all = this.getAllProgress();
    const totalMemorized = all.filter((e) => e.status === 'memorized' || e.status === 'strong').length;
    const strongAyahCount = all.filter((e) => e.status === 'strong').length;
    const weakAyahCount = all.filter((e) => e.status === 'weak').length;
    const dueForRevisionCount = all.filter((e) => isDueForRevision(e.status, e.lastReviewedAt)).length;
    const QURAN_TOTAL_AYAHS = 6236;

    return {
      overallPercentComplete: totalMemorized / QURAN_TOTAL_AYAHS,
      strongAyahCount,
      weakAyahCount,
      totalMemorized,
      dueForRevisionCount,
    };
  },

  getRevisionQueue(): RevisionQueueItem[] {
    return this.getAllProgress()
      .filter((e) => isDueForRevision(e.status, e.lastReviewedAt))
      .map((e) => ({
        ayah: { surahId: e.surahId, ayahNumber: e.ayahNumber },
        status: e.status,
        daysSinceReview: e.lastReviewedAt
          ? Math.floor((Date.now() - new Date(e.lastReviewedAt).getTime()) / (1000 * 60 * 60 * 24))
          : null,
      }));
  },

  saveSession(session: { id: string; surahId: number; startAyah: number; endAyah: number | null; overallAccuracy: number | null }): void {
    getDb().runSync(
      `INSERT INTO hifz_sessions (id, surah_id, start_ayah, end_ayah, overall_accuracy, created_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, 0);`,
      session.id, session.surahId, session.startAyah, session.endAyah, session.overallAccuracy, new Date().toISOString()
    );
  },
};
