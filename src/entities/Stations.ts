import {
  createDefaultUpgrades,
  getCookSpeedMultiplier,
  getDoughSwipesRequired,
  getKualiSlotCount,
  getPlateSlotCount,
  getTehFillDuration,
  getTehMaxCups,
  getTehSweetSpot,
  getVegSwipesRequired,
  getVegYield,
} from '../core/ProgressStore';
import type {
  AudioController,
  DishType,
  FloatingPopup,
  FlyingDish,
  GameSnapshot,
  KitchenUpgrades,
  KualiSlot,
  Particle,
  PrepBoardState,
  ServingPlateSlot,
  TehTarikState,
} from '../types/game';
import {
  CUSTOMER_SLOT_RECTS,
  CustomerQueue,
  type FeedbackSink,
  type Rect,
} from './CustomerQueue';

export type DockButtonId =
  | 'DOUGH'
  | 'PATTY'
  | 'EGG'
  | 'VEG'
  | 'SAUCE'
  | 'WRAPPER'
  | 'TRASH';

// 960 x 540 landscape Cooking Crush counter layout
export const TEH_TARIK_RECT: Rect = { x: 16, y: 234, w: 164, h: 204 };
export const TEH_PULL_RECT: Rect = { x: 16, y: 234, w: 164, h: 124 };
export const TEH_TRAY_RECT: Rect = { x: 16, y: 358, w: 164, h: 80 };

export const KUALI_RECT: Rect = { x: 192, y: 234, w: 344, h: 204 };
export const KUALI_SLOT_RECTS: readonly [Rect, Rect, Rect, Rect] = [
  { x: 202, y: 244, w: 158, h: 90 },
  { x: 368, y: 244, w: 158, h: 90 },
  { x: 202, y: 342, w: 158, h: 90 },
  { x: 368, y: 342, w: 158, h: 90 },
];

export const PLATES_RECT: Rect = { x: 548, y: 234, w: 204, h: 204 };
export const PLATE_SLOT_RECTS: readonly [Rect, Rect, Rect, Rect] = [
  { x: 556, y: 244, w: 92, h: 90 },
  { x: 652, y: 244, w: 92, h: 90 },
  { x: 556, y: 342, w: 92, h: 90 },
  { x: 652, y: 342, w: 92, h: 90 },
];

export const PREP_BOARD_RECT: Rect = { x: 764, y: 234, w: 180, h: 204 };

export const DOCK_RECTS: Readonly<Record<DockButtonId, Rect>> = {
  DOUGH: { x: 16, y: 454, w: 124, h: 74 },
  PATTY: { x: 150, y: 454, w: 124, h: 74 },
  EGG: { x: 284, y: 454, w: 124, h: 74 },
  VEG: { x: 418, y: 454, w: 124, h: 74 },
  SAUCE: { x: 552, y: 454, w: 124, h: 74 },
  WRAPPER: { x: 686, y: 454, w: 124, h: 74 },
  TRASH: { x: 820, y: 454, w: 124, h: 74 },
};

const TEH_POUR_SFX_INTERVAL = 0.14;

const ROTI_COOK_DURATION = 3.4;
const PATTY_COOK_DURATION = 3.8;
const EGG_COOK_DURATION = 2.0;
const WRAPPED_HOLD_DURATION = 5.5;
const BURN_DURATION = 2.8;

const SWIPE_HORIZONTAL_THRESHOLD = 32;
const SWIPE_UP_THRESHOLD = 28;
const SWIPE_DOWN_THRESHOLD = 26;
const DRAG_START_DISTANCE = 14;
const DOUBLE_TAP_WINDOW_SECONDS = 0.45;

interface PointerSession {
  pointerId: number;
  startX: number;
  startY: number;
  anchorX: number;
  anchorY: number;
  x: number;
  y: number;
  source:
    | 'TEH_PULL'
    | 'TEH_TRAY'
    | 'PREP'
    | 'KUALI'
    | 'PLATE'
    | 'CUSTOMER'
    | 'DOCK'
    | 'NONE';
  slotIndex?: number;
  dockId?: DockButtonId;
  customerSlot?: 0 | 1 | 2 | 3;
  swiped: boolean;
  dragging: boolean;
}

function pointInRect(x: number, y: number, r: Rect): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function createKualiSlot(id: number, unlocked: boolean): KualiSlot {
  return {
    id,
    unlocked,
    item: null,
    state: 'RAW',
    progress: 0,
    burnProgress: 0,
    hasGarnish: false,
    hasSauce: false,
  };
}

function createPlateSlot(id: number, unlocked: boolean): ServingPlateSlot {
  return {
    id,
    unlocked,
    dish: null,
  };
}

export class Stations implements FeedbackSink {
  public kuali: KualiSlot[] = [
    createKualiSlot(0, true),
    createKualiSlot(1, true),
    createKualiSlot(2, false),
    createKualiSlot(3, false),
  ];
  public prep: PrepBoardState = {
    item: null,
    swipesDone: 0,
    swipesRequired: 0,
    slicedStock: 0,
  };
  public tehTarik: TehTarikState = {
    isPulling: false,
    fillLevel: 0,
    readyCount: 0,
    maxCups: 1,
    spilledTimer: 0,
    sweetMin: 0.72,
    sweetMax: 0.92,
  };
  public plates: ServingPlateSlot[] = [
    createPlateSlot(0, true),
    createPlateSlot(1, true),
    createPlateSlot(2, false),
    createPlateSlot(3, false),
  ];
  public flyingDishes: FlyingDish[] = [];
  public popups: FloatingPopup[] = [];
  public particles: Particle[] = [];
  public screenShake = 0;
  public activeDrag: {
    source: string;
    dish?: DishType;
    item?: string;
    x: number;
    y: number;
  } | null = null;

