import type {
  CustomerOrder,
  DishType,
  GameSnapshot,
  KualiSlot,
} from '../types/game';
import {
  ASSEMBLY_PLATE_RECT,
  CUSTOMER_SLOT_RECTS,
  DOCK_RECTS,
  KUALI_RECT,
  KUALI_SLOT_RECTS,
  PREP_BOARD_RECT,
  TEH_TARIK_RECT,
  type DockButtonId,
} from '../entities/Stations';
import type { Rect } from '../entities/CustomerQueue';

export const VIRTUAL_WIDTH = 390;
export const VIRTUAL_HEIGHT = 844;

export const HUD_MUTE_RECT: Rect = { x: 286, y: 4, w: 48, h: 48 };
export const HUD_FULLSCREEN_RECT: Rect = { x: 338, y: 4, w: 48, h: 48 };

export const TITLE_PLAY_RECT: Rect = { x: 65, y: 540, w: 260, h: 64 };
export const OVERLAY_PRIMARY_RECT: Rect = { x: 65, y: 510, w: 260, h: 60 };
export const OVERLAY_SECONDARY_RECT: Rect = { x: 95, y: 586, w: 200, h: 52 };

const FONT_SANS = 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const DOCK_META: Readonly<
  Record<DockButtonId, { label: string; accent: string; bg: string }>
> = {
  DOUGH: { label: 'DOUGH', accent: '#FEF3C7', bg: '#3F2E1A' },
  PATTY: { label: 'PATTY', accent: '#FCA5A5', bg: '#451A1A' },
  EGG: { label: 'EGG', accent: '#FDE047', bg: '#3F3515' },
  VEG: { label: 'VEG', accent: '#4ADE80', bg: '#143822' },
  SAUCE: { label: 'SAUCE', accent: '#FB923C', bg: '#431C0E' },
  WRAPPER: { label: 'WRAP', accent: '#38BDF8', bg: '#142C3D' },
  TRASH: { label: 'TRASH', accent: '#A1A1AA', bg: '#27272A' },
};

