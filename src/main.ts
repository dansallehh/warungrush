import { GameLoop } from './core/GameLoop';
import { StateMachine } from './core/StateMachine';

export const VIRTUAL_WIDTH = 390;
export const VIRTUAL_HEIGHT = 844;
export const MIN_HITBOX_SIZE = 48;

interface VirtualPoint {
  x: number;
  y: number;
}

interface HitRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ActivePointer {
  id: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  isDown: boolean;
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

class PointerTracker {
  public active: ActivePointer | null = null;

  private readonly canvas: HTMLCanvasElement;
  private readonly viewport: ViewportMapper;
  private readonly onTap: (point: VirtualPoint) => void;

  constructor(
    canvas: HTMLCanvasElement,
    viewport: ViewportMapper,
    onTap: (point: VirtualPoint) => void
  ) {
    this.canvas = canvas;
    this.viewport = viewport;
    this.onTap = onTap;

    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('pointerup', this.handlePointerUp);
    this.canvas.addEventListener('pointercancel', this.handlePointerCancel);
    this.canvas.addEventListener('pointerleave', this.handlePointerLeave);
    this.canvas.addEventListener('lostpointercapture', this.handlePointerCancel);
  }

  public destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointercancel', this.handlePointerCancel);
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave);
    this.canvas.removeEventListener('lostpointercapture', this.handlePointerCancel);
  }

  private readonly handlePointerDown = (e: PointerEvent): void => {
    if (this.active !== null) return;
    const pt = this.viewport.clientToVirtual(e.clientX, e.clientY);
    this.active = {
      id: e.pointerId,
      startX: pt.x,
      startY: pt.y,
      x: pt.x,
      y: pt.y,
      isDown: true,
    };

    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic events where pointer capture is unavailable
    }
  };

  private readonly handlePointerMove = (e: PointerEvent): void => {
    if (this.active === null || e.pointerId !== this.active.id) return;
    const pt = this.viewport.clientToVirtual(e.clientX, e.clientY);
    this.active.x = pt.x;
    this.active.y = pt.y;
  };

  private readonly handlePointerUp = (e: PointerEvent): void => {
    if (this.active === null || e.pointerId !== this.active.id) return;
    const pt = this.viewport.clientToVirtual(e.clientX, e.clientY);
    const dx = pt.x - this.active.startX;
    const dy = pt.y - this.active.startY;
    this.releasePointer(e.pointerId);

    if (Math.hypot(dx, dy) <= 24) {
      this.onTap(pt);
    }
  };

  private readonly handlePointerCancel = (e: PointerEvent): void => {
    if (this.active === null || e.pointerId !== this.active.id) return;
    this.releasePointer(e.pointerId);
  };

  private readonly handlePointerLeave = (e: PointerEvent): void => {
    if (this.active === null || e.pointerId !== this.active.id) return;
    this.releasePointer(e.pointerId);
  };

  private releasePointer(pointerId: number): void {
    try {
      if (this.canvas.hasPointerCapture(pointerId)) {
        this.canvas.releasePointerCapture(pointerId);
      }
    } catch {
      // Ignore release errors when capture is already lost
    }
    this.active = null;
  }
}

