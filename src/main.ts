import { WebAudioEngine } from './core/AudioEngine';
import { GameLoop } from './core/GameLoop';
import { StateMachine } from './core/StateMachine';
import { Stations } from './entities/Stations';
import type { Rect } from './entities/CustomerQueue';
import {
  HUD_FULLSCREEN_RECT,
  HUD_MUTE_RECT,
  OVERLAY_PRIMARY_RECT,
  OVERLAY_SECONDARY_RECT,
  ProceduralArt,
  TITLE_PLAY_RECT,
  VIRTUAL_HEIGHT,
  VIRTUAL_WIDTH,
} from './render/ProceduralArt';

export const MIN_HITBOX_SIZE = 48;

interface VirtualPoint {
  x: number;
  y: number;
}

interface ToastMessage {
  text: string;
  remaining: number;
  duration: number;
}

interface WebkitDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

interface WebkitElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

class ViewportMapper {
  public cssWidth = VIRTUAL_WIDTH;
  public cssHeight = VIRTUAL_HEIGHT;
  public dpr = 1;
  public scale = 1;
  public offsetX = 0;
  public offsetY = 0;

  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.resize();
  }

  public resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.cssWidth = Math.max(1, rect.width || window.innerWidth);
    this.cssHeight = Math.max(1, rect.height || window.innerHeight);
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);

    this.scale = Math.min(
      this.cssWidth / VIRTUAL_WIDTH,
      this.cssHeight / VIRTUAL_HEIGHT
    );
    this.offsetX = (this.cssWidth - VIRTUAL_WIDTH * this.scale) * 0.5;
    this.offsetY = (this.cssHeight - VIRTUAL_HEIGHT * this.scale) * 0.5;

    const targetWidth = Math.max(1, Math.round(this.cssWidth * this.dpr));
    const targetHeight = Math.max(1, Math.round(this.cssHeight * this.dpr));

    if (this.canvas.width !== targetWidth || this.canvas.height !== targetHeight) {
      this.canvas.width = targetWidth;
      this.canvas.height = targetHeight;
    }
  }

  public clientToVirtual(clientX: number, clientY: number): VirtualPoint {
    const rect = this.canvas.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    return {
      x: (localX - this.offsetX) / this.scale,
      y: (localY - this.offsetY) / this.scale,
    };
  }

  public beginFrame(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.setTransform(
      this.scale * this.dpr,
      0,
      0,
      this.scale * this.dpr,
      this.offsetX * this.dpr,
      this.offsetY * this.dpr
    );
    ctx.beginPath();
    ctx.rect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    ctx.clip();
  }

  public endFrame(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }
}

function hitTest(point: VirtualPoint, rect: Rect): boolean {
  const effW = Math.max(rect.w, MIN_HITBOX_SIZE);
  const effH = Math.max(rect.h, MIN_HITBOX_SIZE);
  const padX = (effW - rect.w) * 0.5;
  const padY = (effH - rect.h) * 0.5;
  return (
    point.x >= rect.x - padX &&
    point.x <= rect.x + rect.w + padX &&
    point.y >= rect.y - padY &&
    point.y <= rect.y + rect.h + padY
  );
}

function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = Boolean((navigator as NavigatorStandalone).standalone);
  return isIOS && !isStandalone;
}

function isFullscreenActive(): boolean {
  const doc = document as WebkitDocument;
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
}

async function toggleFullscreen(showToast: (msg: string) => void): Promise<void> {
  if (isIOSSafari()) {
    showToast('Tap Share → Add to Home Screen for fullscreen');
    return;
  }

  const doc = document as WebkitDocument;
  const root = document.documentElement as WebkitElement;

  try {
    if (isFullscreenActive()) {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      }
    } else if (root.requestFullscreen) {
      await root.requestFullscreen();
    } else if (root.webkitRequestFullscreen) {
      await root.webkitRequestFullscreen();
    } else {
      showToast('Tap Share → Add to Home Screen for fullscreen');
    }
  } catch {
    showToast('Fullscreen unavailable — Add to Home Screen');
  }
}