  private readonly audio: AudioController;
  private readonly queue: CustomerQueue;
  private upgrades: KitchenUpgrades = createDefaultUpgrades();
  private walletRM = 0;
  private pointer: PointerSession | null = null;
  private pourSfxTimer = 0;
  private steamTimer = 0;
  private elapsed = 0;
  private nextId = 1;
  private lastBurntTapTime: number[] = [-10, -10, -10, -10];

  constructor(audio: AudioController, queue?: CustomerQueue) {
    this.audio = audio;
    this.queue = queue ?? new CustomerQueue(audio, this);
  }

  public getCustomerQueue(): CustomerQueue {
    return this.queue;
  }

  public setWalletRM(walletRM: number): void {
    this.walletRM = walletRM;
  }

  public resetForShift(shift: number, upgrades: KitchenUpgrades, walletRM: number): void {
    this.upgrades = { ...upgrades };
    this.walletRM = walletRM;

    const kualiCount = getKualiSlotCount(this.upgrades);
    this.kuali = [0, 1, 2, 3].map((i) => createKualiSlot(i, i < kualiCount));

    const plateCount = getPlateSlotCount(this.upgrades);
    this.plates = [0, 1, 2, 3].map((i) => createPlateSlot(i, i < plateCount));

    const sweet = getTehSweetSpot(this.upgrades);
    this.tehTarik = {
      isPulling: false,
      fillLevel: 0,
      readyCount: 0,
      maxCups: getTehMaxCups(this.upgrades),
      spilledTimer: 0,
      sweetMin: sweet.min,
      sweetMax: sweet.max,
    };

    this.prep = {
      item: null,
      swipesDone: 0,
      swipesRequired: 0,
      slicedStock: 0,
    };
    this.flyingDishes = [];
    this.popups = [];
    this.particles = [];
    this.screenShake = 0;
    this.activeDrag = null;
    this.pointer = null;
    this.pourSfxTimer = 0;
    this.lastBurntTapTime = [-10, -10, -10, -10];
    this.queue.startShift(shift, this.upgrades);
  }

  public addPopup(
    x: number,
    y: number,
    text: string,
    color: string,
    scale = 1
  ): void {
    this.popups.push({
      id: `pop_${this.nextId++}`,
      x,
      y,
      text,
      color,
      alpha: 1,
      vy: -42,
      scale,
    });
  }