export function drawRoundedRect(
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

export class ProceduralArt {
  private time = 0;

  public tick(dt: number): void {
    this.time += dt;
  }

  public renderTitle(
    ctx: CanvasRenderingContext2D,
    muted: boolean,
    dpr: number
  ): void {
    const bg = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
    bg.addColorStop(0, '#1C1917');
    bg.addColorStop(0.55, '#121212');
    bg.addColorStop(1, '#1F140A');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    this.renderAwning(ctx, 0, 92);
    this.renderWokEmblem(ctx, VIRTUAL_WIDTH * 0.5, 290);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#F59E0B';
    ctx.font = `900 44px ${FONT_SANS}`;
    ctx.fillText('WARUNG', VIRTUAL_WIDTH * 0.5, 412);

    ctx.fillStyle = '#FEF3C7';
    ctx.font = `900 46px ${FONT_SANS}`;
    ctx.fillText('RUSH', VIRTUAL_WIDTH * 0.5, 460);

    ctx.fillStyle = '#A8A29E';
    ctx.font = `600 13px ${FONT_SANS}`;
    ctx.fillText('NIGHT MARKET KITCHEN SPRINT', VIRTUAL_WIDTH * 0.5, 496);

    const pulse = 1 + Math.sin(this.time * 3.5) * 0.015;
    ctx.save();
    ctx.translate(
      TITLE_PLAY_RECT.x + TITLE_PLAY_RECT.w * 0.5,
      TITLE_PLAY_RECT.y + TITLE_PLAY_RECT.h * 0.5
    );
    ctx.scale(pulse, pulse);
    drawRoundedRect(
      ctx,
      -TITLE_PLAY_RECT.w * 0.5,
      -TITLE_PLAY_RECT.h * 0.5,
      TITLE_PLAY_RECT.w,
      TITLE_PLAY_RECT.h,
      16
    );
    ctx.fillStyle = '#F59E0B';
    ctx.fill();
    ctx.fillStyle = '#121212';
    ctx.font = `800 20px ${FONT_SANS}`;
    ctx.fillText('OPEN WARUNG', 0, 1);
    ctx.restore();

    ctx.fillStyle = '#A8A29E';
    ctx.font = `500 12px ${FONT_SANS}`;
    ctx.fillText('Swipe dough • Flip roti • Pull teh tarik', VIRTUAL_WIDTH * 0.5, 636);

    ctx.fillStyle = '#57534E';
    ctx.font = `500 11px ${FONT_MONO}`;
    ctx.fillText(`390×844 • DPR ${dpr.toFixed(1)}`, VIRTUAL_WIDTH * 0.5, VIRTUAL_HEIGHT - 24);

    this.renderHudButtons(ctx, muted);
  }

  public renderShiftIntro(
    ctx: CanvasRenderingContext2D,
    shift: number,
    targetRM: number
  ): void {
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    this.renderAwning(ctx, 0, 72);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#F59E0B';
    ctx.font = `900 38px ${FONT_SANS}`;
    ctx.fillText(`SHIFT ${shift}`, VIRTUAL_WIDTH * 0.5, 340);

    ctx.fillStyle = '#FEF3C7';
    ctx.font = `700 20px ${FONT_SANS}`;
    ctx.fillText(`TARGET: RM ${targetRM}`, VIRTUAL_WIDTH * 0.5, 392);

    ctx.fillStyle = '#A8A29E';
    ctx.font = `600 14px ${FONT_SANS}`;
    const menuLine =
      shift === 1
        ? 'Menu: Roti Canai & Teh Tarik'
        : 'NEW UNLOCK: Burger Ramly!';
    ctx.fillText(menuLine, VIRTUAL_WIDTH * 0.5, 434);
  }

  public renderGameplay(
    ctx: CanvasRenderingContext2D,
    snap: GameSnapshot,
    muted: boolean
  ): void {
    ctx.save();
    if (snap.screenShake > 0) {
      const mag = snap.screenShake * 16;
      const sx = (Math.random() - 0.5) * mag;
      const sy = (Math.random() - 0.5) * mag;
      ctx.translate(sx, sy);
    }

    // Night-market stall backdrop
    ctx.fillStyle = '#141210';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    this.renderHudBar(ctx, snap, muted);
    this.renderCustomerRail(ctx, snap.customers);

    // Countertop divider
    ctx.fillStyle = '#292524';
    ctx.fillRect(0, 222, VIRTUAL_WIDTH, 10);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(0, 222, VIRTUAL_WIDTH, 2);

    this.renderTehTarikStation(ctx, snap);
    this.renderKualiStation(ctx, snap);
    this.renderAssemblyPlate(ctx, snap);
    this.renderPrepBoard(ctx, snap);
    this.renderBottomDock(ctx, snap);

    this.renderParticles(ctx, snap);
    this.renderPopups(ctx, snap);
    this.renderActiveDrag(ctx, snap);

    ctx.restore();
  }

  public renderPausedOverlay(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(12, 10, 9, 0.78)';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#F59E0B';
    ctx.font = `900 36px ${FONT_SANS}`;
    ctx.fillText('PAUSED', VIRTUAL_WIDTH * 0.5, 360);

    ctx.fillStyle = '#D6D3D1';
    ctx.font = `500 14px ${FONT_SANS}`;
    ctx.fillText('Stall is on hold', VIRTUAL_WIDTH * 0.5, 402);

    this.renderOverlayButton(ctx, OVERLAY_PRIMARY_RECT, 'RESUME SHIFT', '#F59E0B', '#121212');
    this.renderOverlayButton(ctx, OVERLAY_SECONDARY_RECT, 'MAIN TITLE', '#27272A', '#FEF3C7');
  }

  public renderShiftSummary(
    ctx: CanvasRenderingContext2D,
    snap: GameSnapshot,
    servedCount: number,
    missedCount: number
  ): void {
    ctx.fillStyle = 'rgba(12, 10, 9, 0.9)';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    this.renderAwning(ctx, 0, 64);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#22C55E';
    ctx.font = `900 32px ${FONT_SANS}`;
    ctx.fillText(`SHIFT ${snap.shift} CLEAR!`, VIRTUAL_WIDTH * 0.5, 220);

    drawRoundedRect(ctx, 38, 270, VIRTUAL_WIDTH - 76, 196, 16);
    ctx.fillStyle = '#1C1917';
    ctx.fill();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FEF3C7';
    ctx.font = `800 28px ${FONT_SANS}`;
    ctx.fillText(`RM ${snap.cashRM} / RM ${snap.targetRM}`, VIRTUAL_WIDTH * 0.5, 326);

    ctx.fillStyle = '#A8A29E';
    ctx.font = `600 15px ${FONT_SANS}`;
    ctx.fillText(`Orders Served: ${servedCount}`, VIRTUAL_WIDTH * 0.5, 380);
    ctx.fillText(`Customers Missed: ${missedCount}`, VIRTUAL_WIDTH * 0.5, 412);

    this.renderOverlayButton(
      ctx,
      OVERLAY_PRIMARY_RECT,
      `START SHIFT ${snap.shift + 1}`,
      '#F59E0B',
      '#121212'
    );
    this.renderOverlayButton(ctx, OVERLAY_SECONDARY_RECT, 'MAIN TITLE', '#27272A', '#FEF3C7');
  }

  public renderGameOver(
    ctx: CanvasRenderingContext2D,
    snap: GameSnapshot,
    servedCount: number
  ): void {
    ctx.fillStyle = 'rgba(12, 10, 9, 0.92)';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#EF4444';
    ctx.font = `900 34px ${FONT_SANS}`;
    ctx.fillText('TUTUP KEDAI!', VIRTUAL_WIDTH * 0.5, 230);

    ctx.fillStyle = '#D6D3D1';
    ctx.font = `600 15px ${FONT_SANS}`;
    ctx.fillText('Target not reached this shift', VIRTUAL_WIDTH * 0.5, 268);

    drawRoundedRect(ctx, 38, 304, VIRTUAL_WIDTH - 76, 156, 16);
    ctx.fillStyle = '#1C1917';
    ctx.fill();
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FEF3C7';
    ctx.font = `800 26px ${FONT_SANS}`;
    ctx.fillText(`RM ${snap.cashRM} / RM ${snap.targetRM}`, VIRTUAL_WIDTH * 0.5, 360);

    ctx.fillStyle = '#A8A29E';
    ctx.font = `600 14px ${FONT_SANS}`;
    ctx.fillText(`Shift ${snap.shift} • Served ${servedCount} orders`, VIRTUAL_WIDTH * 0.5, 410);

    this.renderOverlayButton(ctx, OVERLAY_PRIMARY_RECT, 'TRY AGAIN', '#F59E0B', '#121212');
    this.renderOverlayButton(ctx, OVERLAY_SECONDARY_RECT, 'MAIN TITLE', '#27272A', '#FEF3C7');
  }

  public renderToast(
    ctx: CanvasRenderingContext2D,
    text: string,
    alpha: number
  ): void {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    drawRoundedRect(ctx, 24, VIRTUAL_HEIGHT - 84, VIRTUAL_WIDTH - 48, 48, 12);
    ctx.fillStyle = 'rgba(24, 24, 27, 0.95)';
    ctx.fill();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#FEF3C7';
    ctx.font = `600 13px ${FONT_SANS}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, VIRTUAL_WIDTH * 0.5, VIRTUAL_HEIGHT - 60);
    ctx.restore();
  }

  private renderHudBar(
    ctx: CanvasRenderingContext2D,
    snap: GameSnapshot,
    muted: boolean
  ): void {
    ctx.fillStyle = '#18181B';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, 56);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(0, 54, VIRTUAL_WIDTH, 2);

    // Shift + Cash
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#F59E0B';
    ctx.font = `800 13px ${FONT_SANS}`;
    ctx.fillText(`SHIFT ${snap.shift}`, 12, 18);

    ctx.fillStyle = snap.cashRM >= snap.targetRM ? '#4ADE80' : '#FEF3C7';
    ctx.font = `800 16px ${FONT_SANS}`;
    ctx.fillText(`RM ${snap.cashRM}/${snap.targetRM}`, 12, 38);

    // Timer & Combo
    const secs = Math.ceil(snap.shiftTimeLeft);
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    const clockText = `${mins}:${rem.toString().padStart(2, '0')}`;

    ctx.textAlign = 'center';
    ctx.fillStyle = secs <= 10 ? '#EF4444' : '#FEF3C7';
    ctx.font = `800 19px ${FONT_MONO}`;
    ctx.fillText(clockText, 198, 22);

    if (snap.combo >= 2) {
      ctx.fillStyle = '#F59E0B';
      ctx.font = `800 11px ${FONT_SANS}`;
      ctx.fillText(`LAYAN! x${snap.combo}`, 198, 42);
    } else {
      ctx.fillStyle = '#71717A';
      ctx.font = `600 10px ${FONT_SANS}`;
      ctx.fillText('COMBO x1', 198, 42);
    }

    this.renderHudButtons(ctx, muted);
  }

  private renderHudButtons(ctx: CanvasRenderingContext2D, muted: boolean): void {
    // Mute button (48x48)
    const m = HUD_MUTE_RECT;
    drawRoundedRect(ctx, m.x, m.y, m.w, m.h, 10);
    ctx.fillStyle = 'rgba(24, 24, 27, 0.85)';
    ctx.fill();
    ctx.strokeStyle = muted ? '#EF4444' : 'rgba(245, 158, 11, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const mcx = m.x + m.w * 0.5;
    const mcy = m.y + m.h * 0.5;
    ctx.fillStyle = muted ? '#71717A' : '#FEF3C7';
    ctx.beginPath();
    ctx.moveTo(mcx - 9, mcy - 4);
    ctx.lineTo(mcx - 4, mcy - 4);
    ctx.lineTo(mcx + 2, mcy - 9);
    ctx.lineTo(mcx + 2, mcy + 9);
    ctx.lineTo(mcx - 4, mcy + 4);
    ctx.lineTo(mcx - 9, mcy + 4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = muted ? '#EF4444' : '#F59E0B';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    if (muted) {
      ctx.beginPath();
      ctx.moveTo(mcx + 5, mcy - 5);
      ctx.lineTo(mcx + 11, mcy + 5);
      ctx.moveTo(mcx + 11, mcy - 5);
      ctx.lineTo(mcx + 5, mcy + 5);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(mcx + 3, mcy, 5, -0.7, 0.7);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(mcx + 3, mcy, 9, -0.7, 0.7);
      ctx.stroke();
    }

    // Fullscreen button (48x48)
    const f = HUD_FULLSCREEN_RECT;
    drawRoundedRect(ctx, f.x, f.y, f.w, f.h, 10);
    ctx.fillStyle = 'rgba(24, 24, 27, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = '#FEF3C7';
    ctx.lineWidth = 2.2;
    const pad = 14;
    const len = 7;
    ctx.beginPath();
    ctx.moveTo(f.x + pad, f.y + pad + len);
    ctx.lineTo(f.x + pad, f.y + pad);
    ctx.lineTo(f.x + pad + len, f.y + pad);

    ctx.moveTo(f.x + f.w - pad - len, f.y + pad);
    ctx.lineTo(f.x + f.w - pad, f.y + pad);
    ctx.lineTo(f.x + f.w - pad, f.y + pad + len);

    ctx.moveTo(f.x + pad, f.y + f.h - pad - len);
    ctx.lineTo(f.x + pad, f.y + f.h - pad);
    ctx.lineTo(f.x + pad + len, f.y + f.h - pad);

    ctx.moveTo(f.x + f.w - pad - len, f.y + f.h - pad);
    ctx.lineTo(f.x + f.w - pad, f.y + f.h - pad);
    ctx.lineTo(f.x + f.w - pad, f.y + f.h - pad - len);
    ctx.stroke();
  }

  private renderCustomerRail(
    ctx: CanvasRenderingContext2D,
    customers: CustomerOrder[]
  ): void {
    const railBg = ctx.createLinearGradient(0, 56, 0, 222);
    railBg.addColorStop(0, '#271E17');
    railBg.addColorStop(1, '#1C1917');
    ctx.fillStyle = railBg;
    ctx.fillRect(0, 56, VIRTUAL_WIDTH, 166);

    for (let i = 0; i < 3; i++) {
      const rect = CUSTOMER_SLOT_RECTS[i]!;
      const customer = customers.find((c) => c.slotIndex === i);

      drawRoundedRect(ctx, rect.x, rect.y + 6, rect.w, rect.h - 12, 12);
      ctx.fillStyle = customer ? '#26211D' : 'rgba(255, 255, 255, 0.03)';
      ctx.fill();
      ctx.strokeStyle = customer ? 'rgba(245, 158, 11, 0.45)' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (!customer) {
        ctx.fillStyle = '#52525B';
        ctx.font = `600 10px ${FONT_SANS}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('OPEN SEAT', rect.x + rect.w * 0.5, rect.y + rect.h * 0.5);
        continue;
      }

      const cx = rect.x + rect.w * 0.5;
      this.renderCustomerPortrait(ctx, customer.archetype, cx, rect.y + 46);

      // Order bubble
      drawRoundedRect(ctx, rect.x + 6, rect.y + 78, rect.w - 12, 60, 8);
      ctx.fillStyle = '#FEF3C7';
      ctx.fill();

      const count = customer.items.length;
      const spacing = (rect.w - 20) / Math.max(1, count);
      customer.items.forEach((dish, idx) => {
        const ix = rect.x + 10 + spacing * (idx + 0.5);
        const iy = rect.y + 108;
        this.renderDishMiniIcon(ctx, dish, ix, iy, 15);
        if (customer.fulfilled[idx]) {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.88)';
          ctx.beginPath();
          ctx.arc(ix + 8, iy - 8, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(ix + 5, iy - 8);
          ctx.lineTo(ix + 7.5, iy - 5.5);
          ctx.lineTo(ix + 11.5, iy - 10.5);
          ctx.stroke();
        }
      });

      // Patience bar
      const ratio = Math.max(0, Math.min(1, customer.patience / customer.maxPatience));
      const barX = rect.x + 8;
      const barY = rect.y + rect.h - 20;
      const barW = rect.w - 16;
      drawRoundedRect(ctx, barX, barY, barW, 8, 4);
      ctx.fillStyle = '#18181B';
      ctx.fill();
      drawRoundedRect(ctx, barX, barY, Math.max(4, barW * ratio), 8, 4);
      ctx.fillStyle = ratio > 0.5 ? '#22C55E' : ratio > 0.25 ? '#F59E0B' : '#EF4444';
      ctx.fill();
    }
  }

  private renderCustomerPortrait(
    ctx: CanvasRenderingContext2D,
    archetype: CustomerOrder['archetype'],
    cx: number,
    cy: number
  ): void {
    // Shoulders
    ctx.fillStyle =
      archetype === 'PAK_CIK'
        ? '#0D9488'
        : archetype === 'OFFICE_RUSH'
          ? '#3B82F6'
          : '#A855F7';
    ctx.beginPath();
    ctx.arc(cx, cy + 24, 22, Math.PI, 0);
    ctx.fill();

    // Head
    ctx.fillStyle = '#E6B88A';
    ctx.beginPath();
    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
    ctx.fill();

    // Archetype headwear / details
    if (archetype === 'PAK_CIK') {
      // Songkok
      ctx.fillStyle = '#18181B';
      drawRoundedRect(ctx, cx - 14, cy - 22, 28, 12, 4);
      ctx.fill();
      // Moustache
      ctx.strokeStyle = '#3F3F46';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy + 5);
      ctx.quadraticCurveTo(cx, cy + 2, cx + 6, cy + 5);
      ctx.stroke();
    } else if (archetype === 'OFFICE_RUSH') {
      // Hair & glasses
      ctx.fillStyle = '#27272A';
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 15, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = '#18181B';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(cx - 10, cy - 3, 8, 6);
      ctx.strokeRect(cx + 2, cy - 3, 8, 6);
    } else {
      // Lepak cap
      ctx.fillStyle = '#EA580C';
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 15, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(cx + 2, cy - 8, 16, 4);
    }

    // Eyes
    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.arc(cx - 5, cy, 1.8, 0, Math.PI * 2);
    ctx.arc(cx + 5, cy, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderTehTarikStation(
    ctx: CanvasRenderingContext2D,
    snap: GameSnapshot
  ): void {
    const r = TEH_TARIK_RECT;
    drawRoundedRect(ctx, r.x, r.y, r.w, r.h, 14);
    ctx.fillStyle = '#1E1B18';
    ctx.fill();
    ctx.strokeStyle = snap.tehTarik.isReady
      ? '#22C55E'
      : snap.tehTarik.spilledTimer > 0
        ? '#EF4444'
        : '#44403C';
    ctx.lineWidth = 2;
    ctx.stroke();

    const cx = r.x + r.w * 0.5;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#F59E0B';
    ctx.font = `800 11px ${FONT_SANS}`;
    ctx.fillText('TEH TARIK', cx, r.y + 18);

    // Stainless dispenser cylinder
    drawRoundedRect(ctx, cx - 26, r.y + 34, 52, 74, 8);
    ctx.fillStyle = '#52525B';
    ctx.fill();
    ctx.fillStyle = '#71717A';
    ctx.fillRect(cx - 20, r.y + 40, 12, 62);

    // Spout
    ctx.fillStyle = '#A1A1AA';
    ctx.fillRect(cx - 5, r.y + 108, 10, 16);

    // Pouring stream
    if (snap.tehTarik.isPulling) {
      const wobble = Math.sin(this.time * 28) * 3;
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(cx, r.y + 124);
      ctx.quadraticCurveTo(cx + wobble, r.y + 200, cx, r.y + 270);
      ctx.stroke();
    }

    // Sweet-spot vertical meter
    const meterX = r.x + r.w - 18;
    const meterY = r.y + 142;
    const meterH = 190;
    drawRoundedRect(ctx, meterX, meterY, 10, meterH, 5);
    ctx.fillStyle = '#27272A';
    ctx.fill();

    // Sweet spot highlight (0.75..0.90)
    const sweetTop = meterY + meterH * (1 - 0.9);
    const sweetH = meterH * (0.9 - 0.75);
    ctx.fillStyle = 'rgba(34, 197, 94, 0.55)';
    ctx.fillRect(meterX, sweetTop, 10, sweetH);

    // Current fill level
    const fillH = Math.min(1, snap.tehTarik.fillLevel) * meterH;
    if (fillH > 0) {
      drawRoundedRect(ctx, meterX, meterY + meterH - fillH, 10, fillH, 4);
      ctx.fillStyle =
        snap.tehTarik.fillLevel >= 0.75 && snap.tehTarik.fillLevel <= 0.9
          ? '#22C55E'
          : '#F59E0B';
      ctx.fill();
    }

    // Mug at bottom
    const mugX = cx - 26;
    const mugY = r.y + 244;
    const mugW = 46;
    const mugH = 88;
    drawRoundedRect(ctx, mugX, mugY, mugW, mugH, 8);
    ctx.fillStyle = '#27272A';
    ctx.fill();
    ctx.strokeStyle = '#D6D3D1';
    ctx.lineWidth = 2;
    ctx.stroke();

    const liquidH = Math.min(1, snap.tehTarik.fillLevel) * (mugH - 8);
    if (liquidH > 0) {
      ctx.fillStyle = '#B45309';
      ctx.fillRect(mugX + 3, mugY + mugH - 4 - liquidH, mugW - 6, liquidH);
      // Foam cap
      ctx.fillStyle = '#FEF3C7';
      ctx.fillRect(mugX + 3, mugY + mugH - 4 - liquidH, mugW - 6, Math.min(10, liquidH));
    }

    // Status caption
    ctx.font = `700 10px ${FONT_SANS}`;
    if (snap.tehTarik.spilledTimer > 0) {
      ctx.fillStyle = '#EF4444';
      ctx.fillText('TUMPAH!', cx, r.y + r.h - 22);
    } else if (snap.tehTarik.isReady) {
      ctx.fillStyle = '#4ADE80';
      ctx.fillText('TAP / DRAG', cx, r.y + r.h - 22);
    } else {
      ctx.fillStyle = '#A8A29E';
      ctx.fillText('HOLD TO PULL', cx, r.y + r.h - 22);
    }
  }

  private renderKualiStation(
    ctx: CanvasRenderingContext2D,
    snap: GameSnapshot
  ): void {
    const r = KUALI_RECT;
    drawRoundedRect(ctx, r.x, r.y, r.w, r.h, 14);
    ctx.fillStyle = '#18181B';
    ctx.fill();
    ctx.strokeStyle = '#52525B';
    ctx.lineWidth = 2;
    ctx.stroke();

    for (let i = 0; i < 2; i++) {
      const sr = KUALI_SLOT_RECTS[i]!;
      const slot = snap.kuali[i]!;
      const cx = sr.x + sr.w * 0.5;
      const cy = sr.y + sr.h * 0.5;

      // Hot griddle burner circle
      ctx.fillStyle = '#27272A';
      ctx.beginPath();
      ctx.arc(cx, cy, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle =
        slot.state === 'BURNT'
          ? '#EF4444'
          : slot.state === 'READY_FLIP'
            ? '#F59E0B'
            : slot.state === 'COOKED'
              ? '#22C55E'
              : '#3F3F46';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      if (slot.item === null) {
        ctx.fillStyle = '#52525B';
        ctx.font = `600 10px ${FONT_SANS}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`KUALI ${i + 1}`, cx, cy);
        continue;
      }

      this.renderKualiItem(ctx, slot, cx, cy);

      // Cook / burn progress bar
      const barX = sr.x + 18;
      const barY = sr.y + sr.h - 16;
      const barW = sr.w - 36;
      drawRoundedRect(ctx, barX, barY, barW, 7, 3.5);
      ctx.fillStyle = '#09090B';
      ctx.fill();

      if (slot.burnProgress > 0) {
        drawRoundedRect(ctx, barX, barY, barW * Math.min(1, slot.burnProgress), 7, 3.5);
        ctx.fillStyle = '#EF4444';
        ctx.fill();
      } else {
        drawRoundedRect(ctx, barX, barY, barW * Math.min(1, slot.progress), 7, 3.5);
        ctx.fillStyle = slot.state === 'COOKED' ? '#22C55E' : '#F59E0B';
        ctx.fill();
      }

      // Contextual action hint
      const hint = this.getKualiHint(slot);
      if (hint) {
        ctx.fillStyle = slot.state === 'BURNT' ? '#FCA5A5' : '#FEF3C7';
        ctx.font = `800 10px ${FONT_SANS}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hint, cx, sr.y + 13);
      }
    }
  }

  private renderKualiItem(
    ctx: CanvasRenderingContext2D,
    slot: KualiSlot,
    cx: number,
    cy: number
  ): void {
    const isBurnt = slot.state === 'BURNT';

    if (slot.item === 'ROTI') {
      ctx.fillStyle = isBurnt
        ? '#18181B'
        : slot.state === 'COOKED'
          ? '#D97706'
          : '#FDE68A';
      ctx.beginPath();
      ctx.arc(cx, cy, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isBurnt ? '#52525B' : '#92400E';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Flaky spiral
      ctx.strokeStyle = isBurnt ? '#3F3F46' : 'rgba(146, 64, 14, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 1.5);
      ctx.stroke();
    } else if (slot.item === 'PATTY') {
      ctx.fillStyle = isBurnt
        ? '#18181B'
        : slot.state === 'COOKED'
          ? '#7C2D12'
          : '#DC2626';
      ctx.beginPath();
      ctx.arc(cx, cy, 28, 0, Math.PI * 2);
      ctx.fill();
      // Grill sear lines
      ctx.strokeStyle = isBurnt ? '#3F3F46' : '#451A03';
      ctx.lineWidth = 3;
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.moveTo(cx - 16, cy + k * 9);
        ctx.lineTo(cx + 16, cy + k * 9);
        ctx.stroke();
      }
    } else if (slot.item === 'EGG') {
      ctx.fillStyle = isBurnt ? '#27272A' : '#FEF9C3';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 34, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isBurnt ? '#3F3F46' : '#FACC15';
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();
    } else if (slot.item === 'WRAPPED_BURGER') {
      // Omelette wrap
      drawRoundedRect(ctx, cx - 32, cy - 22, 64, 44, 14);
      ctx.fillStyle = isBurnt ? '#18181B' : '#FACC15';
      ctx.fill();
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (slot.hasGarnish) {
        ctx.fillStyle = '#22C55E';
        for (let k = -2; k <= 2; k++) {
          ctx.fillRect(cx + k * 9 - 3, cy - 8, 6, 4);
        }
      }
      if (slot.hasSauce) {
        ctx.strokeStyle = '#EA580C';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - 20, cy + 4);
        ctx.quadraticCurveTo(cx - 8, cy - 6, cx, cy + 4);
        ctx.quadraticCurveTo(cx + 8, cy + 12, cx + 20, cy + 2);
        ctx.stroke();
      }
    }
  }

  private getKualiHint(slot: KualiSlot): string {
    if (slot.state === 'BURNT') return '2× TAP / TRASH';
    if (slot.state === 'READY_FLIP') return 'SWIPE ↑ FLIP';
    if (slot.item === 'ROTI' && slot.state === 'COOKED') return 'TAP TO PLATE';
    if (slot.item === 'PATTY' && slot.state === 'COOKED') return 'DRAG → EGG';
    if (slot.item === 'WRAPPED_BURGER') {
      if (!slot.hasGarnish && !slot.hasSauce) return '+VEG & +SAUCE';
      if (!slot.hasGarnish) return 'TAP VEG';
      if (!slot.hasSauce) return 'TAP SAUCE';
      return 'DRAG → WRAP';
    }
    return '';
  }

  private renderAssemblyPlate(
    ctx: CanvasRenderingContext2D,
    snap: GameSnapshot
  ): void {
    const r = ASSEMBLY_PLATE_RECT;
    drawRoundedRect(ctx, r.x, r.y, r.w, r.h, 14);
    ctx.fillStyle = '#1E1B18';
    ctx.fill();
    ctx.strokeStyle = snap.plate.dish ? '#22C55E' : '#44403C';
    ctx.lineWidth = 2;
    ctx.stroke();

    const cx = r.x + r.w * 0.5;
    const cy = r.y + r.h * 0.5;

    // Plate oval
    ctx.fillStyle = '#E7E5E4';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 56, 36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#15803D';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 46, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    if (snap.plate.dish) {
      this.renderDishMiniIcon(ctx, snap.plate.dish, cx, cy, 24);
      ctx.fillStyle = '#4ADE80';
      ctx.font = `800 10px ${FONT_SANS}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TAP / DRAG SERVE', cx, r.y + r.h - 11);
    } else {
      ctx.fillStyle = '#78716C';
      ctx.font = `600 10px ${FONT_SANS}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SERVING PLATE', cx, r.y + r.h - 11);
    }
  }

  private renderPrepBoard(
    ctx: CanvasRenderingContext2D,
    snap: GameSnapshot
  ): void {
    const r = PREP_BOARD_RECT;
    drawRoundedRect(ctx, r.x, r.y, r.w, r.h, 14);
    ctx.fillStyle = '#452A18';
    ctx.fill();
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 2;
    ctx.stroke();

    const cx = r.x + r.w * 0.5;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FDE68A';
    ctx.font = `800 11px ${FONT_SANS}`;
    ctx.fillText('PREP BOARD', cx, r.y + 18);

    const cy = r.y + 185;
    if (snap.prep.item === 'DOUGH') {
      const stretch = 1 + snap.prep.swipesDone * 0.28;
      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 22 * stretch, 18 / Math.sqrt(stretch), 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#F59E0B';
      ctx.font = `800 11px ${FONT_SANS}`;
      ctx.fillText(
        snap.prep.swipesDone >= snap.prep.swipesRequired
          ? 'TAP TO TOSS'
          : `SWIPE ↔ ${snap.prep.swipesDone}/${snap.prep.swipesRequired}`,
        cx,
        cy + 58
      );
    } else if (snap.prep.item === 'VEG') {
      ctx.fillStyle = '#22C55E';
      ctx.beginPath();
      ctx.arc(cx, cy, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#BBF7D0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 1.4);
      ctx.stroke();

      ctx.fillStyle = '#4ADE80';
      ctx.font = `800 11px ${FONT_SANS}`;
      ctx.fillText(
        `CHOP ↓ ${snap.prep.swipesDone}/${snap.prep.swipesRequired}`,
        cx,
        cy + 58
      );
    } else {
      ctx.fillStyle = 'rgba(254, 243, 199, 0.35)';
      ctx.font = `600 10px ${FONT_SANS}`;
      ctx.fillText('TAP DOUGH', cx, cy - 10);
      ctx.fillText('OR VEG', cx, cy + 8);
    }

    // Sliced veg stock pill
    drawRoundedRect(ctx, r.x + 8, r.y + r.h - 44, r.w - 16, 32, 8);
    ctx.fillStyle = 'rgba(20, 56, 34, 0.9)';
    ctx.fill();
    ctx.fillStyle = '#4ADE80';
    ctx.font = `800 11px ${FONT_SANS}`;
    ctx.fillText(`VEG ×${snap.prep.slicedStock}`, cx, r.y + r.h - 28);
  }

  private renderBottomDock(
    ctx: CanvasRenderingContext2D,
    snap: GameSnapshot
  ): void {
    ctx.fillStyle = '#18181B';
    ctx.fillRect(0, 650, VIRTUAL_WIDTH, VIRTUAL_HEIGHT - 650);
    ctx.fillStyle = '#27272A';
    ctx.fillRect(0, 650, VIRTUAL_WIDTH, 2);

    for (const [id, rect] of Object.entries(DOCK_RECTS) as [DockButtonId, Rect][]) {
      const meta = DOCK_META[id];
      drawRoundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
      ctx.fillStyle = meta.bg;
      ctx.fill();
      ctx.strokeStyle = meta.accent;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      const cx = rect.x + rect.w * 0.5;
      const cy = rect.y + 28;
      this.renderDockIcon(ctx, id, cx, cy, meta.accent);

      ctx.fillStyle = '#FEF3C7';
      ctx.font = `800 11px ${FONT_SANS}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label =
        id === 'VEG' && snap.prep.slicedStock > 0
          ? `VEG (${snap.prep.slicedStock})`
          : meta.label;
      ctx.fillText(label, cx, rect.y + rect.h - 15);
    }
  }

  private renderDockIcon(
    ctx: CanvasRenderingContext2D,
    id: DockButtonId,
    cx: number,
    cy: number,
    color: string
  ): void {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    switch (id) {
      case 'DOUGH':
        ctx.beginPath();
        ctx.arc(cx, cy, 13, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'PATTY':
        ctx.beginPath();
        ctx.ellipse(cx, cy, 15, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'EGG':
        ctx.fillStyle = '#FEF9C3';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 14, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FACC15';
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'VEG':
        ctx.beginPath();
        ctx.arc(cx - 4, cy, 9, 0, Math.PI * 2);
        ctx.arc(cx + 5, cy + 2, 8, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'SAUCE':
        drawRoundedRect(ctx, cx - 6, cy - 10, 12, 20, 4);
        ctx.fill();
        break;
      case 'WRAPPER':
        drawRoundedRect(ctx, cx - 13, cy - 10, 26, 20, 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 13, cy - 10);
        ctx.lineTo(cx, cy + 2);
        ctx.lineTo(cx + 13, cy - 10);
        ctx.stroke();
        break;
      case 'TRASH':
        ctx.strokeRect(cx - 9, cy - 7, 18, 17);
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy - 7);
        ctx.lineTo(cx + 12, cy - 7);
        ctx.stroke();
        break;
    }
  }

  private renderDishMiniIcon(
    ctx: CanvasRenderingContext2D,
    dish: DishType,
    cx: number,
    cy: number,
    radius: number
  ): void {
    if (dish === 'ROTI_CANAI') {
      ctx.fillStyle = '#D97706';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 1.4);
      ctx.stroke();
    } else if (dish === 'BURGER_RAMLY') {
      drawRoundedRect(ctx, cx - radius, cy - radius * 0.72, radius * 2, radius * 1.44, 6);
      ctx.fillStyle = '#FACC15';
      ctx.fill();
      ctx.fillStyle = '#7C2D12';
      ctx.fillRect(cx - radius * 0.75, cy - 3, radius * 1.5, 6);
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(cx - radius * 0.75, cy - 6, radius * 1.5, 3);
    } else {
      // TEH_TARIK
      drawRoundedRect(ctx, cx - radius * 0.65, cy - radius * 0.85, radius * 1.3, radius * 1.7, 4);
      ctx.fillStyle = '#B45309';
      ctx.fill();
      ctx.fillStyle = '#FEF3C7';
      ctx.fillRect(cx - radius * 0.65, cy - radius * 0.85, radius * 1.3, radius * 0.45);
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D, snap: GameSnapshot): void {
    for (const p of snap.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderPopups(ctx: CanvasRenderingContext2D, snap: GameSnapshot): void {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 15px ${FONT_SANS}`;
    for (const pop of snap.popups) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, pop.alpha));
      ctx.strokeStyle = '#121212';
      ctx.lineWidth = 3.5;
      ctx.strokeText(pop.text, pop.x, pop.y);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.restore();
    }
  }

  private renderActiveDrag(ctx: CanvasRenderingContext2D, snap: GameSnapshot): void {
    const drag = snap.activeDrag;
    if (!drag) return;
    ctx.save();
    ctx.globalAlpha = 0.92;
    if (drag.dish) {
      this.renderDishMiniIcon(ctx, drag.dish, drag.x, drag.y, 24);
    } else {
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(drag.x, drag.y, 20, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderOverlayButton(
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    label: string,
    bg: string,
    fg: string
  ): void {
    drawRoundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 14);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.font = `800 18px ${FONT_SANS}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, rect.x + rect.w * 0.5, rect.y + rect.h * 0.5);
  }

  private renderAwning(ctx: CanvasRenderingContext2D, y: number, h: number): void {
    const stripeCount = 8;
    const stripeW = VIRTUAL_WIDTH / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#D97706' : '#FEF3C7';
      ctx.fillRect(i * stripeW, y, stripeW + 0.5, h);
      ctx.beginPath();
      ctx.arc(i * stripeW + stripeW * 0.5, y + h, stripeW * 0.5, 0, Math.PI);
      ctx.fill();
    }
  }

  private renderWokEmblem(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number
  ): void {
    const glow = ctx.createRadialGradient(cx, cy, 12, cx, cy, 110);
    glow.addColorStop(0, 'rgba(245, 158, 11, 0.32)');
    glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 110, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(254, 243, 199, 0.65)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      const phase = this.time * 2.4 + i * 1.1;
      const sx = cx + i * 26;
      const sy = cy - 28;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(
        sx + Math.sin(phase) * 10,
        sy - 20,
        sx - Math.sin(phase) * 8,
        sy - 42
      );
      ctx.stroke();
    }

    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(cx + 58, cy + 4);
    ctx.lineTo(cx + 98, cy - 10);
    ctx.stroke();

    ctx.fillStyle = '#27272A';
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 62, 0.08 * Math.PI, 0.92 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const flicker = Math.sin(this.time * 14) * 3;
    ctx.fillStyle = '#F97316';
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy + 72);
    ctx.quadraticCurveTo(cx, cy + 48 - flicker, cx + 26, cy + 72);
    ctx.closePath();
    ctx.fill();
  }
}
