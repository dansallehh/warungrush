export interface GameLoopCallbacks {
  onUpdate: (dt: number) => void;
  onRender: () => void;
  onAutoPause?: () => void;
  onAutoResume?: () => void;
}

const MAX_DT_SECONDS = 0.05;

export class GameLoop {
  private readonly callbacks: GameLoopCallbacks;
  private rafId: number | null = null;
  private lastTimestamp: number | null = null;
  private running = false;
  private paused = false;
  private pausedByVisibility = false;

  constructor(callbacks: GameLoopCallbacks) {
    this.callbacks = callbacks;
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.paused = document.hidden;
    this.pausedByVisibility = document.hidden;
    this.lastTimestamp = null;

    if (!this.paused) {
      this.rafId = window.requestAnimationFrame(this.tick);
    }
  }

  public stop(): void {
    this.running = false;
    this.paused = false;
    this.pausedByVisibility = false;
    this.lastTimestamp = null;
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public pause(): void {
    if (!this.running || this.paused) return;
    this.paused = true;
    this.lastTimestamp = null;
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public resume(): void {
    if (!this.running || !this.paused || document.hidden) return;
    this.paused = false;
    this.pausedByVisibility = false;
    this.lastTimestamp = null;
    this.rafId = window.requestAnimationFrame(this.tick);
  }

  public isRunning(): boolean {
    return this.running;
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public destroy(): void {
    this.stop();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private readonly tick = (timestamp: number): void => {
    if (!this.running || this.paused) return;

    if (this.lastTimestamp === null) {
      this.lastTimestamp = timestamp;
    }

    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    const dt = Math.min(Math.max(rawDt, 0), MAX_DT_SECONDS);

    this.callbacks.onUpdate(dt);
    this.callbacks.onRender();

    if (this.running && !this.paused) {
      this.rafId = window.requestAnimationFrame(this.tick);
    }
  };

  private readonly handleVisibilityChange = (): void => {
    if (!this.running) return;

    if (document.hidden) {
      if (!this.paused) {
        this.pausedByVisibility = true;
        this.pause();
        this.callbacks.onAutoPause?.();
      }
    } else if (this.pausedByVisibility) {
      this.pausedByVisibility = false;
      this.resume();
      this.callbacks.onAutoResume?.();
    }
  };
}
