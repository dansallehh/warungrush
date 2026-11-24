import {
  MAX_UPGRADE_LEVEL,
  UPGRADE_CATALOG,
} from '../core/ProgressStore';
import type {
  CustomerArchetype,
  CustomerOrder,
  DishType,
  FlyingDish,
  GameSnapshot,
  KualiSlot,
  Particle,
  ProgressData,
  ServingPlateSlot,
  UpgradeKey,
} from '../types/game';
import { CUSTOMER_SLOT_RECTS, type Rect } from '../entities/CustomerQueue';
import {
  DOCK_RECTS,
  KUALI_RECT,
  KUALI_SLOT_RECTS,
  PLATE_SLOT_RECTS,
  PLATES_RECT,
  PREP_BOARD_RECT,
  TEH_TARIK_RECT,
  TEH_TRAY_RECT,
  type DockButtonId,
} from '../entities/Stations';

export const VIRTUAL_WIDTH = 960;
export const VIRTUAL_HEIGHT = 540;

// Top HUD buttons (Cooking Crush glossy circular buttons)
export const HUD_PAUSE_RECT: Rect = { x: 894, y: 8, w: 48, h: 48 };
export const HUD_MUTE_RECT: Rect = { x: 838, y: 8, w: 48, h: 48 };
export const HUD_FULLSCREEN_RECT: Rect = { x: 782, y: 8, w: 48, h: 48 };

// Title screen buttons
export const TITLE_PLAY_RECT: Rect = { x: 310, y: 368, w: 220, h: 64 };
export const TITLE_SHOP_RECT: Rect = { x: 546, y: 368, w: 150, h: 64 };

// Overlay buttons (Paused / Shift Summary / Game Over)
export const OVERLAY_PRIMARY_RECT: Rect = { x: 280, y: 360, w: 190, h: 56 };
export const OVERLAY_SHOP_RECT: Rect = { x: 490, y: 360, w: 190, h: 56 };
export const OVERLAY_SECONDARY_RECT: Rect = { x: 385, y: 428, w: 190, h: 44 };

// Shop screen layout (3x2 upgrade cards + bottom navigation)
export const SHOP_CARD_RECTS: readonly Rect[] = [
  { x: 46, y: 96, w: 278, h: 162 },
  { x: 341, y: 96, w: 278, h: 162 },
  { x: 636, y: 96, w: 278, h: 162 },
  { x: 46, y: 274, w: 278, h: 162 },
  { x: 341, y: 274, w: 278, h: 162 },
  { x: 636, y: 274, w: 278, h: 162 },
];
export const SHOP_BACK_RECT: Rect = { x: 250, y: 460, w: 210, h: 56 };
export const SHOP_PLAY_RECT: Rect = { x: 490, y: 460, w: 220, h: 56 };

const FONT_SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const DOCK_META: Readonly<
  Record<DockButtonId, { label: string; top: string; bottom: string; rim: string; accent: string }>
> = {
  DOUGH: { label: 'DOUGH', top: '#FEF3C7', bottom: '#D97706', rim: '#78350F', accent: '#FFFBEB' },
  PATTY: { label: 'PATTY', top: '#FCA5A5', bottom: '#B91C1C', rim: '#5C1111', accent: '#FEE2E2' },
  EGG: { label: 'EGG', top: '#FEF08A', bottom: '#CA8A04', rim: '#713F12', accent: '#FEFCE8' },
  VEG: { label: 'VEG', top: '#86EFAC', bottom: '#15803D', rim: '#14532D', accent: '#DCFCE7' },
  SAUCE: { label: 'SAUCE', top: '#FDBA74', bottom: '#C2410C', rim: '#7C2D12', accent: '#FFEDD5' },
  WRAPPER: { label: 'WRAP', top: '#7DD3FC', bottom: '#0369A1', rim: '#0C4A6E', accent: '#E0F2FE' },
  TRASH: { label: 'TRASH', top: '#CBD5E1', bottom: '#475569', rim: '#1E293B', accent: '#F1F5F9' },
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

function drawGlossyButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  topColor: string,
  bottomColor: string,
  rimColor: string,
  depth = 5
): void {
  // Drop shadow
  ctx.save();
  ctx.fillStyle = 'rgba(20, 12, 6, 0.35)';
  drawRoundedRect(ctx, x, y + depth + 2, w, h, r);
  ctx.fill();

  // 3D bottom extruded rim
  ctx.fillStyle = rimColor;
  drawRoundedRect(ctx, x, y + depth, w, h, r);
  ctx.fill();

  // Main glossy body
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, topColor);
  grad.addColorStop(1, bottomColor);
  ctx.fillStyle = grad;
  drawRoundedRect(ctx, x, y, w, h, r);
  ctx.fill();

  // Crisp outer stroke
  ctx.strokeStyle = rimColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Glossy top specular shine
  ctx.save();
  drawRoundedRect(ctx, x + 3, y + 3, w - 6, h * 0.44, Math.max(4, r - 3));
  const shine = ctx.createLinearGradient(x, y + 3, x, y + h * 0.48);
  shine.addColorStop(0, 'rgba(255, 255, 255, 0.52)');
  shine.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
  ctx.fillStyle = shine;
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

export class ProceduralArt {
  private time = 0;

  public tick(dt: number): void {
    this.time += dt;
  }