  public spawnParticles(
    x: number,
    y: number,
    count: number,
    color: string,
    kind: Particle['kind']
  ): void {
    for (let i = 0; i < count; i++) {
      const angle =
        kind === 'STEAM'
          ? -Math.PI * 0.5 + (Math.random() - 0.5) * 0.75
          : kind === 'HEART'
            ? -Math.PI * 0.5 + (Math.random() - 0.5) * 1.4
            : Math.random() * Math.PI * 2;
      const speed =
        kind === 'STEAM'
          ? 20 + Math.random() * 24
          : kind === 'HEART'
            ? 30 + Math.random() * 48
            : 40 + Math.random() * 80;
      const maxLife =
        kind === 'STEAM'
          ? 0.75 + Math.random() * 0.35
          : 0.48 + Math.random() * 0.3;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 14,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: kind === 'STEAM' ? 6 + Math.random() * 5 : 4 + Math.random() * 4,
        color,
        alpha: 1,
        life: 0,
        maxLife,
        kind,
      });
    }
  }

  public triggerShake(amount: number): void {
    this.screenShake = Math.max(this.screenShake, amount);
  }

  public update(dt: number): void {
    this.elapsed += dt;
    this.queue.update(dt);
    this.updateTehTarik(dt);
    this.updateKuali(dt);
    this.updateEffects(dt);
  }

  public onPointerDown(pointerId: number, x: number, y: number): void {
    if (this.pointer !== null) return;
    this.audio.unlock();

    // Customer Rail
    const customerSlot = this.queue.getSlotAtPoint(x, y);
    if (customerSlot !== null) {
      this.pointer = {
        pointerId,
        startX: x,
        startY: y,
        anchorX: x,
        anchorY: y,
        x,
        y,
        source: 'CUSTOMER',
        customerSlot,
        swiped: false,
        dragging: false,
      };
      return;
    }

    // Teh Tarik Ready Tray (lower half)
    if (pointInRect(x, y, TEH_TRAY_RECT)) {
      this.pointer = {
        pointerId,
        startX: x,
        startY: y,
        anchorX: x,
        anchorY: y,
        x,
        y,
        source: 'TEH_TRAY',
        swiped: false,
        dragging: false,
      };
      // If tray is empty, holding anywhere on Teh Tarik station still pulls!
      if (this.tehTarik.readyCount === 0 && this.tehTarik.spilledTimer <= 0) {
        this.pointer.source = 'TEH_PULL';
        this.startTehPull();
      }
      return;
    }

    // Teh Tarik Pull Urn (upper half)
    if (pointInRect(x, y, TEH_PULL_RECT)) {
      this.pointer = {
        pointerId,
        startX: x,
        startY: y,
        anchorX: x,
        anchorY: y,
        x,
        y,
        source: 'TEH_PULL',
        swiped: false,
        dragging: false,
      };
      if (this.tehTarik.readyCount < this.tehTarik.maxCups && this.tehTarik.spilledTimer <= 0) {
        this.startTehPull();
      }
      return;
    }

    // Kuali Slots
    for (let i = 0; i < KUALI_SLOT_RECTS.length; i++) {
      if (pointInRect(x, y, KUALI_SLOT_RECTS[i]!)) {
        this.pointer = {
          pointerId,
          startX: x,
          startY: y,
          anchorX: x,
          anchorY: y,
          x,
          y,
          source: 'KUALI',
          slotIndex: i,
          swiped: false,
          dragging: false,
        };
        return;
      }
    }

    // Serving Plates
    for (let i = 0; i < PLATE_SLOT_RECTS.length; i++) {
      if (pointInRect(x, y, PLATE_SLOT_RECTS[i]!)) {
        this.pointer = {
          pointerId,
          startX: x,
          startY: y,
          anchorX: x,
          anchorY: y,
          x,
          y,
          source: 'PLATE',
          slotIndex: i,
          swiped: false,
          dragging: false,
        };
        return;
      }
    }

    // Prep Board
    if (pointInRect(x, y, PREP_BOARD_RECT)) {
      this.pointer = {
        pointerId,
        startX: x,
        startY: y,
        anchorX: x,
        anchorY: y,
        x,
        y,
        source: 'PREP',
        swiped: false,
        dragging: false,
      };
      return;
    }

    // Bottom Dock
    const dockId = this.getDockAtPoint(x, y);
    if (dockId !== null) {
      this.pointer = {
        pointerId,
        startX: x,
        startY: y,
        anchorX: x,
        anchorY: y,
        x,
        y,
        source: 'DOCK',
        dockId,
        swiped: false,
        dragging: false,
      };
      return;
    }

    this.pointer = {
      pointerId,
      startX: x,
      startY: y,
      anchorX: x,
      anchorY: y,
      x,
      y,
      source: 'NONE',
      swiped: false,
      dragging: false,
    };
  }

  public onPointerMove(pointerId: number, x: number, y: number): void {
    if (this.pointer === null || this.pointer.pointerId !== pointerId) return;
    this.pointer.x = x;
    this.pointer.y = y;

    const dxFromAnchor = x - this.pointer.anchorX;
    const dyFromAnchor = y - this.pointer.anchorY;
    const distFromStart = Math.hypot(x - this.pointer.startX, y - this.pointer.startY);

    // Prep Board swipe gestures
    if (this.pointer.source === 'PREP') {
      if (
        this.prep.item === 'DOUGH' &&
        this.prep.swipesDone < this.prep.swipesRequired &&
        Math.abs(dxFromAnchor) > SWIPE_HORIZONTAL_THRESHOLD &&
        Math.abs(dxFromAnchor) > Math.abs(dyFromAnchor)
      ) {
        this.prep.swipesDone = Math.min(this.prep.swipesRequired, this.prep.swipesDone + 1);
        this.pointer.anchorX = x;
        this.pointer.anchorY = y;
        this.pointer.swiped = true;
        this.audio.playFlip();
        this.spawnParticles(
          PREP_BOARD_RECT.x + PREP_BOARD_RECT.w * 0.5,
          PREP_BOARD_RECT.y + 100,
          6,
          '#FEF3C7',
          'SPARK'
        );
        if (this.prep.swipesDone >= this.prep.swipesRequired) {
          this.addPopup(
            PREP_BOARD_RECT.x + PREP_BOARD_RECT.w * 0.5,
            PREP_BOARD_RECT.y + 72,
            'Tap to Toss!',
            '#F59E0B'
          );
        }
      } else if (
        this.prep.item === 'VEG' &&
        this.prep.swipesDone < this.prep.swipesRequired &&
        dyFromAnchor > SWIPE_DOWN_THRESHOLD &&
        dyFromAnchor > Math.abs(dxFromAnchor)
      ) {
        this.prep.swipesDone += 1;
        this.pointer.anchorX = x;
        this.pointer.anchorY = y;
        this.pointer.swiped = true;
        this.audio.playChop();
        this.spawnParticles(
          PREP_BOARD_RECT.x + PREP_BOARD_RECT.w * 0.5,
          PREP_BOARD_RECT.y + 105,
          7,
          '#4ADE80',
          'SPARK'
        );
        if (this.prep.swipesDone >= this.prep.swipesRequired) {
          const yieldAmt = getVegYield(this.upgrades);
          this.prep.slicedStock += yieldAmt;
          this.prep.item = null;
          this.prep.swipesDone = 0;
          this.prep.swipesRequired = 0;
          this.addPopup(
            PREP_BOARD_RECT.x + PREP_BOARD_RECT.w * 0.5,
            PREP_BOARD_RECT.y + 72,
            `+${yieldAmt} Veg`,
            '#4ADE80'
          );
        }
      }
      return;
    }

    // Kuali swipe-up to flip OR drag cooked patty / egg / wrapped burger / burnt item
    if (this.pointer.source === 'KUALI' && this.pointer.slotIndex !== undefined) {
      const slotIndex = this.pointer.slotIndex;
      const slot = this.kuali[slotIndex];
      if (!slot || !slot.unlocked) return;

      if (
        !this.pointer.swiped &&
        !this.pointer.dragging &&
        (slot.item === 'ROTI' || slot.item === 'PATTY') &&
        (slot.state === 'READY_FLIP' ||
          (slot.state === 'COOKING_SIDE1' && slot.progress >= 0.45)) &&
        dyFromAnchor < -SWIPE_UP_THRESHOLD &&
        Math.abs(dyFromAnchor) > Math.abs(dxFromAnchor)
      ) {
        this.flipKualiSlot(slotIndex);
        this.pointer.swiped = true;
        return;
      }

      if (!this.pointer.swiped && slot.item !== null && distFromStart >= DRAG_START_DISTANCE) {
        const canDrag =
          slot.state === 'BURNT' ||
          (slot.item === 'PATTY' && slot.state === 'COOKED') ||
          (slot.item === 'EGG' && slot.state === 'COOKED') ||
          slot.item === 'WRAPPED_BURGER';

        if (canDrag) {
          this.pointer.dragging = true;
          this.activeDrag = {
            source: `KUALI_${slotIndex}`,
            dish: slot.item === 'WRAPPED_BURGER' ? 'BURGER_RAMLY' : undefined,
            item: slot.item,
            x,
            y,
          };
        }
      } else if (this.pointer.dragging && this.activeDrag) {
        this.activeDrag.x = x;
        this.activeDrag.y = y;
      }
      return;
    }

    // Serving Plate drag
    if (this.pointer.source === 'PLATE' && this.pointer.slotIndex !== undefined) {
      const plate = this.plates[this.pointer.slotIndex];
      if (!plate || !plate.unlocked || plate.dish === null) return;

      if (!this.pointer.dragging && distFromStart >= DRAG_START_DISTANCE) {
        this.pointer.dragging = true;
        this.activeDrag = {
          source: `PLATE_${plate.id}`,
          dish: plate.dish,
          x,
          y,
        };
      } else if (this.pointer.dragging && this.activeDrag) {
        this.activeDrag.x = x;
        this.activeDrag.y = y;
      }
      return;
    }

    // Teh Tarik Ready Tray drag
    if (this.pointer.source === 'TEH_TRAY' && this.tehTarik.readyCount > 0) {
      if (!this.pointer.dragging && distFromStart >= DRAG_START_DISTANCE) {
        this.pointer.dragging = true;
        this.activeDrag = {
          source: 'TEH_TRAY',
          dish: 'TEH_TARIK',
          x,
          y,
        };
      } else if (this.pointer.dragging && this.activeDrag) {
        this.activeDrag.x = x;
        this.activeDrag.y = y;
      }
    }
  }

  public onPointerUp(pointerId: number, x: number, y: number): void {
    if (this.pointer === null || this.pointer.pointerId !== pointerId) return;

    const session = this.pointer;
    this.pointer = null;

    // Finalize Teh Tarik pull release
    if (session.source === 'TEH_PULL' && this.tehTarik.isPulling) {
      this.tehTarik.isPulling = false;
      if (this.tehTarik.fillLevel > this.tehTarik.sweetMax) {
        this.triggerTehSpill();
      } else if (this.tehTarik.fillLevel >= this.tehTarik.sweetMin) {
        this.tehTarik.readyCount = Math.min(
          this.tehTarik.maxCups,
          this.tehTarik.readyCount + 1
        );
        this.tehTarik.fillLevel = 0;
        this.audio.playFlip();
        this.addPopup(
          TEH_PULL_RECT.x + TEH_PULL_RECT.w * 0.5,
          TEH_PULL_RECT.y + 44,
          'Tarik!',
          '#F59E0B',
          1.1
        );
        this.spawnParticles(
          TEH_PULL_RECT.x + TEH_PULL_RECT.w * 0.5,
          TEH_PULL_RECT.y + 72,
          9,
          '#FDE047',
          'SPARK'
        );
      } else {
        this.tehTarik.fillLevel = 0;
      }
      this.activeDrag = null;
      return;
    }

    // Handle active drag drop
    if (session.dragging && this.activeDrag !== null) {
      this.handleDragDrop(session, x, y);
      this.activeDrag = null;
      return;
    }

    this.activeDrag = null;
    if (session.swiped) return;

    // Tap interactions
    switch (session.source) {
      case 'TEH_TRAY':
        this.tryServeTehTarik();
        break;

      case 'TEH_PULL':
        // If cups are full and user taps urn, serve a cup for convenience
        if (this.tehTarik.readyCount >= this.tehTarik.maxCups) {
          this.tryServeTehTarik();
        }
        break;

      case 'PREP':
        this.handlePrepTap();
        break;

      case 'KUALI':
        if (session.slotIndex !== undefined) {
          this.handleKualiTap(session.slotIndex);
        }
        break;

      case 'PLATE':
        if (session.slotIndex !== undefined) {
          this.handlePlateTap(session.slotIndex);
        }
        break;

      case 'CUSTOMER':
        if (session.customerSlot !== undefined) {
          this.handleCustomerTap(session.customerSlot);
        }
        break;

      case 'DOCK':
        if (session.dockId !== undefined) {
          this.handleDockTap(session.dockId);
        }
        break;

      default:
        break;
    }
  }

  public onPointerCancel(pointerId: number): void {
    if (this.pointer === null || this.pointer.pointerId !== pointerId) return;
    if (this.tehTarik.isPulling) {
      this.tehTarik.isPulling = false;
      this.tehTarik.fillLevel = 0;
    }
    this.pointer = null;
    this.activeDrag = null;
  }

  public getSnapshot(): GameSnapshot {
    return {
      shift: this.queue.shift,
      cashRM: this.queue.cashRM,
      walletRM: this.walletRM,
      targetRM: this.queue.targetRM,
      shiftTimeLeft: this.queue.shiftTimeLeft,
      combo: this.queue.combo,
      isFever: this.queue.isFever(),
      kuali: this.kuali.map((k) => ({ ...k })),
      prep: { ...this.prep },
      tehTarik: { ...this.tehTarik },
      plates: this.plates.map((p) => ({ ...p })),
      customers: this.queue.customers.map((c) => ({
        ...c,
        items: [...c.items],
        fulfilled: [...c.fulfilled],
      })),
      flyingDishes: this.flyingDishes,
      popups: this.popups,
      particles: this.particles,
      screenShake: this.screenShake,
      activeDrag: this.activeDrag ? { ...this.activeDrag } : null,
      upgrades: { ...this.upgrades },
      starsEarned: this.queue.getStarsEarned(),
    };
  }

  private startTehPull(): void {
    this.tehTarik.isPulling = true;
    this.pourSfxTimer = 0;
    this.audio.playPour(this.tehTarik.fillLevel);
  }

  private updateTehTarik(dt: number): void {
    if (this.tehTarik.spilledTimer > 0) {
      this.tehTarik.spilledTimer = Math.max(0, this.tehTarik.spilledTimer - dt);
    }

    if (this.tehTarik.isPulling) {
      const duration = getTehFillDuration(this.upgrades);
      this.tehTarik.fillLevel += dt / duration;
      this.pourSfxTimer += dt;
      if (this.pourSfxTimer >= TEH_POUR_SFX_INTERVAL) {
        this.pourSfxTimer = 0;
        this.audio.playPour(Math.min(1, this.tehTarik.fillLevel));
      }

      if (this.tehTarik.fillLevel > this.tehTarik.sweetMax) {
        this.triggerTehSpill();
      }
    }
  }

  private triggerTehSpill(): void {
    this.tehTarik.isPulling = false;
    this.tehTarik.fillLevel = 0;
    this.tehTarik.spilledTimer = 0.9;
    this.audio.playSpill();
    this.triggerShake(0.22);
    this.addPopup(
      TEH_PULL_RECT.x + TEH_PULL_RECT.w * 0.5,
      TEH_PULL_RECT.y + 52,
      'Tumpah!',
      '#EF4444'
    );
    this.spawnParticles(
      TEH_PULL_RECT.x + TEH_PULL_RECT.w * 0.5,
      TEH_PULL_RECT.y + 82,
      10,
      '#D97706',
      'SPARK'
    );
  }

  private updateKuali(dt: number): void {
    this.steamTimer += dt;
    const emitSteam = this.steamTimer >= 0.3;
    if (emitSteam) {
      this.steamTimer = 0;
    }

    const speedMult = getCookSpeedMultiplier(this.upgrades);

    for (let i = 0; i < this.kuali.length; i++) {
      const slot = this.kuali[i]!;
      if (!slot.unlocked || slot.item === null || slot.state === 'BURNT') continue;

      if (emitSteam) {
        const r = KUALI_SLOT_RECTS[i]!;
        this.spawnParticles(
          r.x + r.w * 0.5,
          r.y + r.h * 0.35,
          1,
          slot.burnProgress > 0.2 ? '#71717A' : '#FFF7ED',
          'STEAM'
        );
      }

      const duration = this.getCookDuration(slot.item) / speedMult;
      if (slot.progress < 1) {
        slot.progress = Math.min(1, slot.progress + dt / duration);
      } else {
        slot.burnProgress = Math.min(1, slot.burnProgress + dt / BURN_DURATION);
      }

      if (slot.item === 'ROTI' || slot.item === 'PATTY') {
        if (slot.state === 'COOKING_SIDE1' && slot.progress >= 0.45) {
          slot.state = 'READY_FLIP';
        } else if (slot.state === 'COOKING_SIDE2' && slot.progress >= 0.85) {
          slot.state = 'COOKED';
        }
      } else if (slot.item === 'EGG') {
        if (slot.state === 'COOKING_SIDE1' && slot.progress >= 0.85) {
          slot.state = 'COOKED';
        }
      }

      if (slot.burnProgress >= 1) {
        slot.state = 'BURNT';
        slot.burnProgress = 1;
        this.audio.playBurn();
        this.triggerShake(0.25);
        const r = KUALI_SLOT_RECTS[i]!;
        this.addPopup(r.x + r.w * 0.5, r.y + 34, 'HANGUS!', '#EF4444', 1.1);
        this.spawnParticles(r.x + r.w * 0.5, r.y + r.h * 0.5, 10, '#3F3F46', 'STEAM');
      }
    }
  }

  private updateEffects(dt: number): void {
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 1.6);
    }

    for (let i = this.flyingDishes.length - 1; i >= 0; i--) {
      const f = this.flyingDishes[i]!;
      f.progress += dt * 4.2;
      if (f.progress >= 1) {
        this.flyingDishes.splice(i, 1);
      }
    }

    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i]!;
      p.y += p.vy * dt;
      p.alpha -= dt * 1.05;
      if (p.alpha <= 0) {
        this.popups.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i]!;
      pt.life += dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.alpha = Math.max(0, 1 - pt.life / pt.maxLife);
      if (pt.life >= pt.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  private launchFlyingDish(
    dish: DishType,
    startX: number,
    startY: number,
    customerSlot: 0 | 1 | 2 | 3
  ): void {
    const cr = CUSTOMER_SLOT_RECTS[customerSlot];
    this.flyingDishes.push({
      id: `fly_${this.nextId++}`,
      dish,
      startX,
      startY,
      targetX: cr.x + cr.w * 0.5,
      targetY: cr.y + cr.h * 0.52,
      progress: 0,
    });
  }

  private getCookDuration(item: NonNullable<KualiSlot['item']>): number {
    switch (item) {
      case 'ROTI':
        return ROTI_COOK_DURATION;
      case 'PATTY':
        return PATTY_COOK_DURATION;
      case 'EGG':
        return EGG_COOK_DURATION;
      case 'WRAPPED_BURGER':
        return WRAPPED_HOLD_DURATION;
    }
  }

  private findOpenKualiSlot(): number | null {
    for (const slot of this.kuali) {
      if (slot.unlocked && slot.item === null) return slot.id;
    }
    return null;
  }

  private findOpenPlateSlot(): number | null {
    for (const plate of this.plates) {
      if (plate.unlocked && plate.dish === null) return plate.id;
    }
    return null;
  }

  private flipKualiSlot(slotIndex: number): void {
    const slot = this.kuali[slotIndex];
    if (!slot) return;
    slot.state = 'COOKING_SIDE2';
    slot.progress = Math.max(slot.progress, 0.5);
    slot.burnProgress = 0;
    this.audio.playFlip();
    const r = KUALI_SLOT_RECTS[slotIndex]!;
    this.addPopup(r.x + r.w * 0.5, r.y + 28, 'Flip!', '#F59E0B');
    this.spawnParticles(r.x + r.w * 0.5, r.y + r.h * 0.5, 8, '#FDE047', 'SPARK');
  }

  private handlePrepTap(): void {
    if (this.prep.item === 'DOUGH' && this.prep.swipesDone >= this.prep.swipesRequired) {
      const openSlot = this.findOpenKualiSlot();
      if (openSlot === null) {
        this.addPopup(
          PREP_BOARD_RECT.x + PREP_BOARD_RECT.w * 0.5,
          PREP_BOARD_RECT.y + 80,
          'Kuali Full!',
          '#F87171'
        );
        return;
      }
      const slot = this.kuali[openSlot]!;
      slot.item = 'ROTI';
      slot.state = 'COOKING_SIDE1';
      slot.progress = 0;
      slot.burnProgress = 0;
      slot.hasGarnish = false;
      slot.hasSauce = false;
      this.prep.item = null;
      this.prep.swipesDone = 0;
      this.prep.swipesRequired = 0;
      this.audio.playSizzle();
    }
  }

  private handleKualiTap(slotIndex: number): void {
    const slot = this.kuali[slotIndex];
    if (!slot || !slot.unlocked || slot.item === null) return;

    // Double-tap burnt item to clear it
    if (slot.state === 'BURNT') {
      const prev = this.lastBurntTapTime[slotIndex] ?? -10;
      if (this.elapsed - prev <= DOUBLE_TAP_WINDOW_SECONDS) {
        this.clearKualiSlot(slotIndex);
        this.lastBurntTapTime[slotIndex] = -10;
        const r = KUALI_SLOT_RECTS[slotIndex]!;
        this.addPopup(r.x + r.w * 0.5, r.y + 34, 'Cleared', '#A1A1AA');
      } else {
        this.lastBurntTapTime[slotIndex] = this.elapsed;
      }
      return;
    }

    // Tap cooked Roti Canai to move to an open Serving Plate
    if (slot.item === 'ROTI' && slot.state === 'COOKED' && slot.progress >= 0.85) {
      const openPlate = this.findOpenPlateSlot();
      if (openPlate === null) {
        this.addPopup(
          PLATES_RECT.x + PLATES_RECT.w * 0.5,
          PLATES_RECT.y + 30,
          'Plates Full!',
          '#F87171'
        );
        return;
      }
      this.plates[openPlate]!.dish = 'ROTI_CANAI';
      this.clearKualiSlot(slotIndex);
      this.audio.playFlip();
      const pr = PLATE_SLOT_RECTS[openPlate]!;
      this.spawnParticles(pr.x + pr.w * 0.5, pr.y + pr.h * 0.5, 7, '#FDE047', 'SPARK');
      return;
    }

    // Tap cooked Egg -> if a plated ROTI_CANAI is waiting, upgrade it to ROTI_TELUR!
    if (slot.item === 'EGG' && slot.state === 'COOKED') {
      const rotiPlate = this.plates.find((p) => p.unlocked && p.dish === 'ROTI_CANAI');
      if (rotiPlate) {
        rotiPlate.dish = 'ROTI_TELUR';
        this.clearKualiSlot(slotIndex);
        this.audio.playFlip();
        const pr = PLATE_SLOT_RECTS[rotiPlate.id]!;
        this.addPopup(pr.x + pr.w * 0.5, pr.y + 22, 'Roti Telur!', '#FACC15');
        this.spawnParticles(pr.x + pr.w * 0.5, pr.y + pr.h * 0.5, 9, '#FDE047', 'SPARK');
      }
    }
  }

  private handlePlateTap(plateIndex: number): void {
    const plate = this.plates[plateIndex];
    if (!plate || !plate.unlocked || plate.dish === null) return;
    const dish = plate.dish;
    const res = this.queue.serveDish(dish);
    if (res.served && res.slotIndex !== undefined) {
      const pr = PLATE_SLOT_RECTS[plateIndex]!;
      this.launchFlyingDish(dish, pr.x + pr.w * 0.5, pr.y + pr.h * 0.5, res.slotIndex);
      plate.dish = null;
    }
  }

  private tryServeTehTarik(targetCustomerSlot?: 0 | 1 | 2 | 3): boolean {
    if (this.tehTarik.readyCount <= 0) return false;
    const res = this.queue.serveDish('TEH_TARIK', targetCustomerSlot);
    if (res.served && res.slotIndex !== undefined) {
      this.tehTarik.readyCount -= 1;
      this.launchFlyingDish(
        'TEH_TARIK',
        TEH_TRAY_RECT.x + TEH_TRAY_RECT.w * 0.5,
        TEH_TRAY_RECT.y + TEH_TRAY_RECT.h * 0.5,
        res.slotIndex
      );
      return true;
    }
    return false;
  }

  private handleCustomerTap(slotIndex: 0 | 1 | 2 | 3): void {
    // Try any matching plated dish first
    for (const plate of this.plates) {
      if (plate.unlocked && plate.dish !== null) {
        const dish = plate.dish;
        const res = this.queue.serveDish(dish, slotIndex);
        if (res.served) {
          const pr = PLATE_SLOT_RECTS[plate.id]!;
          this.launchFlyingDish(dish, pr.x + pr.w * 0.5, pr.y + pr.h * 0.5, slotIndex);
          plate.dish = null;
          return;
        }
      }
    }
    // Otherwise try Teh Tarik
    if (this.tehTarik.readyCount > 0) {
      this.tryServeTehTarik(slotIndex);
    }
  }

  private handleDockTap(dockId: DockButtonId): void {
    const r = DOCK_RECTS[dockId];
    const cx = r.x + r.w * 0.5;
    const cy = r.y + 8;

    switch (dockId) {
      case 'DOUGH': {
        if (this.prep.item === null) {
          this.prep.item = 'DOUGH';
          this.prep.swipesDone = 0;
          this.prep.swipesRequired = getDoughSwipesRequired(this.upgrades);
          this.audio.playFlip();
        }
        break;
      }

      case 'VEG': {
        const burgerSlot = this.findWrappedBurger((s) => !s.hasGarnish);
        if (burgerSlot !== null && this.prep.slicedStock > 0) {
          burgerSlot.hasGarnish = true;
          this.prep.slicedStock -= 1;
          this.audio.playChop();
          const kr = KUALI_SLOT_RECTS[burgerSlot.id]!;
          this.addPopup(kr.x + kr.w * 0.5, kr.y + 26, '+Veg', '#4ADE80');
          return;
        }
        if (this.prep.item === null) {
          this.prep.item = 'VEG';
          this.prep.swipesDone = 0;
          this.prep.swipesRequired = getVegSwipesRequired(this.upgrades);
          this.audio.playChop();
        }
        break;
      }

      case 'PATTY': {
        const openSlot = this.findOpenKualiSlot();
        if (openSlot === null) {
          this.addPopup(cx, cy, 'Kuali Full!', '#F87171');
          return;
        }
        const slot = this.kuali[openSlot]!;
        slot.item = 'PATTY';
        slot.state = 'COOKING_SIDE1';
        slot.progress = 0;
        slot.burnProgress = 0;
        slot.hasGarnish = false;
        slot.hasSauce = false;
        this.audio.playSizzle();
        break;
      }

      case 'EGG': {
        const openSlot = this.findOpenKualiSlot();
        if (openSlot === null) {
          this.addPopup(cx, cy, 'Kuali Full!', '#F87171');
          return;
        }
        const slot = this.kuali[openSlot]!;
        slot.item = 'EGG';
        slot.state = 'COOKING_SIDE1';
        slot.progress = 0;
        slot.burnProgress = 0;
        slot.hasGarnish = false;
        slot.hasSauce = false;
        this.audio.playSizzle();
        break;
      }

      case 'SAUCE': {
        const burgerSlot = this.findWrappedBurger((s) => !s.hasSauce);
        if (burgerSlot !== null) {
          burgerSlot.hasSauce = true;
          this.audio.playFlip();
          const kr = KUALI_SLOT_RECTS[burgerSlot.id]!;
          this.addPopup(kr.x + kr.w * 0.5, kr.y + 26, '+Sauce', '#FB923C');
        }
        break;
      }

      case 'WRAPPER': {
        const readyBurger = this.findWrappedBurger((s) => s.hasGarnish && s.hasSauce);
        if (readyBurger !== null) {
          this.plateWrappedBurger(readyBurger.id);
        }
        break;
      }

      case 'TRASH': {
        for (const slot of this.kuali) {
          if (slot.unlocked && slot.state === 'BURNT') {
            this.clearKualiSlot(slot.id);
            this.addPopup(cx, cy, 'Cleared', '#A1A1AA');
            return;
          }
        }
        break;
      }
    }
  }

  private handleDragDrop(session: PointerSession, x: number, y: number): void {
    const overTrash = pointInRect(x, y, DOCK_RECTS.TRASH);
    const overWrapper = pointInRect(x, y, DOCK_RECTS.WRAPPER);
    const customerSlot = this.queue.getSlotAtPoint(x, y);

    if (session.source === 'PLATE' && session.slotIndex !== undefined) {
      const plate = this.plates[session.slotIndex];
      if (!plate || plate.dish === null) return;
      if (overTrash) {
        plate.dish = null;
        this.addPopup(
          DOCK_RECTS.TRASH.x + DOCK_RECTS.TRASH.w * 0.5,
          DOCK_RECTS.TRASH.y + 10,
          'Trashed',
          '#A1A1AA'
        );
        return;
      }
      if (customerSlot !== null) {
        const dish = plate.dish;
        const res = this.queue.serveDish(dish, customerSlot);
        if (res.served) {
          this.launchFlyingDish(dish, x, y, customerSlot);
          plate.dish = null;
        }
      }
      return;
    }

    if (session.source === 'TEH_TRAY' && this.tehTarik.readyCount > 0) {
      if (overTrash) {
        this.tehTarik.readyCount -= 1;
        this.addPopup(
          DOCK_RECTS.TRASH.x + DOCK_RECTS.TRASH.w * 0.5,
          DOCK_RECTS.TRASH.y + 10,
          'Trashed',
          '#A1A1AA'
        );
        return;
      }
      if (customerSlot !== null) {
        const res = this.queue.serveDish('TEH_TARIK', customerSlot);
        if (res.served) {
          this.tehTarik.readyCount -= 1;
          this.launchFlyingDish('TEH_TARIK', x, y, customerSlot);
        }
      }
      return;
    }

    if (session.source === 'KUALI' && session.slotIndex !== undefined) {
      const fromIndex = session.slotIndex;
      const fromSlot = this.kuali[fromIndex];
      if (!fromSlot || fromSlot.item === null) return;

      if (overTrash) {
        this.clearKualiSlot(fromIndex);
        this.addPopup(
          DOCK_RECTS.TRASH.x + DOCK_RECTS.TRASH.w * 0.5,
          DOCK_RECTS.TRASH.y + 10,
          'Trashed',
          '#A1A1AA'
        );
        return;
      }

      // Drag cooked PATTY onto any EGG slot -> WRAPPED_BURGER
      if (fromSlot.item === 'PATTY' && fromSlot.state === 'COOKED') {
        for (let i = 0; i < this.kuali.length; i++) {
          if (i === fromIndex) continue;
          const toSlot = this.kuali[i]!;
          if (
            toSlot.unlocked &&
            toSlot.item === 'EGG' &&
            toSlot.state !== 'BURNT' &&
            pointInRect(x, y, KUALI_SLOT_RECTS[i]!)
          ) {
            toSlot.item = 'WRAPPED_BURGER';
            toSlot.state = 'COOKED';
            toSlot.progress = 0.85;
            toSlot.burnProgress = 0;
            toSlot.hasGarnish = false;
            toSlot.hasSauce = false;
            this.clearKualiSlot(fromIndex);
            this.audio.playFlip();
            const r = KUALI_SLOT_RECTS[i]!;
            this.addPopup(r.x + r.w * 0.5, r.y + 26, 'Wrapped!', '#F59E0B');
            this.spawnParticles(r.x + r.w * 0.5, r.y + r.h * 0.5, 9, '#FDE047', 'SPARK');
            return;
          }
        }
      }

      // Drag cooked EGG onto any ROTI_CANAI plate -> ROTI_TELUR
      if (fromSlot.item === 'EGG' && fromSlot.state === 'COOKED') {
        for (let i = 0; i < this.plates.length; i++) {
          const plate = this.plates[i]!;
          if (
            plate.unlocked &&
            plate.dish === 'ROTI_CANAI' &&
            pointInRect(x, y, PLATE_SLOT_RECTS[i]!)
          ) {
            plate.dish = 'ROTI_TELUR';
            this.clearKualiSlot(fromIndex);
            this.audio.playFlip();
            const pr = PLATE_SLOT_RECTS[i]!;
            this.addPopup(pr.x + pr.w * 0.5, pr.y + 22, 'Roti Telur!', '#FACC15');
            this.spawnParticles(pr.x + pr.w * 0.5, pr.y + pr.h * 0.5, 9, '#FDE047', 'SPARK');
            return;
          }
        }
      }

      // Drag dressed WRAPPED_BURGER onto WRAPPER dock (or open plate) -> plate BURGER_RAMLY
      if (
        fromSlot.item === 'WRAPPED_BURGER' &&
        fromSlot.state !== 'BURNT' &&
        fromSlot.hasGarnish &&
        fromSlot.hasSauce &&
        (overWrapper || pointInRect(x, y, PLATES_RECT))
      ) {
        this.plateWrappedBurger(fromIndex);
      }
    }
  }

  private plateWrappedBurger(slotIndex: number): void {
    const openPlate = this.findOpenPlateSlot();
    if (openPlate === null) {
      this.addPopup(
        PLATES_RECT.x + PLATES_RECT.w * 0.5,
        PLATES_RECT.y + 30,
        'Plates Full!',
        '#F87171'
      );
      return;
    }
    this.plates[openPlate]!.dish = 'BURGER_RAMLY';
    this.clearKualiSlot(slotIndex);
    this.audio.playFlip();
    const pr = PLATE_SLOT_RECTS[openPlate]!;
    this.spawnParticles(pr.x + pr.w * 0.5, pr.y + pr.h * 0.5, 9, '#FDE047', 'SPARK');
  }

  private findWrappedBurger(predicate: (slot: KualiSlot) => boolean): KualiSlot | null {
    for (const slot of this.kuali) {
      if (
        slot.unlocked &&
        slot.item === 'WRAPPED_BURGER' &&
        slot.state !== 'BURNT' &&
        predicate(slot)
      ) {
        return slot;
      }
    }
    return null;
  }

  private clearKualiSlot(slotIndex: number): void {
    const slot = this.kuali[slotIndex];
    if (!slot) return;
    this.kuali[slotIndex] = createKualiSlot(slotIndex, slot.unlocked);
  }

  private getDockAtPoint(x: number, y: number): DockButtonId | null {
    for (const [id, rect] of Object.entries(DOCK_RECTS) as [DockButtonId, Rect][]) {
      if (pointInRect(x, y, rect)) {
        return id;
      }
    }
    return null;
  }
}

export { CUSTOMER_SLOT_RECTS };
