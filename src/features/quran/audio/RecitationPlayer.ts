export const REPEAT_OPTIONS = [0, 1, 3, 5, 11, 19, 'infinite'] as const;
export type Repeat = typeof REPEAT_OPTIONS[number];
export interface RecitationSettings { start: number; end: number; repeat: Repeat }
export interface PlaybackStatus { playing: boolean; position: number; duration: number; ended?: boolean; error?: string }
export interface RecitationSound {
  play(): Promise<unknown>;
  pause(): Promise<unknown>;
  unload(): Promise<unknown>;
}
export type SoundLoader = (ayah: number, update: (status: PlaybackStatus) => void) => Promise<RecitationSound>;
export interface PlayerState {
  settings: RecitationSettings | null;
  ayah: number;
  cycle: number;
  playing: boolean;
  loading: boolean;
  finished: boolean;
  position: number;
  duration: number;
  error: string | null;
}
const initialState: PlayerState = { settings: null, ayah: 1, cycle: 0, playing: false, loading: false, finished: false, position: 0, duration: 0, error: null };

/** Each ayah occupies one share of the passage; interpolate within that share.
 * This does not require downloading every ayah to discover its audio duration.
 */
export function cycleProgress(state: PlayerState): number {
  if (!state.settings) return 0;
  if (state.finished) return 1;
  const count = state.settings.end - state.settings.start + 1;
  if (count <= 0) return 0;
  const withinAyah = state.duration > 0 ? Math.min(1, Math.max(0, state.position / state.duration)) : 0;
  return Math.min(1, Math.max(0, (state.ayah - state.settings.start + withinAyah) / count));
}

export function validSettings(settings: RecitationSettings, count: number): boolean {
  return Number.isInteger(settings.start) && Number.isInteger(settings.end)
    && settings.start >= 1 && settings.start <= settings.end && settings.end <= count
    && REPEAT_OPTIONS.includes(settings.repeat);
}

/** One sound at a time. Generation tokens prevent stale loads/events restarting audio. */
export class RecitationPlayer {
  state = { ...initialState };
  private sound: RecitationSound | null = null;
  private generation = 0;
  constructor(private count: number, private load: SoundLoader, private change: (state: PlayerState) => void) {}
  private update(patch: Partial<PlayerState>) {
    this.state = { ...this.state, ...patch };
    this.change(this.state);
  }
  stop() {
    this.generation++;
    const previous = this.sound;
    this.sound = null;
    this.update({ ...initialState });
    if (previous) void previous.unload().catch(() => {});
  }
  start(settings: RecitationSettings) {
    if (!validSettings(settings, this.count)) return;
    this.update({ settings: { ...settings }, cycle: 0 });
    void this.go(settings.start);
  }
  private async go(ayah: number) {
    const request = ++this.generation;
    const previous = this.sound;
    this.sound = null;
    this.update({ ayah, loading: true, playing: false, finished: false, position: 0, duration: 0, error: null });
    let ended = false;
    try {
      if (previous) await previous.unload().catch(() => {});
      if (request !== this.generation) return;
      const sound = await this.load(ayah, (status) => {
        if (request !== this.generation || ended) return;
        if (status.error) {
          ended = true;
          this.update({ error: 'Unable to play audio. Check your connection, then press Play to retry.', playing: false, loading: false });
          return;
        }
        this.update({ playing: status.playing, position: status.position, duration: status.duration });
        if (status.ended) {
          ended = true;
          const settings = this.state.settings;
          if (!settings) return;
          if (ayah < settings.end) void this.go(ayah + 1);
          else if (settings.repeat === 'infinite' || this.state.cycle < settings.repeat) {
            this.update({ cycle: this.state.cycle + 1 });
            void this.go(settings.start);
          } else this.update({ playing: false, finished: true });
        }
      });
      if (request !== this.generation) { await sound.unload().catch(() => {}); return; }
      this.sound = sound;
      await sound.play();
      if (request === this.generation && !ended) this.update({ loading: false, playing: true });
    } catch {
      if (request === this.generation) this.update({ loading: false, playing: false, error: 'Unable to play audio. Check your connection, then press Play to retry.' });
    }
  }
  async toggle() {
    if (!this.state.settings || this.state.loading) return;
    if (this.state.finished) { this.restart(); return; }
    if (this.state.error || !this.sound) { void this.go(this.state.ayah); return; }
    const request = this.generation;
    const wasPlaying = this.state.playing;
    try {
      if (wasPlaying) await this.sound.pause();
      else await this.sound.play();
      if (request === this.generation) this.update({ playing: !wasPlaying });
    } catch {
      if (request === this.generation) this.update({ playing: false, error: 'Playback interrupted. Press Play to retry.' });
    }
  }
  previous() {
    if (this.state.settings && this.state.ayah > this.state.settings.start) void this.go(this.state.ayah - 1);
  }
  next() {
    if (this.state.settings && this.state.ayah < this.state.settings.end) void this.go(this.state.ayah + 1);
  }
  restart() {
    if (!this.state.settings) return;
    this.update({ cycle: 0 });
    void this.go(this.state.settings.start);
  }
}