  public renderTitle(
    ctx: CanvasRenderingContext2D,
    progress: ProgressData,
    muted: boolean
  ): void {
    this.renderTropicalBackdrop(ctx);
    this.renderPerspectiveCounter(ctx, 1);

    // Warm dark vignette over counter to highlight title card
    const vig = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
    vig.addColorStop(0, 'rgba(15, 23, 42, 0.25)');
    vig.addColorStop(0.55, 'rgba(28, 16, 8, 0.55)');
    vig.addColorStop(1, 'rgba(20, 10, 4, 0.82)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    // Top-right HUD icons
    this.renderCircleHudBtn(ctx, HUD_MUTE_RECT, muted ? 'MUTE' : 'SOUND');
    this.renderCircleHudBtn(ctx, HUD_FULLSCREEN_RECT, 'FULL');

    // Wallet badge top-left
    this.renderWalletPill(ctx, 20, 12, progress.walletRM, progress.highestShift);

    // Center 3D wooden signboard
    const bx = 180;
    const by = 82;
    const bw = 600;
    const bh = 250;
    drawGlossyButton(ctx, bx, by, bw, bh, 28, '#FFF7ED', '#FED7AA', '#7C2D12', 8);

    // Inner recessed wood plaque
    drawRoundedRect(ctx, bx + 14, by + 14, bw - 28, bh - 28, 20);
    const plaqueGrad = ctx.createLinearGradient(bx, by + 14, bx, by + bh - 14);
    plaqueGrad.addColorStop(0, '#451A03');
    plaqueGrad.addColorStop(1, '#271005');
    ctx.fillStyle = plaqueGrad;
    ctx.fill();

    // Decorative food emblems flanking title
    this.drawDish3D(ctx, 'ROTI_CANAI', bx + 92, by + 135, 1.35);
    this.drawDish3D(ctx, 'BURGER_RAMLY', bx + bw - 92, by + 135, 1.35);

    // Title text with 3D extruded shadow
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#78350F';
    ctx.font = `900 56px ${FONT_SANS}`;
    ctx.fillText('WARUNG RUSH', VIRTUAL_WIDTH * 0.5, by + 98 + 4);
    const titleGrad = ctx.createLinearGradient(0, by + 68, 0, by + 125);
    titleGrad.addColorStop(0, '#FEF08A');
    titleGrad.addColorStop(0.5, '#F59E0B');
    titleGrad.addColorStop(1, '#EA580C');
    ctx.fillStyle = titleGrad;
    ctx.fillText('WARUNG RUSH', VIRTUAL_WIDTH * 0.5, by + 98);

    // v2.0 pill
    drawGlossyButton(ctx, VIRTUAL_WIDTH * 0.5 - 58, by + 142, 116, 28, 14, '#38BDF8', '#0284C7', '#0C4A6E', 3);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 13px ${FONT_SANS}`;
    ctx.fillText('VERSION 2.0', VIRTUAL_WIDTH * 0.5, by + 156);

    ctx.fillStyle = '#FDE68A';
    ctx.font = `700 15px ${FONT_SANS}`;
    ctx.fillText('TROPICAL WARUNG KITCHEN SPRINT', VIRTUAL_WIDTH * 0.5, by + 196);

    // Play & Shop glossy buttons
    const pulse = 1 + Math.sin(this.time * 3.6) * 0.018;
    ctx.save();
    ctx.translate(
      TITLE_PLAY_RECT.x + TITLE_PLAY_RECT.w * 0.5,
      TITLE_PLAY_RECT.y + TITLE_PLAY_RECT.h * 0.5
    );
    ctx.scale(pulse, pulse);
    drawGlossyButton(
      ctx,
      -TITLE_PLAY_RECT.w * 0.5,
      -TITLE_PLAY_RECT.h * 0.5,
      TITLE_PLAY_RECT.w,
      TITLE_PLAY_RECT.h,
      18,
      '#4ADE80',
      '#16A34A',
      '#14532D',
      6
    );
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 22px ${FONT_SANS}`;
    ctx.fillText(`PLAY SHIFT ${progress.highestShift}`, 0, 1);
    ctx.restore();

    drawGlossyButton(
      ctx,
      TITLE_SHOP_RECT.x,
      TITLE_SHOP_RECT.y,
      TITLE_SHOP_RECT.w,
      TITLE_SHOP_RECT.h,
      18,
      '#FBBF24',
      '#D97706',
      '#78350F',
      6
    );
    ctx.fillStyle = '#451A03';
    ctx.font = `900 18px ${FONT_SANS}`;
    ctx.fillText(
      'SHOP',
      TITLE_SHOP_RECT.x + TITLE_SHOP_RECT.w * 0.5,
      TITLE_SHOP_RECT.y + TITLE_SHOP_RECT.h * 0.5 + 1
    );

    // Gesture hint footer
    ctx.fillStyle = '#FDE68A';
    ctx.font = `700 13px ${FONT_SANS}`;
    ctx.fillText(
      'Swipe to stretch, chop & flip  ·  Hold to tarik  ·  Upgrade your warung in the Shop!',
      VIRTUAL_WIDTH * 0.5,
      476
    );
  }

  public renderShop(
    ctx: CanvasRenderingContext2D,
    progress: ProgressData,
    nextShift: number
  ): void {
    this.renderTropicalBackdrop(ctx);

    ctx.fillStyle = 'rgba(20, 14, 10, 0.72)';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    // Header banner
    drawGlossyButton(ctx, 46, 16, 868, 62, 20, '#FDBA74', '#EA580C', '#7C2D12', 5);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 26px ${FONT_SANS}`;
    ctx.fillText('KITCHEN UPGRADE SHOP', 72, 47);

    // Wallet pill on right of header
    drawGlossyButton(ctx, 710, 26, 184, 42, 14, '#FEF08A', '#EAB308', '#713F12', 3);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#451A03';
    ctx.font = `900 20px ${FONT_SANS}`;
    ctx.fillText(`RM ${progress.walletRM}`, 802, 47);

    // 6 Upgrade cards
    UPGRADE_CATALOG.forEach((def, idx) => {
      const r = SHOP_CARD_RECTS[idx]!;
      const level = progress.upgrades[def.key];
      const isMax = level >= MAX_UPGRADE_LEVEL;
      const cost = isMax ? null : def.costs[level - 1] ?? null;
      const canAfford = cost !== null && progress.walletRM >= cost;

      drawGlossyButton(ctx, r.x, r.y, r.w, r.h, 18, '#FFFBEB', '#FDE68A', '#78350F', 5);

      // Accent header strip
      drawRoundedRect(ctx, r.x + 8, r.y + 8, r.w - 16, 36, 10);
      ctx.fillStyle = def.accent;
      ctx.fill();

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `900 15px ${FONT_SANS}`;
      ctx.fillText(def.name, r.x + 20, r.y + 26);

      // Level pips
      for (let p = 0; p < MAX_UPGRADE_LEVEL; p++) {
        const px = r.x + r.w - 58 + p * 18;
        const py = r.y + 26;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fillStyle = p < level ? '#FEF08A' : 'rgba(0,0,0,0.3)';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Description & current/next stat
      ctx.fillStyle = '#78350F';
      ctx.font = `700 12px ${FONT_SANS}`;
      ctx.fillText(def.shortDesc, r.x + 16, r.y + 62);

      const currentLabel = def.levelLabels[level - 1] ?? '';
      const nextLabel = !isMax ? def.levelLabels[level] ?? '' : 'MAX LEVEL';

      ctx.fillStyle = '#451A03';
      ctx.font = `800 13px ${FONT_SANS}`;
      ctx.fillText(`Now: ${currentLabel}`, r.x + 16, r.y + 84);

      if (!isMax) {
        ctx.fillStyle = '#15803D';
        ctx.font = `800 12px ${FONT_SANS}`;
        ctx.fillText(`Next: ${nextLabel}`, r.x + 16, r.y + 102);
      }

      // Buy button inside card
      const bx = r.x + 16;
      const by = r.y + 114;
      const bw = r.w - 32;
      const bh = 36;
      if (isMax) {
        drawGlossyButton(ctx, bx, by, bw, bh, 11, '#CBD5E1', '#94A3B8', '#475569', 3);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#334155';
        ctx.font = `900 14px ${FONT_SANS}`;
        ctx.fillText('MAXED OUT', bx + bw * 0.5, by + bh * 0.5 + 1);
      } else {
        drawGlossyButton(
          ctx,
          bx,
          by,
          bw,
          bh,
          11,
          canAfford ? '#4ADE80' : '#E2E8F0',
          canAfford ? '#16A34A' : '#94A3B8',
          canAfford ? '#14532D' : '#475569',
          3
        );
        ctx.textAlign = 'center';
        ctx.fillStyle = canAfford ? '#FFFFFF' : '#475569';
        ctx.font = `900 14px ${FONT_SANS}`;
        ctx.fillText(`UPGRADE · RM ${cost}`, bx + bw * 0.5, by + bh * 0.5 + 1);
      }
    });

    // Bottom navigation buttons
    drawGlossyButton(
      ctx,
      SHOP_BACK_RECT.x,
      SHOP_BACK_RECT.y,
      SHOP_BACK_RECT.w,
      SHOP_BACK_RECT.h,
      16,
      '#E2E8F0',
      '#94A3B8',
      '#334155',
      5
    );
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1E293B';
    ctx.font = `900 17px ${FONT_SANS}`;
    ctx.fillText(
      'BACK TO TITLE',
      SHOP_BACK_RECT.x + SHOP_BACK_RECT.w * 0.5,
      SHOP_BACK_RECT.y + SHOP_BACK_RECT.h * 0.5 + 1
    );

    drawGlossyButton(
      ctx,
      SHOP_PLAY_RECT.x,
      SHOP_PLAY_RECT.y,
      SHOP_PLAY_RECT.w,
      SHOP_PLAY_RECT.h,
      16,
      '#4ADE80',
      '#16A34A',
      '#14532D',
      5
    );
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 18px ${FONT_SANS}`;
    ctx.fillText(
      `START SHIFT ${nextShift}`,
      SHOP_PLAY_RECT.x + SHOP_PLAY_RECT.w * 0.5,
      SHOP_PLAY_RECT.y + SHOP_PLAY_RECT.h * 0.5 + 1
    );
  }

  public getShopCardAt(x: number, y: number): UpgradeKey | null {
    for (let i = 0; i < SHOP_CARD_RECTS.length; i++) {
      const r = SHOP_CARD_RECTS[i]!;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        return UPGRADE_CATALOG[i]!.key;
      }
    }
    return null;
  }

  public renderShiftIntro(
    ctx: CanvasRenderingContext2D,
    shift: number,
    targetRM: number
  ): void {
    this.renderTropicalBackdrop(ctx);
    this.renderPerspectiveCounter(ctx, 1);

    ctx.fillStyle = 'rgba(20, 12, 6, 0.6)';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    drawGlossyButton(ctx, 240, 145, 480, 240, 26, '#FFF7ED', '#FED7AA', '#7C2D12', 7);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#EA580C';
    ctx.font = `900 16px ${FONT_SANS}`;
    ctx.fillText('GET READY TO COOK!', VIRTUAL_WIDTH * 0.5, 188);

    ctx.fillStyle = '#451A03';
    ctx.font = `900 54px ${FONT_SANS}`;
    ctx.fillText(`SHIFT ${shift}`, VIRTUAL_WIDTH * 0.5, 244);

    drawGlossyButton(ctx, 355, 286, 250, 44, 14, '#FEF08A', '#EAB308', '#713F12', 3);
    ctx.fillStyle = '#451A03';
    ctx.font = `900 20px ${FONT_SANS}`;
    ctx.fillText(`TARGET: RM ${targetRM}`, VIRTUAL_WIDTH * 0.5, 308);

    const menuText =
      shift === 1
        ? 'Menu: Roti Canai · Teh Tarik'
        : shift === 2
          ? 'NEW! Burger Ramly Unlocked!'
          : 'NEW! Roti Telur Unlocked! (Cooked Egg + Plated Roti)';
    ctx.fillStyle = '#9A3412';
    ctx.font = `800 13px ${FONT_SANS}`;
    ctx.fillText(menuText, VIRTUAL_WIDTH * 0.5, 356);
  }

  public renderGameplay(
    ctx: CanvasRenderingContext2D,
    snap: GameSnapshot,
    muted: boolean
  ): void {
    ctx.save();
    if (snap.screenShake > 0.01) {
      const mag = snap.screenShake * 10;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }

    // 1. Tropical coastal warung backdrop
    this.renderTropicalBackdrop(ctx);

    // 2. Customers behind the wooden counter ledge
    this.renderCustomerRail(ctx, snap);

    // 3. 3D Perspective stainless-steel & oak kitchen counter
    this.renderPerspectiveCounter(ctx, snap.upgrades.decorLevel);

    // 4. Kitchen stations in 2.5D
    this.renderTehTarikStation(ctx, snap);
    this.renderKualiStation(ctx, snap);
    this.renderPlatesStation(ctx, snap);
    this.renderPrepBoardStation(ctx, snap);

    // 5. Bottom stainless-steel ingredient dock
    this.renderBottomDock(ctx, snap);

    // 6. Flying dishes & active drag ghost
    this.renderFlyingDishes(ctx, snap.flyingDishes);
    if (snap.activeDrag) {
      this.renderActiveDrag(ctx, snap.activeDrag);
    }

    // 7. Particles & popups
    this.renderParticles(ctx, snap.particles);
    this.renderPopups(ctx, snap.popups);

    // 8. Fever mode golden shimmer border
    if (snap.isFever) {
      const pulse = 0.45 + Math.sin(this.time * 8) * 0.25;
      ctx.strokeStyle = `rgba(250, 204, 21, ${pulse})`;
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, VIRTUAL_WIDTH - 8, VIRTUAL_HEIGHT - 8);
    }

    // 9. Top Cooking Crush glossy HUD
    this.renderTopHud(ctx, snap, muted);