function hitTest(point: VirtualPoint, rect: HitRect): boolean {
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

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
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
  const fsm = new StateMachine('TITLE');

  const playButton: HitRect = { x: 65, y: 540, w: 260, h: 64 };
  const fullscreenButton: HitRect = { x: VIRTUAL_WIDTH - 64, y: 20, w: 48, h: 48 };
  const backButton: HitRect = { x: 16, y: 20, w: 88, h: 48 };

  let elapsed = 0;
  let toast: ToastMessage | null = null;

  const showToast = (text: string, duration = 3.2): void => {
    toast = { text, remaining: duration, duration };
  };

  const renderAwning = (c: CanvasRenderingContext2D): void => {
    const stripeCount = 8;
    const stripeW = VIRTUAL_WIDTH / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      c.fillStyle = i % 2 === 0 ? '#D97706' : '#FEF3C7';
      c.fillRect(i * stripeW, 0, stripeW + 0.5, 92);
      c.beginPath();
      c.arc(i * stripeW + stripeW * 0.5, 92, stripeW * 0.5, 0, Math.PI);
      c.fill();
    }

    c.fillStyle = 'rgba(0, 0, 0, 0.28)';
    c.fillRect(0, 86, VIRTUAL_WIDTH, 12);
  };

  const renderWokEmblem = (c: CanvasRenderingContext2D, cx: number, cy: number): void => {
    // Warm lantern glow behind wok
    const glow = c.createRadialGradient(cx, cy, 12, cx, cy, 110);
    glow.addColorStop(0, 'rgba(245, 158, 11, 0.32)');
    glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
    c.fillStyle = glow;
    c.beginPath();
    c.arc(cx, cy, 110, 0, Math.PI * 2);
    c.fill();

    // Animated steam wisps
    c.strokeStyle = 'rgba(254, 243, 199, 0.65)';
    c.lineWidth = 3;
    c.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      const phase = elapsed * 2.4 + i * 1.1;
      const sx = cx + i * 26;
      const sy = cy - 28;
      c.beginPath();
      c.moveTo(sx, sy);
      c.quadraticCurveTo(
        sx + Math.sin(phase) * 10,
        sy - 20,
        sx - Math.sin(phase) * 8,
        sy - 42
      );
      c.stroke();
    }

    // Wok handle
    c.strokeStyle = '#92400E';
    c.lineWidth = 9;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(cx + 58, cy + 4);
    c.lineTo(cx + 98, cy - 10);
    c.stroke();

    // Wok body
    c.fillStyle = '#27272A';
    c.strokeStyle = '#F59E0B';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(cx, cy + 2, 62, 0.08 * Math.PI, 0.92 * Math.PI);
    c.closePath();
    c.fill();
    c.stroke();

    // Flame flicker beneath wok
    const flicker = Math.sin(elapsed * 14) * 3;
    c.fillStyle = '#F97316';
    c.beginPath();
    c.moveTo(cx - 26, cy + 72);
    c.quadraticCurveTo(cx, cy + 48 - flicker, cx + 26, cy + 72);
    c.closePath();
    c.fill();

    c.fillStyle = '#FDE047';
    c.beginPath();
    c.moveTo(cx - 14, cy + 72);
    c.quadraticCurveTo(cx, cy + 56 - flicker * 0.6, cx + 14, cy + 72);
    c.closePath();
    c.fill();
  };

  const renderFullscreenButton = (c: CanvasRenderingContext2D): void => {
    const { x, y, w, h } = fullscreenButton;
    drawRoundedRect(c, x, y, w, h, 12);
    c.fillStyle = 'rgba(18, 18, 18, 0.72)';
    c.fill();
    c.strokeStyle = 'rgba(245, 158, 11, 0.65)';
    c.lineWidth = 1.5;
    c.stroke();

    c.strokeStyle = '#FEF3C7';
    c.lineWidth = 2.2;
    c.lineCap = 'round';
    const pad = 14;
    const len = 7;

    // 4 corner brackets
    c.beginPath();
    c.moveTo(x + pad, y + pad + len);
    c.lineTo(x + pad, y + pad);
    c.lineTo(x + pad + len, y + pad);

    c.moveTo(x + w - pad - len, y + pad);
    c.lineTo(x + w - pad, y + pad);
    c.lineTo(x + w - pad, y + pad + len);

    c.moveTo(x + pad, y + h - pad - len);
    c.lineTo(x + pad, y + h - pad);
    c.lineTo(x + pad + len, y + h - pad);

    c.moveTo(x + w - pad - len, y + h - pad);
    c.lineTo(x + w - pad, y + h - pad);
    c.lineTo(x + w - pad, y + h - pad - len);
    c.stroke();
  };

  const renderToast = (c: CanvasRenderingContext2D): void => {
    if (!toast) return;
    const alpha = Math.min(1, toast.remaining / 0.4, (toast.duration - toast.remaining) / 0.2);
    c.save();
    c.globalAlpha = Math.max(0, Math.min(1, alpha));
    drawRoundedRect(c, 24, VIRTUAL_HEIGHT - 84, VIRTUAL_WIDTH - 48, 48, 12);
    c.fillStyle = 'rgba(30, 30, 34, 0.94)';
    c.fill();
    c.strokeStyle = '#F59E0B';
    c.lineWidth = 1.5;
    c.stroke();

    c.fillStyle = '#FEF3C7';
    c.font = '600 13px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(toast.text, VIRTUAL_WIDTH * 0.5, VIRTUAL_HEIGHT - 60);
    c.restore();
  };

  fsm
    .register('TITLE', {
      onRender: (c) => {
        // Warm night-market backdrop gradient
        const bg = c.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
        bg.addColorStop(0, '#1C1917');
        bg.addColorStop(0.55, '#121212');
        bg.addColorStop(1, '#1F140A');
        c.fillStyle = bg;
        c.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        renderAwning(c);
        renderWokEmblem(c, VIRTUAL_WIDTH * 0.5, 290);

        // Title typography
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = '#F59E0B';
        c.font = '900 44px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
        c.fillText('WARUNG', VIRTUAL_WIDTH * 0.5, 412);

        c.fillStyle = '#FEF3C7';
        c.font = '900 46px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
        c.fillText('RUSH', VIRTUAL_WIDTH * 0.5, 460);

        c.fillStyle = '#A8A29E';
        c.font = '600 13px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
        c.fillText('NIGHT MARKET KITCHEN SPRINT', VIRTUAL_WIDTH * 0.5, 496);

        // Primary CTA button (260x64 >= 48x48 hitbox)
        const pulse = 1 + Math.sin(elapsed * 3.5) * 0.015;
        c.save();
        c.translate(
          playButton.x + playButton.w * 0.5,
          playButton.y + playButton.h * 0.5
        );
        c.scale(pulse, pulse);
        drawRoundedRect(
          c,
          -playButton.w * 0.5,
          -playButton.h * 0.5,
          playButton.w,
          playButton.h,
          16
        );
        c.fillStyle = '#F59E0B';
        c.fill();
        c.fillStyle = '#121212';
        c.font = '800 20px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
        c.fillText('TAP TO OPEN STALL', 0, 1);
        c.restore();

        // Viewport diagnostic pill
        c.fillStyle = '#78716C';
        c.font = '500 12px ui-monospace, SFMono-Regular, Menlo, monospace';
        c.fillText(
          `390×844 VIRTUAL • DPR ${viewport.dpr.toFixed(1)} • FSM: ${fsm.getState()}`,
          VIRTUAL_WIDTH * 0.5,
          VIRTUAL_HEIGHT - 28
        );

        renderFullscreenButton(c);
      },
    })
    .register('SHIFT_INTRO', {
      onUpdate: () => {
        if (fsm.getElapsed() >= 1.2) {
          fsm.transition('PLAYING');
        }
      },
      onRender: (c) => {
        c.fillStyle = '#121212';
        c.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = '#F59E0B';
        c.font = '800 30px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
        c.fillText('SHIFT 1', VIRTUAL_WIDTH * 0.5, VIRTUAL_HEIGHT * 0.45);
        c.fillStyle = '#FEF3C7';
        c.font = '600 16px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
        c.fillText('GET READY...', VIRTUAL_WIDTH * 0.5, VIRTUAL_HEIGHT * 0.51);
      },
    })
    .register('PLAYING', {
      onRender: (c) => {
        c.fillStyle = '#18181B';
        c.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        drawRoundedRect(c, backButton.x, backButton.y, backButton.w, backButton.h, 12);
        c.fillStyle = '#27272A';
        c.fill();
        c.strokeStyle = '#F59E0B';
        c.lineWidth = 1.5;
        c.stroke();

        c.fillStyle = '#FEF3C7';
        c.font = '700 14px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('← TITLE', backButton.x + backButton.w * 0.5, backButton.y + backButton.h * 0.5);

        c.fillStyle = '#F59E0B';
        c.font = '800 24px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
        c.fillText('STALL OPEN', VIRTUAL_WIDTH * 0.5, VIRTUAL_HEIGHT * 0.46);
        c.fillStyle = '#A1A1AA';
        c.font = '500 14px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
        c.fillText('Engine ready for gameplay systems', VIRTUAL_WIDTH * 0.5, VIRTUAL_HEIGHT * 0.52);

        renderFullscreenButton(c);
      },
    })
    .register('PAUSED', {
      onRender: (c) => {
        c.fillStyle = '#121212';
        c.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = '#F59E0B';
        c.font = '800 32px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
        c.fillText('PAUSED', VIRTUAL_WIDTH * 0.5, VIRTUAL_HEIGHT * 0.46);
        c.fillStyle = '#FEF3C7';
        c.font = '600 15px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
        c.fillText('Tap anywhere to resume', VIRTUAL_WIDTH * 0.5, VIRTUAL_HEIGHT * 0.53);
      },
    })
    .register('SHIFT_SUMMARY', {
      onRender: (c) => {
        c.fillStyle = '#121212';
        c.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
      },
    })
    .register('GAME_OVER', {
      onRender: (c) => {
        c.fillStyle = '#121212';
        c.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
      },
    });

  const handleTap = (point: VirtualPoint): void => {
    const state = fsm.getState();

    if (
      (state === 'TITLE' || state === 'PLAYING') &&
      hitTest(point, fullscreenButton)
    ) {
      void toggleFullscreen(showToast);
      return;
    }

    if (state === 'TITLE' && hitTest(point, playButton)) {
      fsm.transition('SHIFT_INTRO');
      return;
    }

    if (state === 'PLAYING' && hitTest(point, backButton)) {
      fsm.transition('TITLE');
      return;
    }

    if (state === 'PAUSED') {
      fsm.transition('PLAYING');
    }
  };

  const pointerTracker = new PointerTracker(canvasEl, viewport, handleTap);

  const onResize = (): void => {
    viewport.resize();
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  const loop = new GameLoop({
    onUpdate: (dt) => {
      elapsed += dt;
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
      renderToast(ctx);
      viewport.endFrame(ctx);
    },
    onAutoPause: () => {
      if (fsm.getState() === 'PLAYING') {
        fsm.transition('PAUSED');
      }
    },
  });

  fsm.start();
  loop.start();

  // Clean up on Vite HMR dispose during development
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      loop.destroy();
      pointerTracker.destroy();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    });
  }
}

bootstrap();