function bootstrap(): void {
  const canvasEl = document.getElementById('game-canvas');
  if (!(canvasEl instanceof HTMLCanvasElement)) {
    throw new Error('Missing #game-canvas element');
  }

  const ctx = canvasEl.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to acquire 2D canvas context');
  }

  const viewport = new ViewportMapper(canvasEl);
  const audio = new WebAudioEngine();
  const stations = new Stations(audio);
  const queue = stations.getCustomerQueue();
  const art = new ProceduralArt();
  const fsm = new StateMachine('TITLE');

  let currentShift = 1;
  let toast: ToastMessage | null = null;
  let activePointerId: number | null = null;
  let pointerStart: VirtualPoint | null = null;
  let pointerRoutedToStations = false;

  const showToast = (text: string, duration = 3.2): void => {
    toast = { text, remaining: duration, duration };
  };

  const startShift = (shiftNumber: number): void => {
    currentShift = Math.max(1, shiftNumber);
    stations.resetForShift(currentShift);
    fsm.transition('SHIFT_INTRO');
  };

  fsm
    .register('TITLE', {
      onRender: (c) => {
        art.renderTitle(c, audio.isMuted(), viewport.dpr);
      },
    })
    .register('SHIFT_INTRO', {
      onUpdate: () => {
        if (fsm.getElapsed() >= 1.3) {
          fsm.transition('PLAYING');
        }
      },
      onRender: (c) => {
        art.renderShiftIntro(c, queue.shift, queue.targetRM);
      },
    })
    .register('PLAYING', {
      onUpdate: (dt) => {
        stations.update(dt);
        if (queue.isShiftTimeUp()) {
          if (queue.didMeetTarget()) {
            fsm.transition('SHIFT_SUMMARY');
          } else {
            fsm.transition('GAME_OVER');
          }
        }
      },
      onRender: (c) => {
        art.renderGameplay(c, stations.getSnapshot(), audio.isMuted());
      },
    })
    .register('PAUSED', {
      onRender: (c) => {
        art.renderGameplay(c, stations.getSnapshot(), audio.isMuted());
        art.renderPausedOverlay(c);
      },
    })
    .register('SHIFT_SUMMARY', {
      onRender: (c) => {
        art.renderShiftSummary(
          c,
          stations.getSnapshot(),
          queue.servedCount,
          queue.missedCount
        );
      },
    })
    .register('GAME_OVER', {
      onRender: (c) => {
        art.renderGameOver(c, stations.getSnapshot(), queue.servedCount);
      },
    });

  const handleUiTap = (point: VirtualPoint): boolean => {
    const state = fsm.getState();

    // Top HUD Mute & Fullscreen buttons available on TITLE and PLAYING
    if (state === 'TITLE' || state === 'PLAYING') {
      if (hitTest(point, HUD_MUTE_RECT)) {
        audio.setMuted(!audio.isMuted());
        showToast(audio.isMuted() ? 'Audio Muted' : 'Audio On', 1.6);
        return true;
      }
      if (hitTest(point, HUD_FULLSCREEN_RECT)) {
        void toggleFullscreen(showToast);
        return true;
      }
    }

    if (state === 'TITLE' && hitTest(point, TITLE_PLAY_RECT)) {
      startShift(1);
      return true;
    }

    if (state === 'SHIFT_INTRO') {
      fsm.transition('PLAYING');
      return true;
    }

    if (state === 'PAUSED') {
      if (hitTest(point, OVERLAY_PRIMARY_RECT)) {
        fsm.transition('PLAYING');
        return true;
      }
      if (hitTest(point, OVERLAY_SECONDARY_RECT)) {
        fsm.transition('TITLE');
        return true;
      }
      return true;
    }

    if (state === 'SHIFT_SUMMARY') {
      if (hitTest(point, OVERLAY_PRIMARY_RECT)) {
        startShift(currentShift + 1);
        return true;
      }
      if (hitTest(point, OVERLAY_SECONDARY_RECT)) {
        fsm.transition('TITLE');
        return true;
      }
      return true;
    }

    if (state === 'GAME_OVER') {
      if (hitTest(point, OVERLAY_PRIMARY_RECT)) {
        startShift(currentShift);
        return true;
      }
      if (hitTest(point, OVERLAY_SECONDARY_RECT)) {
        fsm.transition('TITLE');
        return true;
      }
      return true;
    }

    return false;
  };

  const releasePointer = (pointerId: number): void => {
    try {
      if (canvasEl.hasPointerCapture(pointerId)) {
        canvasEl.releasePointerCapture(pointerId);
      }
    } catch {
      // Ignore release errors when capture is already lost
    }
    activePointerId = null;
    pointerStart = null;
    pointerRoutedToStations = false;
  };

  const onPointerDown = (e: PointerEvent): void => {
    // Unlock Web Audio on the very first pointerdown anywhere on canvas
    audio.unlock();

    if (activePointerId !== null) return;
    activePointerId = e.pointerId;
    const pt = viewport.clientToVirtual(e.clientX, e.clientY);
    pointerStart = pt;

    try {
      canvasEl.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic events where pointer capture is unavailable
    }

    const state = fsm.getState();
    const isHudHit =
      (state === 'TITLE' || state === 'PLAYING') &&
      (hitTest(pt, HUD_MUTE_RECT) || hitTest(pt, HUD_FULLSCREEN_RECT));

    if (state === 'PLAYING' && !isHudHit) {
      pointerRoutedToStations = true;
      stations.onPointerDown(e.pointerId, pt.x, pt.y);
    } else {
      pointerRoutedToStations = false;
    }
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (activePointerId === null || e.pointerId !== activePointerId) return;
    if (pointerRoutedToStations && fsm.getState() === 'PLAYING') {
      const pt = viewport.clientToVirtual(e.clientX, e.clientY);
      stations.onPointerMove(e.pointerId, pt.x, pt.y);
    }
  };

  const onPointerUp = (e: PointerEvent): void => {
    if (activePointerId === null || e.pointerId !== activePointerId) return;
    const pt = viewport.clientToVirtual(e.clientX, e.clientY);
    const routed = pointerRoutedToStations;
    const start = pointerStart;
    releasePointer(e.pointerId);

    if (routed && fsm.getState() === 'PLAYING') {
      stations.onPointerUp(e.pointerId, pt.x, pt.y);
      return;
    }

    if (start && Math.hypot(pt.x - start.x, pt.y - start.y) <= 28) {
      handleUiTap(pt);
    }
  };

  const onPointerCancel = (e: PointerEvent): void => {
    if (activePointerId === null || e.pointerId !== activePointerId) return;
    const routed = pointerRoutedToStations;
    releasePointer(e.pointerId);
    if (routed) {
      stations.onPointerCancel(e.pointerId);
    }
  };

  canvasEl.addEventListener('pointerdown', onPointerDown);
  canvasEl.addEventListener('pointermove', onPointerMove);
  canvasEl.addEventListener('pointerup', onPointerUp);
  canvasEl.addEventListener('pointercancel', onPointerCancel);
  canvasEl.addEventListener('pointerleave', onPointerCancel);
  canvasEl.addEventListener('lostpointercapture', onPointerCancel);

  const onResize = (): void => {
    viewport.resize();
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  const loop = new GameLoop({
    onUpdate: (dt) => {
      art.tick(dt);
      if (toast) {
        toast.remaining -= dt;
        if (toast.remaining <= 0) {
          toast = null;
        }
      }
      fsm.update(dt);
    },
    onRender: () => {
      viewport.beginFrame(ctx);
      fsm.render(ctx);
      if (toast) {
        const alpha = Math.min(
          1,
          toast.remaining / 0.4,
          (toast.duration - toast.remaining) / 0.2
        );
        art.renderToast(ctx, toast.text, alpha);
      }
      viewport.endFrame(ctx);
    },
    onAutoPause: () => {
      if (activePointerId !== null) {
        const id = activePointerId;
        const routed = pointerRoutedToStations;
        releasePointer(id);
        if (routed) {
          stations.onPointerCancel(id);
        }
      }
      if (fsm.getState() === 'PLAYING') {
        fsm.transition('PAUSED');
      }
    },
  });

  fsm.start();
  loop.start();

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      loop.destroy();
      canvasEl.removeEventListener('pointerdown', onPointerDown);
      canvasEl.removeEventListener('pointermove', onPointerMove);
      canvasEl.removeEventListener('pointerup', onPointerUp);
      canvasEl.removeEventListener('pointercancel', onPointerCancel);
      canvasEl.removeEventListener('pointerleave', onPointerCancel);
      canvasEl.removeEventListener('lostpointercapture', onPointerCancel);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    });
  }
}

bootstrap();