    ctx.restore();
  }

  public renderPausedOverlay(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    drawGlossyButton(ctx, 250, 120, 460, 368, 26, '#FFF7ED', '#FED7AA', '#7C2D12', 7);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#451A03';
    ctx.font = `900 38px ${FONT_SANS}`;
    ctx.fillText('PAUSED', VIRTUAL_WIDTH * 0.5, 194);

    ctx.fillStyle = '#9A3412';
    ctx.font = `700 15px ${FONT_SANS}`;
    ctx.fillText('Your kuali is on low heat. Ready to jump back in?', VIRTUAL_WIDTH * 0.5, 244);

    drawGlossyButton(ctx, 320, 290, 320, 56, 16, '#4ADE80', '#16A34A', '#14532D', 5);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 20px ${FONT_SANS}`;
    ctx.fillText('RESUME SHIFT', VIRTUAL_WIDTH * 0.5, 319);

    drawGlossyButton(ctx, 355, 370, 250, 48, 14, '#E2E8F0', '#94A3B8', '#334155', 4);
    ctx.fillStyle = '#1E293B';
    ctx.font = `900 16px ${FONT_SANS}`;
    ctx.fillText('QUIT TO TITLE', VIRTUAL_WIDTH * 0.5, 395);
  }

  public renderShiftSummary(
    ctx: CanvasRenderingContext2D,
    snap: GameSnapshot,
    servedCount: number,
    missedCount: number
  ): void {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    drawGlossyButton(ctx, 210, 58, 540, 434, 28, '#FFF7ED', '#FED7AA', '#7C2D12', 7);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#15803D';
    ctx.font = `900 34px ${FONT_SANS}`;
    ctx.fillText(`SHIFT ${snap.shift} COMPLETE!`, VIRTUAL_WIDTH * 0.5, 108);

    // 3 big 3D stars
    for (let i = 0; i < 3; i++) {
      const sx = VIRTUAL_WIDTH * 0.5 + (i - 1) * 66;
      const sy = 166;
      const lit = i < snap.starsEarned;
      this.drawStar(ctx, sx, sy, 24, lit ? '#FACC15' : '#CBD5E1', lit ? '#B45309' : '#64748B');
    }

    // Stats card
    drawRoundedRect(ctx, 260, 206, 440, 134, 16);
    ctx.fillStyle = 'rgba(120, 53, 15, 0.1)';
    ctx.fill();

    ctx.fillStyle = '#15803D';
    ctx.font = `900 32px ${FONT_SANS}`;
    ctx.fillText(`+RM ${snap.cashRM} EARNED`, VIRTUAL_WIDTH * 0.5, 242);

    ctx.fillStyle = '#78350F';
    ctx.font = `800 15px ${FONT_SANS}`;
    ctx.fillText(
      `Target: RM ${snap.targetRM}   ·   Orders Served: ${servedCount}   ·   Missed: ${missedCount}`,
      VIRTUAL_WIDTH * 0.5,
      284
    );
    ctx.fillStyle = '#B45309';
    ctx.font = `900 15px ${FONT_SANS}`;
    ctx.fillText(`Total Wallet: RM ${snap.walletRM}`, VIRTUAL_WIDTH * 0.5, 316);

    // Next Shift & Upgrade Shop buttons
    drawGlossyButton(
      ctx,
      OVERLAY_PRIMARY_RECT.x,
      OVERLAY_PRIMARY_RECT.y,
      OVERLAY_PRIMARY_RECT.w,
      OVERLAY_PRIMARY_RECT.h,
      16,
      '#4ADE80',
      '#16A34A',
      '#14532D',
      5
    );
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 17px ${FONT_SANS}`;
    ctx.fillText(
      `SHIFT ${snap.shift + 1} →`,
      OVERLAY_PRIMARY_RECT.x + OVERLAY_PRIMARY_RECT.w * 0.5,
      OVERLAY_PRIMARY_RECT.y + OVERLAY_PRIMARY_RECT.h * 0.5 + 1
    );

    drawGlossyButton(
      ctx,
      OVERLAY_SHOP_RECT.x,
      OVERLAY_SHOP_RECT.y,
      OVERLAY_SHOP_RECT.w,
      OVERLAY_SHOP_RECT.h,
      16,
      '#FBBF24',
      '#D97706',
      '#78350F',
      5
    );
    ctx.fillStyle = '#451A03';
    ctx.font = `900 17px ${FONT_SANS}`;
    ctx.fillText(
      'UPGRADE SHOP',
      OVERLAY_SHOP_RECT.x + OVERLAY_SHOP_RECT.w * 0.5,
      OVERLAY_SHOP_RECT.y + OVERLAY_SHOP_RECT.h * 0.5 + 1
    );

    drawGlossyButton(
      ctx,
      OVERLAY_SECONDARY_RECT.x,
      OVERLAY_SECONDARY_RECT.y,
      OVERLAY_SECONDARY_RECT.w,
      OVERLAY_SECONDARY_RECT.h,
      12,
      '#E2E8F0',
      '#94A3B8',
      '#334155',
      4
    );
    ctx.fillStyle = '#1E293B';
    ctx.font = `800 14px ${FONT_SANS}`;
    ctx.fillText(
      'MAIN MENU',
      OVERLAY_SECONDARY_RECT.x + OVERLAY_SECONDARY_RECT.w * 0.5,
      OVERLAY_SECONDARY_RECT.y + OVERLAY_SECONDARY_RECT.h * 0.5 + 1
    );
  }

  public renderGameOver(
    ctx: CanvasRenderingContext2D,
    snap: GameSnapshot,
    servedCount: number
  ): void {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.74)';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    drawGlossyButton(ctx, 210, 68, 540, 420, 28, '#FFF7ED', '#FED7AA', '#7C2D12', 7);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#DC2626';
    ctx.font = `900 36px ${FONT_SANS}`;
    ctx.fillText('TIME IS UP!', VIRTUAL_WIDTH * 0.5, 122);

    ctx.fillStyle = '#78350F';
    ctx.font = `800 16px ${FONT_SANS}`;
    ctx.fillText(
      `Shift ${snap.shift} Target: RM ${snap.targetRM} · You earned RM ${snap.cashRM}`,
      VIRTUAL_WIDTH * 0.5,
      172
    );

    ctx.fillStyle = '#15803D';
    ctx.font = `800 15px ${FONT_SANS}`;
    ctx.fillText(
      `You kept +RM ${snap.cashRM}! Visit the Shop to upgrade your kitchen!`,
      VIRTUAL_WIDTH * 0.5,
      212
    );

    ctx.fillStyle = '#451A03';
    ctx.font = `900 18px ${FONT_SANS}`;
    ctx.fillText(
      `Orders Served: ${servedCount}   ·   Wallet: RM ${snap.walletRM}`,
      VIRTUAL_WIDTH * 0.5,
      268
    );

    drawGlossyButton(
      ctx,
      OVERLAY_PRIMARY_RECT.x,
      OVERLAY_PRIMARY_RECT.y,
      OVERLAY_PRIMARY_RECT.w,
      OVERLAY_PRIMARY_RECT.h,
      16,
      '#4ADE80',
      '#16A34A',
      '#14532D',
      5
    );
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 17px ${FONT_SANS}`;
    ctx.fillText(
      `RETRY SHIFT ${snap.shift}`,
      OVERLAY_PRIMARY_RECT.x + OVERLAY_PRIMARY_RECT.w * 0.5,
      OVERLAY_PRIMARY_RECT.y + OVERLAY_PRIMARY_RECT.h * 0.5 + 1
    );

    drawGlossyButton(
      ctx,
      OVERLAY_SHOP_RECT.x,
      OVERLAY_SHOP_RECT.y,
      OVERLAY_SHOP_RECT.w,
      OVERLAY_SHOP_RECT.h,
      16,
      '#FBBF24',
      '#D97706',
      '#78350F',
      5
    );
    ctx.fillStyle = '#451A03';
    ctx.font = `900 17px ${FONT_SANS}`;
    ctx.fillText(
      'UPGRADE SHOP',
      OVERLAY_SHOP_RECT.x + OVERLAY_SHOP_RECT.w * 0.5,
      OVERLAY_SHOP_RECT.y + OVERLAY_SHOP_RECT.h * 0.5 + 1
    );

    drawGlossyButton(
      ctx,
      OVERLAY_SECONDARY_RECT.x,
      OVERLAY_SECONDARY_RECT.y,
      OVERLAY_SECONDARY_RECT.w,
      OVERLAY_SECONDARY_RECT.h,
      12,
      '#E2E8F0',
      '#94A3B8',
      '#334155',
      4
    );
    ctx.fillStyle = '#1E293B';
    ctx.font = `800 14px ${FONT_SANS}`;
    ctx.fillText(
      'MAIN MENU',
      OVERLAY_SECONDARY_RECT.x + OVERLAY_SECONDARY_RECT.w * 0.5,
      OVERLAY_SECONDARY_RECT.y + OVERLAY_SECONDARY_RECT.h * 0.5 + 1
    );
  }

  public renderToast(
    ctx: CanvasRenderingContext2D,
    text: string,
    alpha: number
  ): void {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.font = `800 14px ${FONT_SANS}`;
    const width = Math.min(VIRTUAL_WIDTH - 40, ctx.measureText(text).width + 44);
    const x = (VIRTUAL_WIDTH - width) * 0.5;
    const y = VIRTUAL_HEIGHT - 74;
    drawGlossyButton(ctx, x, y, width, 38, 19, '#FEF3C7', '#F59E0B', '#78350F', 3);
    ctx.fillStyle = '#451A03';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, VIRTUAL_WIDTH * 0.5, y + 19);
    ctx.restore();
  }

  public renderRotateHint(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    drawGlossyButton(ctx, 210, 170, 540, 200, 24, '#FFF7ED', '#FED7AA', '#7C2D12', 6);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#451A03';
    ctx.font = `900 30px ${FONT_SANS}`;
    ctx.fillText('ROTATE TO LANDSCAPE', VIRTUAL_WIDTH * 0.5, 246);
    ctx.fillStyle = '#9A3412';
    ctx.font = `700 16px ${FONT_SANS}`;
    ctx.fillText(
      'Warung Rush v2.0 is built for a wide Cooking Crush counter!',
      VIRTUAL_WIDTH * 0.5,
      298
    );
    ctx.restore();
  }

  // ==================== 2.5D SCENE & ENVIRONMENT ====================

  private renderTropicalBackdrop(ctx: CanvasRenderingContext2D): void {
    // Bright tropical coastal sky gradient (Cooking Crush beachside warung!)
    const sky = ctx.createLinearGradient(0, 0, 0, 145);
    sky.addColorStop(0, '#38BDF8');
    sky.addColorStop(0.55, '#BAE6FD');
    sky.addColorStop(1, '#FEF3C7');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, 145);

    // Distant lush tropical hills
    ctx.fillStyle = '#34D399';
    ctx.beginPath();
    ctx.moveTo(0, 128);
    ctx.quadraticCurveTo(130, 52, 290, 118);
    ctx.quadraticCurveTo(480, 134, 670, 112);
    ctx.quadraticCurveTo(820, 48, VIRTUAL_WIDTH, 118);
    ctx.lineTo(VIRTUAL_WIDTH, 145);
    ctx.lineTo(0, 145);
    ctx.closePath();
    ctx.fill();

    // Turquoise ocean strip
    const sea = ctx.createLinearGradient(0, 116, 0, 152);
    sea.addColorStop(0, '#06B6D4');
    sea.addColorStop(1, '#67E8F9');
    ctx.fillStyle = sea;
    ctx.fillRect(0, 116, VIRTUAL_WIDTH, 36);

    // Warm sandy beach & wooden warung boardwalk
    const sand = ctx.createLinearGradient(0, 152, 0, 224);
    sand.addColorStop(0, '#FDE68A');
    sand.addColorStop(0.5, '#FCD34D');
    sand.addColorStop(1, '#D97706');
    ctx.fillStyle = sand;
    ctx.fillRect(0, 152, VIRTUAL_WIDTH, 74);

    // Wooden boardwalk perspective planks
    ctx.fillStyle = '#B45309';
    ctx.fillRect(0, 188, VIRTUAL_WIDTH, 38);
    ctx.strokeStyle = 'rgba(254, 243, 199, 0.28)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 16; i++) {
      const topX = 60 + i * 56;
      const botX = topX + (topX - VIRTUAL_WIDTH * 0.5) * 0.25;
      ctx.beginPath();
      ctx.moveTo(topX, 188);
      ctx.lineTo(botX, 226);
      ctx.stroke();
    }

    // Beach parasols in the distance
    this.drawParasol(ctx, 132, 132, 46, '#FFFBEB', '#F97316');
    this.drawParasol(ctx, 826, 132, 46, '#FFFBEB', '#0EA5E9');

    // Lush palm fronds framing top-left and top-right corners
    this.drawPalmFronds(ctx, 0, 0, 1);
    this.drawPalmFronds(ctx, VIRTUAL_WIDTH, 0, -1);
  }

  private drawParasol(
    ctx: CanvasRenderingContext2D,
    cx: number,
    y: number,
    radius: number,
    c1: string,
    c2: string
  ): void {
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(cx, y + 54);
    ctx.stroke();

    ctx.fillStyle = c1;
    ctx.beginPath();
    ctx.ellipse(cx, y, radius, 16, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.ellipse(cx, y, radius * 0.45, 16, 0, Math.PI, 0);
    ctx.fill();
  }

  private drawPalmFronds(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    dir: 1 | -1
  ): void {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(dir, 1);
    const sway = Math.sin(this.time * 1.4 + (dir > 0 ? 0 : 1.5)) * 0.03;
    ctx.rotate(sway);

    const fronds = [
      { angle: 0.22, len: 165, color: '#15803D' },
      { angle: 0.48, len: 148, color: '#16A34A' },
      { angle: 0.78, len: 120, color: '#22C55E' },
    ];
    for (const f of fronds) {
      ctx.save();
      ctx.rotate(f.angle);
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(f.len * 0.5, -24, f.len, 6);
      ctx.quadraticCurveTo(f.len * 0.5, 18, 0, 0);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  private renderPerspectiveCounter(
    ctx: CanvasRenderingContext2D,
    decorLevel: number
  ): void {
    // 1. Warm oak serving counter ledge separating customers & kitchen
    const ledgeGrad = ctx.createLinearGradient(0, 214, 0, 232);
    ledgeGrad.addColorStop(0, '#F59E0B');
    ledgeGrad.addColorStop(0.35, '#B45309');
    ledgeGrad.addColorStop(1, '#5C2607');
    ctx.fillStyle = ledgeGrad;
    ctx.fillRect(0, 214, VIRTUAL_WIDTH, 18);

    // Subtle specular wood highlight along top lip
    ctx.fillStyle = 'rgba(255, 251, 235, 0.45)';
    ctx.fillRect(0, 214, VIRTUAL_WIDTH, 3);

    // 2. Main stainless-steel kitchen countertop in 2.5D perspective
    const counterGrad = ctx.createLinearGradient(0, 230, 0, VIRTUAL_HEIGHT);
    counterGrad.addColorStop(0, '#E2E8F0');
    counterGrad.addColorStop(0.25, '#CBD5E1');
    counterGrad.addColorStop(0.75, '#94A3B8');
    counterGrad.addColorStop(1, '#475569');
    ctx.fillStyle = counterGrad;
    ctx.fillRect(0, 230, VIRTUAL_WIDTH, VIRTUAL_HEIGHT - 230);

    // Brushed steel perspective reflection sheen
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.beginPath();
    ctx.moveTo(140, 230);
    ctx.lineTo(360, 230);
    ctx.lineTo(290, 446);
    ctx.lineTo(60, 446);
    ctx.closePath();
    ctx.fill();

    // Left & Right chrome tubular counter rails (like Cooking Crush!)
    this.drawChromeRail(ctx, 4, 234, 9, 206);
    this.drawChromeRail(ctx, VIRTUAL_WIDTH - 13, 234, 9, 206);

    // Recessed stainless-steel bottom ingredient tray trough
    const troughGrad = ctx.createLinearGradient(0, 446, 0, VIRTUAL_HEIGHT);
    troughGrad.addColorStop(0, '#334155');
    troughGrad.addColorStop(0.2, '#475569');
    troughGrad.addColorStop(1, '#1E293B');
    ctx.fillStyle = troughGrad;
    ctx.fillRect(0, 446, VIRTUAL_WIDTH, VIRTUAL_HEIGHT - 446);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(0, 446, VIRTUAL_WIDTH, 2);

    // Festive fairy lights along the counter rim when Warung Decor upgraded (Lv2+)
    if (decorLevel >= 2) {
      const count = decorLevel >= 3 ? 16 : 10;
      for (let i = 0; i < count; i++) {
        const lx = 34 + (i / (count - 1)) * (VIRTUAL_WIDTH - 68);
        const ly = 224 + Math.sin(i * 0.9) * 2;
        const glow = 0.65 + Math.sin(this.time * 4 + i) * 0.35;
        ctx.fillStyle =
          i % 2 === 0
            ? `rgba(250, 204, 21, ${glow})`
            : `rgba(244, 114, 182, ${glow})`;
        ctx.beginPath();
        ctx.arc(lx, ly, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawChromeRail(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, '#64748B');
    grad.addColorStop(0.35, '#F8FAFC');
    grad.addColorStop(0.7, '#94A3B8');
    grad.addColorStop(1, '#334155');
    ctx.fillStyle = grad;
    drawRoundedRect(ctx, x, y, w, h, 4);
    ctx.fill();
  }

  // ==================== TOP COOKING CRUSH HUD ====================

  private renderTopHud(
    ctx: CanvasRenderingContext2D,
    snap: GameSnapshot,
    muted: boolean
  ): void {
    // Left badge: Shift & Combo
    drawGlossyButton(ctx, 16, 8, 176, 46, 22, '#FDBA74', '#EA580C', '#7C2D12', 4);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 15px ${FONT_SANS}`;
    ctx.fillText(`SHIFT ${snap.shift}`, 68, 31);

    if (snap.combo >= 2) {
      drawGlossyButton(
        ctx,
        118,
        14,
        66,
        32,
        12,
        snap.isFever ? '#FEF08A' : '#FDE68A',
        snap.isFever ? '#EAB308' : '#F59E0B',
        '#78350F',
        2
      );
      ctx.fillStyle = '#451A03';
      ctx.font = `900 14px ${FONT_SANS}`;
      ctx.fillText(snap.isFever ? `🔥x${snap.combo}` : `x${snap.combo}`, 151, 30);
    }

    // Center Cooking Crush Golden Progress Pill (Cash + Stars + Timer)
    const px = 228;
    const py = 6;
    const pw = 504;
    const ph = 50;
    drawGlossyButton(ctx, px, py, pw, ph, 24, '#FDE047', '#F59E0B', '#78350F', 5);

    // Coin progress bar inside pill
    const barX = px + 18;
    const barY = py + 11;
    const barW = 248;
    const barH = 26;
    drawRoundedRect(ctx, barX, barY, barW, barH, 13);
    ctx.fillStyle = '#78350F';
    ctx.fill();

    const ratio = Math.min(1, snap.cashRM / Math.max(1, snap.targetRM * 1.65));
    const fillW = Math.max(18, barW * ratio);
    const barGrad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
    barGrad.addColorStop(0, '#86EFAC');
    barGrad.addColorStop(1, '#16A34A');
    ctx.fillStyle = barGrad;
    drawRoundedRect(ctx, barX + 2, barY + 2, Math.min(barW - 4, fillW), barH - 4, 11);
    ctx.fill();

    // Target marker tick on progress bar
    const targetX = barX + barW * (1 / 1.65);
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(targetX, barY + 2, 2.5, barH - 4);

    // Cash text over bar
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 14px ${FONT_SANS}`;
    ctx.fillText(`RM ${snap.cashRM} / ${snap.targetRM}`, barX + barW * 0.5, barY + barH * 0.5 + 1);

    // 3 mini star indicators
    for (let i = 0; i < 3; i++) {
      const sx = px + 292 + i * 26;
      const sy = py + 24;
      const lit = i < snap.starsEarned;
      this.drawStar(ctx, sx, sy, 10, lit ? '#FEF08A' : '#92400E', '#451A03');
    }

    // Hourglass Timer pill
    const urgent = snap.shiftTimeLeft <= 15;
    drawGlossyButton(
      ctx,
      px + 378,
      py + 8,
      110,
      32,
      14,
      urgent ? '#FCA5A5' : '#FFFBEB',
      urgent ? '#EF4444' : '#FDE68A',
      '#78350F',
      2
    );
    ctx.fillStyle = urgent ? '#FFFFFF' : '#451A03';
    ctx.font = `900 16px ${FONT_SANS}`;
    const secs = Math.ceil(snap.shiftTimeLeft);
    ctx.fillText(`⏱ ${secs}s`, px + 433, py + 25);

    // Top-right circular glossy buttons
    this.renderCircleHudBtn(ctx, HUD_FULLSCREEN_RECT, 'FULL');
    this.renderCircleHudBtn(ctx, HUD_MUTE_RECT, muted ? 'MUTE' : 'SOUND');
    this.renderCircleHudBtn(ctx, HUD_PAUSE_RECT, 'PAUSE');
  }

  private renderCircleHudBtn(
    ctx: CanvasRenderingContext2D,
    r: Rect,
    kind: 'PAUSE' | 'SOUND' | 'MUTE' | 'FULL'
  ): void {
    const cx = r.x + r.w * 0.5;
    const cy = r.y + r.h * 0.5;
    drawGlossyButton(ctx, r.x, r.y, r.w, r.h, r.w * 0.5, '#FDE047', '#EA580C', '#7C2D12', 4);

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';

    if (kind === 'PAUSE') {
      drawRoundedRect(ctx, cx - 7, cy - 9, 5, 18, 2);
      ctx.fill();
      drawRoundedRect(ctx, cx + 2, cy - 9, 5, 18, 2);
      ctx.fill();
    } else if (kind === 'SOUND' || kind === 'MUTE') {
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - 4);
      ctx.lineTo(cx - 3, cy - 4);
      ctx.lineTo(cx + 3, cy - 9);
      ctx.lineTo(cx + 3, cy + 9);
      ctx.lineTo(cx - 3, cy + 4);
      ctx.lineTo(cx - 8, cy + 4);
      ctx.closePath();
      ctx.fill();
      if (kind === 'SOUND') {
        ctx.beginPath();
        ctx.arc(cx + 4, cy, 5, -0.7, 0.7);
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#7F1D1D';
        ctx.beginPath();
        ctx.moveTo(cx + 5, cy - 5);
        ctx.lineTo(cx + 11, cy + 5);
        ctx.moveTo(cx + 11, cy - 5);
        ctx.lineTo(cx + 5, cy + 5);
        ctx.stroke();
      }
    } else {
      const s = 7;
      ctx.beginPath();
      ctx.moveTo(cx - s, cy - 2);
      ctx.lineTo(cx - s, cy - s);
      ctx.lineTo(cx - 2, cy - s);
      ctx.moveTo(cx + 2, cy - s);
      ctx.lineTo(cx + s, cy - s);
      ctx.lineTo(cx + s, cy - 2);
      ctx.moveTo(cx - s, cy + 2);
      ctx.lineTo(cx - s, cy + s);
      ctx.lineTo(cx - 2, cy + s);
      ctx.moveTo(cx + 2, cy + s);
      ctx.lineTo(cx + s, cy + s);
      ctx.lineTo(cx + s, cy + 2);
      ctx.stroke();
    }
  }

  private renderWalletPill(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    walletRM: number,
    shift: number
  ): void {
    drawGlossyButton(ctx, x, y, 224, 42, 18, '#FEF08A', '#F59E0B', '#78350F', 4);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#451A03';
    ctx.font = `900 15px ${FONT_SANS}`;
    ctx.fillText(`WALLET: RM ${walletRM}  ·  S${shift}`, x + 112, y + 22);
  }

  // ==================== CUSTOMERS ====================

  private renderCustomerRail(ctx: CanvasRenderingContext2D, snap: GameSnapshot): void {
    for (const customer of snap.customers) {
      const r = CUSTOMER_SLOT_RECTS[customer.slotIndex];
      this.renderCustomer(ctx, r, customer);
    }
  }

  private renderCustomer(
    ctx: CanvasRenderingContext2D,
    r: Rect,
    customer: CustomerOrder
  ): void {
    const ratio = Math.max(0, Math.min(1, customer.patience / customer.maxPatience));
    const bob = Math.sin(this.time * 3.2 + customer.slotIndex * 1.4) * 3;
    const happyLift = customer.happyFlash > 0 ? -8 * Math.sin((customer.happyFlash / 0.6) * Math.PI) : 0;

    // 2.5D Character on left side of slot
    const cx = r.x + 58;
    const cy = r.y + 84 + bob + happyLift;
    this.drawCharacter25D(ctx, customer.archetype, cx, cy, ratio, customer.happyFlash > 0);

    // Glossy white 3D order speech bubble on right side of character
    const bx = r.x + 106;
    const by = r.y + 8;
    const bw = 108;
    const bh = 128;

    // Bubble shadow
    ctx.fillStyle = 'rgba(20, 12, 6, 0.28)';
    drawRoundedRect(ctx, bx + 2, by + 4, bw, bh, 16);
    ctx.fill();

    // Bubble body
    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, bx, by, bw, bh, 16);
    ctx.fill();
    ctx.strokeStyle = ratio < 0.28 ? '#EF4444' : '#D97706';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Bubble tail pointing to character
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(bx + 1, by + 48);
    ctx.lineTo(bx - 11, by + 58);
    ctx.lineTo(bx + 1, by + 68);
    ctx.closePath();
    ctx.fill();

    // Vertical patience bar on far-right edge of bubble
    const barX = bx + bw - 14;
    const barY = by + 10;
    const barW = 8;
    const barH = bh - 20;
    drawRoundedRect(ctx, barX, barY, barW, barH, 4);
    ctx.fillStyle = '#E2E8F0';
    ctx.fill();

    const fillH = Math.max(4, barH * ratio);
    ctx.fillStyle = ratio > 0.5 ? '#22C55E' : ratio > 0.25 ? '#F59E0B' : '#EF4444';
    drawRoundedRect(ctx, barX, barY + (barH - fillH), barW, fillH, 4);
    ctx.fill();

    // Dish icons stacked cleanly inside bubble
    const count = customer.items.length;
    const spacing = count === 3 ? 38 : count === 2 ? 48 : 50;
    const startY = by + bh * 0.5 - ((count - 1) * spacing) * 0.5;
    for (let i = 0; i < count; i++) {
      const ix = bx + 45;
      const iy = startY + i * spacing;
      const done = customer.fulfilled[i];
      ctx.save();
      if (done) ctx.globalAlpha = 0.3;
      this.drawDish3D(ctx, customer.items[i]!, ix, iy, count === 3 ? 0.68 : 0.8);
      ctx.restore();
      if (done) {
        ctx.fillStyle = '#16A34A';
        ctx.beginPath();
        ctx.arc(ix + 16, iy, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(ix + 11, iy);
        ctx.lineTo(ix + 15, iy + 4);
        ctx.lineTo(ix + 21, iy - 4);
        ctx.stroke();
      }
    }
  }

  private drawCharacter25D(
    ctx: CanvasRenderingContext2D,
    archetype: CustomerArchetype,
    cx: number,
    cy: number,
    patienceRatio: number,
    isHappy: boolean
  ): void {
    // Shoulders with 3D gradient shading
    const shirtColors: Record<CustomerArchetype, [string, string]> = {
      PAK_CIK: ['#2DD4BF', '#0F766E'],
      OFFICE_RUSH: ['#60A5FA', '#1D4ED8'],
      LEPAK: ['#C084FC', '#7E22CE'],
      KAKAK_FOODIE: ['#FB7185', '#BE123C'],
    };
    const [topC, botC] = shirtColors[archetype];
    const bodyGrad = ctx.createRadialGradient(cx - 10, cy + 32, 4, cx, cy + 44, 42);
    bodyGrad.addColorStop(0, topC);
    bodyGrad.addColorStop(1, botC);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(cx, cy + 56, 36, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Hijab drape for Kakak Foodie
    if (archetype === 'KAKAK_FOODIE') {
      const hGrad = ctx.createRadialGradient(cx - 8, cy - 8, 5, cx, cy + 6, 34);
      hGrad.addColorStop(0, '#FDA4AF');
      hGrad.addColorStop(1, '#E11D48');
      ctx.fillStyle = hGrad;
      ctx.beginPath();
      ctx.arc(cx, cy + 2, 28, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3D Head with radial skin shading
    const skinGrad = ctx.createRadialGradient(cx - 8, cy - 8, 4, cx, cy, 26);
    skinGrad.addColorStop(0, '#FDE1C3');
    skinGrad.addColorStop(0.7, '#E6B484');
    skinGrad.addColorStop(1, '#C68B59');
    ctx.fillStyle = skinGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(92, 45, 12, 0.35)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Archetype headwear
    if (archetype === 'PAK_CIK') {
      // Songkok
      const sGrad = ctx.createLinearGradient(cx - 20, cy - 32, cx + 20, cy - 14);
      sGrad.addColorStop(0, '#3F3F46');
      sGrad.addColorStop(0.5, '#18181B');
      sGrad.addColorStop(1, '#09090B');
      ctx.fillStyle = sGrad;
      drawRoundedRect(ctx, cx - 20, cy - 32, 40, 17, 5);
      ctx.fill();
      // Moustache
      ctx.strokeStyle = '#3F3F46';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 9, cy + 7);
      ctx.quadraticCurveTo(cx, cy + 3, cx + 9, cy + 7);
      ctx.stroke();
    } else if (archetype === 'OFFICE_RUSH') {
      ctx.fillStyle = '#27272A';
      ctx.beginPath();
      ctx.arc(cx, cy - 6, 22, Math.PI, 0);
      ctx.fill();
      // Glasses
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, cx - 15, cy - 5, 12, 9, 3);
      ctx.stroke();
      drawRoundedRect(ctx, cx + 3, cy - 5, 12, 9, 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 3, cy - 1);
      ctx.lineTo(cx + 3, cy - 1);
      ctx.stroke();
    } else if (archetype === 'LEPAK') {
      // Orange snapback cap
      const capGrad = ctx.createLinearGradient(cx - 20, cy - 26, cx + 20, cy - 6);
      capGrad.addColorStop(0, '#FB923C');
      capGrad.addColorStop(1, '#C2410C');
      ctx.fillStyle = capGrad;
      ctx.beginPath();
      ctx.arc(cx, cy - 6, 23, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(cx - 10, cy - 10, 34, 6);
    }

    // Rosy cheeks
    ctx.fillStyle = 'rgba(244, 63, 94, 0.22)';
    ctx.beginPath();
    ctx.arc(cx - 12, cy + 5, 4.5, 0, Math.PI * 2);
    ctx.arc(cx + 12, cy + 5, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Eyes with specular sparkle
    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.arc(cx - 8, cy - 1, 2.8, 0, Math.PI * 2);
    ctx.arc(cx + 8, cy - 1, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx - 9, cy - 2, 1, 0, Math.PI * 2);
    ctx.arc(cx + 7, cy - 2, 1, 0, Math.PI * 2);
    ctx.fill();

    // Mouth expression
    ctx.strokeStyle = '#7C2D12';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (isHappy || patienceRatio > 0.5) {
      ctx.arc(cx, cy + 8, 6, 0.15 * Math.PI, 0.85 * Math.PI);
    } else if (patienceRatio > 0.25) {
      ctx.moveTo(cx - 5, cy + 12);
      ctx.lineTo(cx + 5, cy + 12);
    } else {
      ctx.arc(cx, cy + 16, 6, 1.15 * Math.PI, 1.85 * Math.PI);
    }
    ctx.stroke();

    // Sweat drop if impatient
    if (patienceRatio <= 0.3) {
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(cx + 20, cy - 8, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ==================== KITCHEN STATIONS (2.5D) ====================

  private renderTehTarikStation(ctx: CanvasRenderingContext2D, snap: GameSnapshot): void {
    const r = TEH_TARIK_RECT;
    // Wooden base platform
    drawGlossyButton(ctx, r.x, r.y, r.w, r.h, 16, '#92400E', '#5C2607', '#3B1604', 5);

    const cx = r.x + r.w * 0.5;
    const teh = snap.tehTarik;

    // 3D Glossy Crimson-Brass Tea Dispenser Urn (inspired by Cooking Crush drink machine)
    const ux = r.x + 14;
    const uy = r.y + 10;
    const uw = r.w - 28;
    const uh = 104;
    drawGlossyButton(ctx, ux, uy, uw, uh, 14, '#EF4444', '#991B1B', '#450A0A', 4);

    // Metallic brass spout & gauge window
    drawRoundedRect(ctx, ux + 10, uy + 24, 24, 68, 8);
    ctx.fillStyle = '#1C1917';
    ctx.fill();

    // Sweet spot zone inside vertical gauge
    const gx = ux + 13;
    const gy = uy + 27;
    const gw = 18;
    const gh = 62;
    const sweetTop = gy + gh * (1 - teh.sweetMax);
    const sweetH = gh * (teh.sweetMax - teh.sweetMin);
    ctx.fillStyle = 'rgba(74, 222, 128, 0.45)';
    ctx.fillRect(gx, sweetTop, gw, sweetH);
    ctx.strokeStyle = '#4ADE80';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(gx, sweetTop, gw, sweetH);

    // Current fill level inside gauge
    if (teh.fillLevel > 0) {
      const fh = Math.min(gh, gh * teh.fillLevel);
      const inSweet = teh.fillLevel >= teh.sweetMin && teh.fillLevel <= teh.sweetMax;
      ctx.fillStyle = inSweet ? '#4ADE80' : '#F59E0B';
      drawRoundedRect(ctx, gx + 1, gy + (gh - fh), gw - 2, fh, 3);
      ctx.fill();
    }

    // Spout & frothy pouring stream
    const spoutX = cx + 22;
    const spoutY = uy + 34;
    ctx.fillStyle = '#E2E8F0';
    drawRoundedRect(ctx, spoutX - 8, spoutY - 8, 16, 12, 4);
    ctx.fill();

    if (teh.isPulling) {
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(spoutX, spoutY + 4);
      ctx.quadraticCurveTo(
        spoutX + Math.sin(this.time * 24) * 5,
        spoutY + 32,
        spoutX,
        spoutY + 56
      );
      ctx.stroke();
    }

    // Active brewing cup under spout
    this.drawTehCup3D(ctx, spoutX, uy + 76, 0.9, teh.isPulling ? teh.fillLevel : 0);

    // Label on dispenser
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FEF3C7';
    ctx.font = `900 11px ${FONT_SANS}`;
    const urnLabel =
      teh.spilledTimer > 0
        ? 'TUMPAH!'
        : teh.isPulling
          ? 'RELEASE IN GREEN!'
          : teh.readyCount >= teh.maxCups
            ? 'TRAY FULL'
            : 'HOLD TO TARIK';
    ctx.fillText(urnLabel, cx, uy + 13);

    // Lower Ready Cups Stainless Drip Tray
    const tr = TEH_TRAY_RECT;
    drawRoundedRect(ctx, tr.x + 8, tr.y + 4, tr.w - 16, tr.h - 10, 12);
    const trayGrad = ctx.createLinearGradient(tr.x, tr.y, tr.x, tr.y + tr.h);
    trayGrad.addColorStop(0, '#CBD5E1');
    trayGrad.addColorStop(1, '#64748B');
    ctx.fillStyle = trayGrad;
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Render cup slots (1..maxCups)
    const spacing = teh.maxCups === 3 ? 46 : teh.maxCups === 2 ? 58 : 0;
    const startX = cx - ((teh.maxCups - 1) * spacing) * 0.5;
    for (let i = 0; i < teh.maxCups; i++) {
      const cupX = startX + i * spacing;
      const cupY = tr.y + 40;
      // Coaster shadow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
      ctx.beginPath();
      ctx.ellipse(cupX, cupY + 14, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      if (i < teh.readyCount) {
        this.drawTehCup3D(ctx, cupX, cupY, 0.85, 1);
      }
    }

    if (teh.readyCount > 0) {
      ctx.fillStyle = '#0F172A';
      ctx.font = `900 10px ${FONT_SANS}`;
      ctx.fillText('TAP / DRAG TO SERVE', cx, tr.y + tr.h - 14);
    }
  }

  private renderKualiStation(ctx: CanvasRenderingContext2D, snap: GameSnapshot): void {
    const r = KUALI_RECT;
    // 3D Beveled cast-iron griddle deck (like Cooking Crush grill plate)
    drawGlossyButton(ctx, r.x, r.y, r.w, r.h, 18, '#475569', '#1E293B', '#0F172A', 6);

    // Dark oiled iron interior
    drawRoundedRect(ctx, r.x + 8, r.y + 8, r.w - 16, r.h - 16, 12);
    const ironGrad = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
    ironGrad.addColorStop(0, '#334155');
    ironGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = ironGrad;
    ctx.fill();

    for (let i = 0; i < snap.kuali.length; i++) {
      const slot = snap.kuali[i]!;
      const sr = KUALI_SLOT_RECTS[i]!;
      this.renderKualiSlot(ctx, sr, slot);
    }
  }

  private renderKualiSlot(
    ctx: CanvasRenderingContext2D,
    sr: Rect,
    slot: KualiSlot
  ): void {
    const cx = sr.x + sr.w * 0.5;
    const cy = sr.y + sr.h * 0.5;

    if (!slot.unlocked) {
      drawRoundedRect(ctx, sr.x + 4, sr.y + 4, sr.w - 8, sr.h - 8, 12);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#94A3B8';
      ctx.font = `800 11px ${FONT_SANS}`;
      ctx.fillText('🔒 UPGRADE IN SHOP', cx, cy);
      return;
    }

    // 3D Round Cast-Iron Pan with Metallic Handle (Cooking Crush style!)
    // Pan handle sticking toward bottom-left
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 32, cy + 20);
    ctx.lineTo(cx - 56, cy + 36);
    ctx.stroke();
    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 34, cy + 19);
    ctx.lineTo(cx - 55, cy + 34);
    ctx.stroke();

    // Glowing orange burner ring when cooking
    if (slot.item !== null && slot.state !== 'BURNT') {
      const glow = 0.35 + Math.sin(this.time * 8 + slot.id) * 0.12;
      ctx.fillStyle = `rgba(249, 115, 22, ${glow})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 2, 54, 38, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pan rim & interior
    const panGrad = ctx.createRadialGradient(cx - 12, cy - 10, 6, cx, cy, 48);
    panGrad.addColorStop(0, '#334155');
    panGrad.addColorStop(0.85, '#18181B');
    panGrad.addColorStop(1, '#09090B');
    ctx.fillStyle = panGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 48, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 3;
    ctx.stroke();

    if (slot.item === null) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.font = `800 11px ${FONT_SANS}`;
      ctx.fillText(`KUALI ${slot.id + 1}`, cx, cy);
      return;
    }

    // Draw 3D food item inside pan
    const burnt = slot.state === 'BURNT';
    if (slot.item === 'ROTI') {
      this.drawRoti3D(ctx, cx, cy - 2, 1.0, slot.progress, burnt);
    } else if (slot.item === 'PATTY') {
      this.drawPatty3D(ctx, cx, cy - 2, 1.0, slot.progress, burnt);
    } else if (slot.item === 'EGG') {
      this.drawEgg3D(ctx, cx, cy - 2, 1.0, burnt);
    } else if (slot.item === 'WRAPPED_BURGER') {
      this.drawWrappedBurger3D(ctx, cx, cy - 2, 1.0, slot.hasGarnish, slot.hasSauce, burnt);
    }

    // Radial Cooking Progress Gauge (top-right corner of pan)
    const rx = sr.x + sr.w - 22;
    const ry = sr.y + 20;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.arc(rx, ry, 13, 0, Math.PI * 2);
    ctx.fill();

    const ringVal = slot.burnProgress > 0 ? slot.burnProgress : slot.progress;
    const ringColor =
      burnt
        ? '#EF4444'
        : slot.burnProgress > 0
          ? '#EF4444'
          : slot.state === 'READY_FLIP'
            ? '#FACC15'
            : slot.state === 'COOKED'
              ? '#4ADE80'
              : '#38BDF8';
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(rx, ry, 9.5, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * Math.min(1, ringVal));
    ctx.stroke();

    // Status action pill at bottom of slot
    const pill = this.getKualiPrompt(slot);
    if (pill) {
      const pw = Math.min(sr.w - 14, pill.text.length * 6.8 + 18);
      drawRoundedRect(ctx, cx - pw * 0.5, sr.y + sr.h - 20, pw, 18, 9);
      ctx.fillStyle = pill.bg;
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `900 10px ${FONT_SANS}`;
      ctx.fillText(pill.text, cx, sr.y + sr.h - 11);
    }
  }

  private getKualiPrompt(slot: KualiSlot): { text: string; bg: string } | null {
    if (slot.state === 'BURNT') return { text: 'HANGUS! 2x TAP', bg: '#DC2626' };
    if (slot.burnProgress > 0.35) return { text: 'BURNING!', bg: '#EA580C' };
    if (slot.state === 'READY_FLIP') return { text: 'SWIPE ▲ FLIP', bg: '#D97706' };
    if (slot.item === 'ROTI' && slot.state === 'COOKED') {
      return { text: 'TAP TO PLATE', bg: '#16A34A' };
    }
    if (slot.item === 'PATTY' && slot.state === 'COOKED') {
      return { text: 'DRAG → EGG', bg: '#0284C7' };
    }
    if (slot.item === 'EGG' && slot.state === 'COOKED') {
      return { text: 'READY (+ROTI/PATTY)', bg: '#16A34A' };
    }
    if (slot.item === 'WRAPPED_BURGER') {
      if (!slot.hasGarnish) return { text: 'TAP VEG', bg: '#16A34A' };
      if (!slot.hasSauce) return { text: 'TAP SAUCE', bg: '#EA580C' };
      return { text: 'TAP WRAP!', bg: '#0284C7' };
    }
    return null;
  }

  private renderPlatesStation(ctx: CanvasRenderingContext2D, snap: GameSnapshot): void {
    const r = PLATES_RECT;
    // Warm maple wooden serving board (like Cooking Crush plate tray!)
    drawGlossyButton(ctx, r.x, r.y, r.w, r.h, 18, '#FDE68A', '#D97706', '#78350F', 6);

    for (let i = 0; i < snap.plates.length; i++) {
      const plate = snap.plates[i]!;
      const pr = PLATE_SLOT_RECTS[i]!;
      this.renderPlateSlot(ctx, pr, plate);
    }
  }

  private renderPlateSlot(
    ctx: CanvasRenderingContext2D,
    pr: Rect,
    plate: ServingPlateSlot
  ): void {
    const cx = pr.x + pr.w * 0.5;
    const cy = pr.y + pr.h * 0.5;

    if (!plate.unlocked) {
      drawRoundedRect(ctx, pr.x + 4, pr.y + 4, pr.w - 8, pr.h - 8, 12);
      ctx.fillStyle = 'rgba(120, 53, 15, 0.22)';
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#78350F';
      ctx.font = `800 10px ${FONT_SANS}`;
      ctx.fillText('🔒 SHOP', cx, cy);
      return;
    }

    // 3D Glossy Blue-Rimmed Ceramic Plate (just like Cooking Crush!)
    ctx.fillStyle = 'rgba(69, 26, 3, 0.28)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 5, 38, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Blue outer ceramic rim
    const rimGrad = ctx.createLinearGradient(cx, cy - 28, cx, cy + 28);
    rimGrad.addColorStop(0, '#93C5FD');
    rimGrad.addColorStop(1, '#2563EB');
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 38, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Crisp white inner plate dish
    const innerGrad = ctx.createRadialGradient(cx - 8, cy - 6, 4, cx, cy, 32);
    innerGrad.addColorStop(0, '#FFFFFF');
    innerGrad.addColorStop(1, '#E2E8F0');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 1, 31, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    if (plate.dish) {
      this.drawDish3D(ctx, plate.dish, cx, cy - 4, 1.05);
      drawRoundedRect(ctx, cx - 32, pr.y + pr.h - 18, 64, 15, 7);
      ctx.fillStyle = '#16A34A';
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `900 9px ${FONT_SANS}`;
      ctx.fillText('SERVE!', cx, pr.y + pr.h - 10);
    }
  }

  private renderPrepBoardStation(ctx: CanvasRenderingContext2D, snap: GameSnapshot): void {
    const r = PREP_BOARD_RECT;
    // Thick 3D butcher-block wood cutting board
    drawGlossyButton(ctx, r.x, r.y, r.w, r.h, 18, '#FCD34D', '#B45309', '#5C2607', 6);

    // Subtle wood grain lines
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.16)';
    ctx.lineWidth = 2;
    for (let i = 1; i <= 5; i++) {
      const gy = r.y + i * 32;
      ctx.beginPath();
      ctx.moveTo(r.x + 12, gy);
      ctx.lineTo(r.x + r.w - 12, gy);
      ctx.stroke();
    }

    const cx = r.x + r.w * 0.5;
    const cy = r.y + 106;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#451A03';
    ctx.font = `900 12px ${FONT_SANS}`;
    ctx.fillText('PREP BOARD', cx, r.y + 20);

    const prep = snap.prep;
    if (prep.item === null) {
      ctx.fillStyle = 'rgba(69, 26, 3, 0.65)';
      ctx.font = `800 12px ${FONT_SANS}`;
      ctx.fillText('Tap DOUGH', cx, cy - 10);
      ctx.fillText('or VEG below', cx, cy + 10);
      if (prep.slicedStock > 0) {
        drawRoundedRect(ctx, cx - 54, r.y + r.h - 36, 108, 22, 11);
        ctx.fillStyle = '#15803D';
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `900 11px ${FONT_SANS}`;
        ctx.fillText(`VEG STOCK: ${prep.slicedStock}`, cx, r.y + r.h - 25);
      }
      return;
    }

    if (prep.item === 'DOUGH') {
      const stretch = 1 + (prep.swipesDone / Math.max(1, prep.swipesRequired)) * 0.45;
      ctx.fillStyle = 'rgba(69, 26, 3, 0.22)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 8, 32 * stretch, 24 * stretch, 0, 0, Math.PI * 2);
      ctx.fill();

      const dGrad = ctx.createRadialGradient(cx - 10, cy - 8, 4, cx, cy, 34 * stretch);
      dGrad.addColorStop(0, '#FFFBEB');
      dGrad.addColorStop(1, '#FDE68A');
      ctx.fillStyle = dGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 30 * stretch, 22 * stretch, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 2;
      ctx.stroke();

      const ready = prep.swipesDone >= prep.swipesRequired;
      drawRoundedRect(ctx, cx - 68, r.y + r.h - 36, 136, 24, 12);
      ctx.fillStyle = ready ? '#16A34A' : '#EA580C';
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `900 11px ${FONT_SANS}`;
      ctx.fillText(
        ready ? 'TAP TO TOSS!' : `SWIPE ◀ ▶ (${prep.swipesDone}/${prep.swipesRequired})`,
        cx,
        r.y + r.h - 24
      );
    } else if (prep.item === 'VEG') {
      // Crisp 3D lettuce & tomato pile
      ctx.fillStyle = '#22C55E';
      ctx.beginPath();
      ctx.arc(cx - 14, cy, 20, 0, Math.PI * 2);
      ctx.arc(cx + 14, cy + 4, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FCA5A5';
      ctx.beginPath();
      ctx.arc(cx - 4, cy - 11, 4, 0, Math.PI * 2);
      ctx.fill();

      drawRoundedRect(ctx, cx - 68, r.y + r.h - 36, 136, 24, 12);
      ctx.fillStyle = '#15803D';
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `900 11px ${FONT_SANS}`;
      ctx.fillText(
        `SWIPE ▼ CHOP (${prep.swipesDone}/${prep.swipesRequired})`,
        cx,
        r.y + r.h - 24
      );
    }
  }

  // ==================== BOTTOM DOCK ====================

  private renderBottomDock(ctx: CanvasRenderingContext2D, snap: GameSnapshot): void {
    const hasBurnt = snap.kuali.some((k) => k.unlocked && k.state === 'BURNT');
    const needsSauce = snap.kuali.some(
      (k) => k.unlocked && k.item === 'WRAPPED_BURGER' && !k.hasSauce && k.state !== 'BURNT'
    );
    const readyWrap = snap.kuali.some(
      (k) =>
        k.unlocked &&
        k.item === 'WRAPPED_BURGER' &&
        k.hasGarnish &&
        k.hasSauce &&
        k.state !== 'BURNT'
    );

    for (const [id, rect] of Object.entries(DOCK_RECTS) as [DockButtonId, Rect][]) {
      const meta = DOCK_META[id];
      const highlight =
        (id === 'TRASH' && hasBurnt) ||
        (id === 'SAUCE' && needsSauce) ||
        (id === 'WRAPPER' && readyWrap);

      if (highlight) {
        ctx.save();
        ctx.shadowColor = id === 'TRASH' ? '#EF4444' : '#FACC15';
        ctx.shadowBlur = 16;
        drawGlossyButton(ctx, rect.x, rect.y, rect.w, rect.h, 16, meta.top, meta.bottom, meta.rim, 5);
        ctx.restore();
      } else {
        drawGlossyButton(ctx, rect.x, rect.y, rect.w, rect.h, 16, meta.top, meta.bottom, meta.rim, 5);
      }

      const cx = rect.x + rect.w * 0.5;
      const cy = rect.y + 28;
      this.renderDockIcon(ctx, id, cx, cy);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `900 12px ${FONT_SANS}`;
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
    cy: number
  ): void {
    switch (id) {
      case 'DOUGH': {
        const g = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 15);
        g.addColorStop(0, '#FFFFFF');
        g.addColorStop(1, '#FDE68A');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 16, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'PATTY':
        this.drawPatty3D(ctx, cx, cy, 0.55, 0.8, false);
        break;
      case 'EGG':
        this.drawEgg3D(ctx, cx, cy, 0.55, false);
        break;
      case 'VEG':
        ctx.fillStyle = '#4ADE80';
        ctx.beginPath();
        ctx.arc(cx - 6, cy + 2, 10, 0, Math.PI * 2);
        ctx.arc(cx + 6, cy + 2, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(cx, cy - 4, 7, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'SAUCE':
        // Squeeze bottle
        ctx.fillStyle = '#FEF08A';
        drawRoundedRect(ctx, cx - 9, cy - 6, 18, 20, 5);
        ctx.fill();
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy - 6);
        ctx.lineTo(cx, cy - 16);
        ctx.lineTo(cx + 5, cy - 6);
        ctx.closePath();
        ctx.fill();
        break;
      case 'WRAPPER':
        ctx.fillStyle = '#FFFFFF';
        drawRoundedRect(ctx, cx - 15, cy - 11, 30, 22, 4);
        ctx.fill();
        ctx.strokeStyle = '#0284C7';
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      case 'TRASH':
        ctx.fillStyle = '#F1F5F9';
        drawRoundedRect(ctx, cx - 10, cy - 6, 20, 18, 3);
        ctx.fill();
        ctx.fillRect(cx - 13, cy - 10, 26, 4);
        break;
    }
  }

  // ==================== 3D FOOD ILLUSTRATIONS ====================

  private drawDish3D(
    ctx: CanvasRenderingContext2D,
    dish: DishType,
    cx: number,
    cy: number,
    scale: number
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    switch (dish) {
      case 'TEH_TARIK':
        this.drawTehCup3D(ctx, 0, 2, 0.88, 1);
        break;
      case 'ROTI_CANAI':
        this.drawRoti3D(ctx, 0, 2, 0.72, 1, false);
        // Little curry dhal bowl on the side
        ctx.fillStyle = '#EA580C';
        ctx.beginPath();
        ctx.arc(17, 7, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFBEB';
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      case 'ROTI_TELUR':
        this.drawRoti3D(ctx, 0, 3, 0.74, 1, false);
        this.drawEgg3D(ctx, 0, -2, 0.55, false);
        break;
      case 'BURGER_RAMLY':
        this.drawWrappedBurger3D(ctx, 0, 2, 0.78, true, true, false);
        break;
    }
    ctx.restore();
  }

  private drawTehCup3D(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    scale: number,
    fill: number
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // Tapered glass mug
    ctx.beginPath();
    ctx.moveTo(-13, -15);
    ctx.lineTo(13, -15);
    ctx.lineTo(10, 15);
    ctx.lineTo(-10, 15);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fill();

    if (fill > 0.05) {
      const h = 28 * Math.min(1, fill);
      const topY = 14 - h;
      const tGrad = ctx.createLinearGradient(-12, topY, 12, 14);
      tGrad.addColorStop(0, '#F59E0B');
      tGrad.addColorStop(0.5, '#B45309');
      tGrad.addColorStop(1, '#78350F');
      ctx.fillStyle = tGrad;
      ctx.beginPath();
      ctx.moveTo(-11, topY);
      ctx.lineTo(11, topY);
      ctx.lineTo(9, 14);
      ctx.lineTo(-9, 14);
      ctx.closePath();
      ctx.fill();

      // Frothy crema foam top
      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath();
      ctx.ellipse(0, topY, 11.5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glass outline & handle
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-13, -15);
    ctx.lineTo(13, -15);
    ctx.lineTo(10, 15);
    ctx.lineTo(-10, 15);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(13, 0, 6, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();

    ctx.restore();
  }

  private drawRoti3D(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    scale: number,
    progress: number,
    burnt: boolean
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 36, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createRadialGradient(-10, -8, 4, 0, 0, 36);
    if (burnt) {
      grad.addColorStop(0, '#52525B');
      grad.addColorStop(1, '#18181B');
    } else if (progress < 0.45) {
      grad.addColorStop(0, '#FFFBEB');
      grad.addColorStop(1, '#FDE68A');
    } else {
      grad.addColorStop(0, '#FEF08A');
      grad.addColorStop(0.6, '#F59E0B');
      grad.addColorStop(1, '#B45309');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 35, 23, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flaky golden concentric swirl
    ctx.strokeStyle = burnt ? '#27272A' : 'rgba(146, 64, 14, 0.45)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 13, 0.2, 0, Math.PI * 1.6);
    ctx.stroke();

    ctx.restore();
  }

  private drawPatty3D(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    scale: number,
    progress: number,
    burnt: boolean
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // 3D patty thickness rim
    ctx.fillStyle = burnt ? '#09090B' : '#450A0A';
    ctx.beginPath();
    ctx.ellipse(0, 5, 30, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createRadialGradient(-8, -6, 3, 0, 0, 30);
    if (burnt) {
      grad.addColorStop(0, '#3F3F46');
      grad.addColorStop(1, '#18181B');
    } else if (progress < 0.45) {
      grad.addColorStop(0, '#F87171');
      grad.addColorStop(1, '#B91C1C');
    } else {
      grad.addColorStop(0, '#B45309');
      grad.addColorStop(0.65, '#7C2D12');
      grad.addColorStop(1, '#451A03');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sizzling crosshatch grill marks
    ctx.strokeStyle = 'rgba(20, 8, 4, 0.55)';
    ctx.lineWidth = 2.4;
    for (let i = -14; i <= 14; i += 10) {
      ctx.beginPath();
      ctx.moveTo(i - 8, -11);
      ctx.lineTo(i + 8, 11);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawEgg3D(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    scale: number,
    burnt: boolean
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.fillStyle = burnt ? '#3F3F46' : '#FFFBEB';
    ctx.beginPath();
    ctx.ellipse(0, 0, 32, 22, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = burnt ? '#18181B' : '#FDE68A';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Glossy 3D yolk dome
    const yGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, 12);
    yGrad.addColorStop(0, burnt ? '#71717A' : '#FEF08A');
    yGrad.addColorStop(0.5, burnt ? '#52525B' : '#FACC15');
    yGrad.addColorStop(1, burnt ? '#27272A' : '#EA580C');
    ctx.fillStyle = yGrad;
    ctx.beginPath();
    ctx.arc(0, -1, 11, 0, Math.PI * 2);
    ctx.fill();

    if (!burnt) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(-4, -4, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawWrappedBurger3D(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    scale: number,
    hasGarnish: boolean,
    hasSauce: boolean,
    burnt: boolean
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // Bottom toasted bun
    ctx.fillStyle = burnt ? '#27272A' : '#B45309';
    ctx.beginPath();
    ctx.ellipse(0, 10, 28, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Egg-wrapped patty middle
    const wrapGrad = ctx.createLinearGradient(0, -8, 0, 12);
    wrapGrad.addColorStop(0, burnt ? '#52525B' : '#FEF08A');
    wrapGrad.addColorStop(1, burnt ? '#18181B' : '#EAB308');
    ctx.fillStyle = wrapGrad;
    drawRoundedRect(ctx, -26, -6, 52, 18, 9);
    ctx.fill();

    // Crisp green lettuce garnish
    if (hasGarnish) {
      ctx.fillStyle = '#22C55E';
      for (let i = -20; i <= 20; i += 10) {
        ctx.beginPath();
        ctx.arc(i, -6, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Glossy toasted sesame dome bun
    const bunGrad = ctx.createRadialGradient(-8, -14, 3, 0, -6, 30);
    bunGrad.addColorStop(0, burnt ? '#52525B' : '#FDE68A');
    bunGrad.addColorStop(0.55, burnt ? '#3F3F46' : '#F59E0B');
    bunGrad.addColorStop(1, burnt ? '#18181B' : '#B45309');
    ctx.fillStyle = bunGrad;
    ctx.beginPath();
    ctx.ellipse(0, -8, 27, 15, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();

    // Zigzag chili & mayo sauce drizzle
    if (hasSauce) {
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-18, -10);
      ctx.lineTo(-10, -15);
      ctx.lineTo(-2, -9);
      ctx.lineTo(6, -15);
      ctx.lineTo(16, -9);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ==================== EFFECTS & ANIMATIONS ====================

  private renderFlyingDishes(ctx: CanvasRenderingContext2D, list: FlyingDish[]): void {
    for (const f of list) {
      const t = Math.min(1, f.progress);
      const ease = 1 - Math.pow(1 - t, 3);
      const x = f.startX + (f.targetX - f.startX) * ease;
      const y = f.startY + (f.targetY - f.startY) * ease - Math.sin(t * Math.PI) * 58;
      const scale = 1.05 - t * 0.25;
      this.drawDish3D(ctx, f.dish, x, y, scale);
    }
  }

  private renderActiveDrag(
    ctx: CanvasRenderingContext2D,
    drag: NonNullable<GameSnapshot['activeDrag']>
  ): void {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 12;
    if (drag.dish) {
      this.drawDish3D(ctx, drag.dish, drag.x, drag.y, 1.15);
    } else if (drag.item === 'PATTY') {
      this.drawPatty3D(ctx, drag.x, drag.y, 0.9, 1, false);
    } else if (drag.item === 'EGG') {
      this.drawEgg3D(ctx, drag.x, drag.y, 0.9, false);
    } else {
      this.drawPatty3D(ctx, drag.x, drag.y, 0.8, 1, true);
    }
    ctx.restore();
  }

  private renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
    for (const pt of particles) {
      ctx.save();
      ctx.globalAlpha = pt.alpha;
      if (pt.kind === 'STAR') {
        this.drawStar(ctx, pt.x, pt.y, pt.size + 2, pt.color, '#B45309');
      } else if (pt.kind === 'HEART') {
        ctx.fillStyle = '#FB7185';
        ctx.beginPath();
        ctx.arc(pt.x - 3, pt.y, 4, 0, Math.PI * 2);
        ctx.arc(pt.x + 3, pt.y, 4, 0, Math.PI * 2);
        ctx.lineTo(pt.x, pt.y + 8);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private renderPopups(ctx: CanvasRenderingContext2D, popups: GameSnapshot['popups']): void {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of popups) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      const size = Math.round(18 * (p.scale ?? 1));
      ctx.font = `900 ${size}px ${FONT_SANS}`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#451A03';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    }
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    outerR: number,
    fill: string,
    stroke: string
  ): void {
    const innerR = outerR * 0.48;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = -Math.PI * 0.5 + (i * Math.PI) / 5;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}
