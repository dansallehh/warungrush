import type {
  AssemblyPlateState,
  AudioController,
  DishType,
  FloatingPopup,
  GameSnapshot,
  KualiSlot,
  Particle,
  PrepBoardState,
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

export const TEH_TARIK_RECT: Rect = { x: 12, y: 235, w: 103, h: 400 };
export const KUALI_RECT: Rect = { x: 125, y: 235, w: 150, h: 275 };
export const KUALI_SLOT_RECTS: readonly [Rect, Rect] = [
  { x: 125, y: 245, w: 150, h: 120 },
  { x: 125, y: 380, w: 150, h: 120 },
];
export const ASSEMBLY_PLATE_RECT: Rect = { x: 125, y: 525, w: 150, h: 110 };
export const PREP_BOARD_RECT: Rect = { x: 285, y: 235, w: 93, h: 400 };

export const DOCK_RECTS: Readonly<Record<DockButtonId, Rect>> = {
  DOUGH: { x: 12, y: 660, w: 86, h: 76 },
  PATTY: { x: 106, y: 660, w: 86, h: 76 },
  EGG: { x: 200, y: 660, w: 86, h: 76 },
  VEG: { x: 294, y: 660, w: 86, h: 76 },
  SAUCE: { x: 12, y: 744, w: 115, h: 76 },
  WRAPPER: { x: 137, y: 744, w: 116, h: 76 },
  TRASH: { x: 263, y: 744, w: 115, h: 76 },
};

const TEH_FILL_DURATION = 1.8;
const TEH_READY_MIN = 0.75;
const TEH_READY_MAX = 0.9;
const TEH_POUR_SFX_INTERVAL = 0.14;

const ROTI_COOK_DURATION = 3.5;
const PATTY_COOK_DURATION = 4.0;
const EGG_COOK_DURATION = 2.0;
const WRAPPED_HOLD_DURATION = 5.0;
const BURN_DURATION = 2.5;

const SWIPE_HORIZONTAL_THRESHOLD = 35;
const SWIPE_UP_THRESHOLD = 35;
const SWIPE_DOWN_THRESHOLD = 30;
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
    | 'TEH_TARIK'
    | 'PREP'
    | 'KUALI_0'
    | 'KUALI_1'
    | 'PLATE'
    | 'CUSTOMER'
    | 'DOCK'
    | 'NONE';
  dockId?: DockButtonId;
  customerSlot?: 0 | 1 | 2;
  swiped: boolean;
  dragging: boolean;
}

function pointInRect(x: number, y: number, r: Rect): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function createEmptyKualiSlot(id: 0 | 1): KualiSlot {
  return {
    id,
    item: null,
    state: 'RAW',
    progress: 0,
    burnProgress: 0,
    hasGarnish: false,
    hasSauce: false,
  };
}

export class Stations implements FeedbackSink {
  public kuali: [KualiSlot, KualiSlot] = [
    createEmptyKualiSlot(0),
    createEmptyKualiSlot(1),
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
    isReady: false,
    spilledTimer: 0,
  };
  public plate: AssemblyPlateState = {
    dish: null,
  };
  public popups: FloatingPopup[] = [];
  public particles: Particle[] = [];
  public screenShake = 0;
  public activeDrag: {
    source: string;
    dish?: DishType;
    x: number;
    y: number;
  } | null = null;

  private readonly audio: AudioController;
  private readonly queue: CustomerQueue;
  private pointer: PointerSession | null = null;
  private pourSfxTimer = 0;
  private steamTimer = 0;
  private elapsed = 0;
  private nextPopupId = 1;
  private lastBurntTapTime: [number, number] = [-10, -10];

  constructor(audio: AudioController, queue?: CustomerQueue) {
    this.audio = audio;
    this.queue = queue ?? new CustomerQueue(audio, this);
  }

  public getCustomerQueue(): CustomerQueue {
    return this.queue;
  }

  public resetForShift(shift: number): void {
    this.kuali = [createEmptyKualiSlot(0), createEmptyKualiSlot(1)];
    this.prep = {
      item: null,
      swipesDone: 0,
      swipesRequired: 0,
      slicedStock: 0,
    };
    this.tehTarik = {
      isPulling: false,
      fillLevel: 0,
      isReady: false,
      spilledTimer: 0,
    };
    this.plate = { dish: null };
    this.popups = [];
    this.particles = [];
    this.screenShake = 0;
    this.activeDrag = null;
    this.pointer = null;
    this.pourSfxTimer = 0;
    this.lastBurntTapTime = [-10, -10];
    this.queue.startShift(shift);
  }

  public addPopup(x: number, y: number, text: string, color: string): void {
    this.popups.push({
      id: `pop_${this.nextPopupId++}`,
      x,
      y,
      text,
      color,
      alpha: 1,
      vy: -38,
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
          ? -Math.PI * 0.5 + (Math.random() - 0.5) * 0.8
          : Math.random() * Math.PI * 2;
      const speed =
        kind === 'STEAM'
          ? 18 + Math.random() * 24
          : 35 + Math.random() * 75;
      const maxLife = kind === 'STEAM' ? 0.75 + Math.random() * 0.35 : 0.45 + Math.random() * 0.3;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 18,
        y: y + (Math.random() - 0.5) * 14,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: kind === 'STEAM' ? 5 + Math.random() * 5 : 3 + Math.random() * 4,
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

    // Check Customer Rail
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

    // Check Teh Tarik Dispenser
    if (pointInRect(x, y, TEH_TARIK_RECT)) {
      this.pointer = {
        pointerId,
        startX: x,
        startY: y,
        anchorX: x,
        anchorY: y,
        x,
        y,
        source: 'TEH_TARIK',
        swiped: false,
        dragging: false,
      };

      if (!this.tehTarik.isReady && this.tehTarik.spilledTimer <= 0) {
        this.tehTarik.isPulling = true;
        this.pourSfxTimer = 0;
        this.audio.playPour(this.tehTarik.fillLevel);
      }
      return;
    }

    // Check Kuali Slots
    for (let i = 0; i < 2; i++) {
      const slotIndex = i as 0 | 1;
      if (pointInRect(x, y, KUALI_SLOT_RECTS[slotIndex])) {
        this.pointer = {
          pointerId,
          startX: x,
          startY: y,
          anchorX: x,
          anchorY: y,
          x,
          y,
          source: slotIndex === 0 ? 'KUALI_0' : 'KUALI_1',
          swiped: false,
          dragging: false,
        };
        return;
      }
    }

    // Check Assembly Plate
    if (pointInRect(x, y, ASSEMBLY_PLATE_RECT)) {
      this.pointer = {
        pointerId,
        startX: x,
        startY: y,
        anchorX: x,
        anchorY: y,
        x,
        y,
        source: 'PLATE',
        swiped: false,
        dragging: false,
      };
      return;
    }

    // Check Prep Board
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

    // Check Bottom Dock Buttons
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
          PREP_BOARD_RECT.y + 180,
          5,
          '#FEF3C7',
          'SPARK'
        );
        if (this.prep.swipesDone >= this.prep.swipesRequired) {
          this.addPopup(
            PREP_BOARD_RECT.x + PREP_BOARD_RECT.w * 0.5,
            PREP_BOARD_RECT.y + 150,
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
          PREP_BOARD_RECT.y + 180,
          6,
          '#4ADE80',
          'SPARK'
        );
        if (this.prep.swipesDone >= this.prep.swipesRequired) {
          this.prep.slicedStock += 3;
          this.prep.item = null;
          this.prep.swipesDone = 0;
          this.prep.swipesRequired = 0;
          this.addPopup(
            PREP_BOARD_RECT.x + PREP_BOARD_RECT.w * 0.5,
            PREP_BOARD_RECT.y + 145,
            '+3 Veg',
            '#4ADE80'
          );
        }
      }
      return;
    }

    // Kuali slot swipe-up to flip OR drag cooked patty / wrapped burger / burnt item
    if (this.pointer.source === 'KUALI_0' || this.pointer.source === 'KUALI_1') {
      const slotIndex: 0 | 1 = this.pointer.source === 'KUALI_0' ? 0 : 1;
      const slot = this.kuali[slotIndex];

      if (
        !this.pointer.swiped &&
        !this.pointer.dragging &&
        (slot.item === 'ROTI' || slot.item === 'PATTY') &&
        (slot.state === 'READY_FLIP' || (slot.state === 'COOKING_SIDE1' && slot.progress >= 0.45)) &&
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
          slot.item === 'WRAPPED_BURGER';

        if (canDrag) {
          this.pointer.dragging = true;
          this.activeDrag = {
            source: this.pointer.source,
            dish: slot.item === 'WRAPPED_BURGER' ? 'BURGER_RAMLY' : undefined,
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

    // Assembly Plate drag
    if (this.pointer.source === 'PLATE' && this.plate.dish !== null) {
      if (!this.pointer.dragging && distFromStart >= DRAG_START_DISTANCE) {
        this.pointer.dragging = true;
        this.activeDrag = {
          source: 'PLATE',
          dish: this.plate.dish,
          x,
          y,
        };
      } else if (this.pointer.dragging && this.activeDrag) {
        this.activeDrag.x = x;
        this.activeDrag.y = y;
      }
      return;
    }

    // Ready Teh Tarik drag
    if (this.pointer.source === 'TEH_TARIK' && this.tehTarik.isReady) {
      if (!this.pointer.dragging && distFromStart >= DRAG_START_DISTANCE) {
        this.pointer.dragging = true;
        this.activeDrag = {
          source: 'TEH_TARIK',
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
    if (session.source === 'TEH_TARIK' && this.tehTarik.isPulling) {
      this.tehTarik.isPulling = false;
      if (this.tehTarik.fillLevel > TEH_READY_MAX) {
        this.triggerTehSpill();
      } else if (this.tehTarik.fillLevel >= TEH_READY_MIN) {
        this.tehTarik.isReady = true;
        this.addPopup(
          TEH_TARIK_RECT.x + TEH_TARIK_RECT.w * 0.5,
          TEH_TARIK_RECT.y + 150,
          'Tarik!',
          '#F59E0B'
        );
        this.spawnParticles(
          TEH_TARIK_RECT.x + TEH_TARIK_RECT.w * 0.5,
          TEH_TARIK_RECT.y + 190,
          8,
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
      this.handleDragDrop(session.source, x, y);
      this.activeDrag = null;
      return;
    }

    this.activeDrag = null;

    if (session.swiped) {
      return;
    }

    // Tap interactions
    switch (session.source) {
      case 'TEH_TARIK':
        if (this.tehTarik.isReady) {
          const res = this.queue.serveDish('TEH_TARIK');
          if (res.served) {
            this.tehTarik.isReady = false;
            this.tehTarik.fillLevel = 0;
          }
        }
        break;

      case 'PREP':
        this.handlePrepTap();
        break;

      case 'KUALI_0':
        this.handleKualiTap(0);
        break;

      case 'KUALI_1':
        this.handleKualiTap(1);
        break;

      case 'PLATE':
        if (this.plate.dish !== null) {
          const res = this.queue.serveDish(this.plate.dish);
          if (res.served) {
            this.plate.dish = null;
          }
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
      targetRM: this.queue.targetRM,
      shiftTimeLeft: this.queue.shiftTimeLeft,
      combo: this.queue.combo,
      kuali: [
        { ...this.kuali[0] },
        { ...this.kuali[1] },
      ],
      prep: { ...this.prep },
      tehTarik: { ...this.tehTarik },
      plate: { ...this.plate },
      customers: this.queue.customers.map((c) => ({
        ...c,
        items: [...c.items],
        fulfilled: [...c.fulfilled],
      })),
      popups: this.popups,
      particles: this.particles,
      screenShake: this.screenShake,
      activeDrag: this.activeDrag ? { ...this.activeDrag } : null,
    };
  }

  private updateTehTarik(dt: number): void {
    if (this.tehTarik.spilledTimer > 0) {
      this.tehTarik.spilledTimer = Math.max(0, this.tehTarik.spilledTimer - dt);
    }

    if (this.tehTarik.isPulling) {
      this.tehTarik.fillLevel += dt / TEH_FILL_DURATION;
      this.pourSfxTimer += dt;
      if (this.pourSfxTimer >= TEH_POUR_SFX_INTERVAL) {
        this.pourSfxTimer = 0;
        this.audio.playPour(Math.min(1, this.tehTarik.fillLevel));
      }

      if (this.tehTarik.fillLevel > TEH_READY_MAX) {
        this.triggerTehSpill();
      }
    }
  }

  private triggerTehSpill(): void {
    this.tehTarik.isPulling = false;
    this.tehTarik.fillLevel = 0;
    this.tehTarik.isReady = false;
    this.tehTarik.spilledTimer = 1.0;
    this.audio.playSpill();
    this.triggerShake(0.22);
    this.addPopup(
      TEH_TARIK_RECT.x + TEH_TARIK_RECT.w * 0.5,
      TEH_TARIK_RECT.y + 160,
      'Tumpah!',
      '#EF4444'
    );
    this.spawnParticles(
      TEH_TARIK_RECT.x + TEH_TARIK_RECT.w * 0.5,
      TEH_TARIK_RECT.y + 220,
      10,
      '#D97706',
      'SPARK'
    );
  }

  private updateKuali(dt: number): void {
    this.steamTimer += dt;
    const emitSteam = this.steamTimer >= 0.35;
    if (emitSteam) {
      this.steamTimer = 0;
    }

    for (let i = 0; i < 2; i++) {
      const slotIndex = i as 0 | 1;
      const slot = this.kuali[slotIndex];
      if (slot.item === null || slot.state === 'BURNT') continue;

      if (emitSteam) {
        const r = KUALI_SLOT_RECTS[slotIndex];
        this.spawnParticles(
          r.x + r.w * 0.5,
          r.y + r.h * 0.4,
          1,
          slot.burnProgress > 0.2 ? '#71717A' : '#E7E5E4',
          'STEAM'
        );
      }

      const duration = this.getCookDuration(slot.item);
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
        const r = KUALI_SLOT_RECTS[slotIndex];
        this.addPopup(r.x + r.w * 0.5, r.y + 42, 'HANGUS!', '#EF4444');
        this.spawnParticles(r.x + r.w * 0.5, r.y + r.h * 0.5, 10, '#3F3F46', 'STEAM');
      }
    }
  }

  private updateEffects(dt: number): void {
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 1.4);
    }

    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i]!;
      p.y += p.vy * dt;
      p.alpha -= dt * 1.1;
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

  private findOpenKualiSlot(): (0 | 1) | null {
    if (this.kuali[0].item === null) return 0;
    if (this.kuali[1].item === null) return 1;
    return null;
  }

  private flipKualiSlot(slotIndex: 0 | 1): void {
    const slot = this.kuali[slotIndex];
    slot.state = 'COOKING_SIDE2';
    slot.progress = Math.max(slot.progress, 0.5);
    slot.burnProgress = 0;
    this.audio.playFlip();
    const r = KUALI_SLOT_RECTS[slotIndex];
    this.addPopup(r.x + r.w * 0.5, r.y + 36, 'Flip!', '#F59E0B');
    this.spawnParticles(r.x + r.w * 0.5, r.y + r.h * 0.5, 7, '#FDE047', 'SPARK');
  }

  private handlePrepTap(): void {
    if (this.prep.item === 'DOUGH' && this.prep.swipesDone >= this.prep.swipesRequired) {
      const openSlot = this.findOpenKualiSlot();
      if (openSlot === null) {
        this.addPopup(
          PREP_BOARD_RECT.x + PREP_BOARD_RECT.w * 0.5,
          PREP_BOARD_RECT.y + 150,
          'Kuali Full!',
          '#F87171'
        );
        return;
      }
      const slot = this.kuali[openSlot];
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

  private handleKualiTap(slotIndex: 0 | 1): void {
    const slot = this.kuali[slotIndex];
    if (slot.item === null) return;

    // Double-tap burnt item to trash it
    if (slot.state === 'BURNT') {
      const prev = this.lastBurntTapTime[slotIndex];
      if (this.elapsed - prev <= DOUBLE_TAP_WINDOW_SECONDS) {
        this.clearKualiSlot(slotIndex);
        this.lastBurntTapTime[slotIndex] = -10;
        const r = KUALI_SLOT_RECTS[slotIndex];
        this.addPopup(r.x + r.w * 0.5, r.y + 44, 'Cleared', '#A1A1AA');
      } else {
        this.lastBurntTapTime[slotIndex] = this.elapsed;
      }
      return;
    }

    // Tap cooked Roti Canai (>= 0.85) to plate
    if (slot.item === 'ROTI' && slot.state === 'COOKED' && slot.progress >= 0.85) {
      if (this.plate.dish !== null) {
        this.addPopup(
          ASSEMBLY_PLATE_RECT.x + ASSEMBLY_PLATE_RECT.w * 0.5,
          ASSEMBLY_PLATE_RECT.y + 30,
          'Plate Full!',
          '#F87171'
        );
        return;
      }
      this.plate.dish = 'ROTI_CANAI';
      this.clearKualiSlot(slotIndex);
      this.audio.playFlip();
      this.spawnParticles(
        ASSEMBLY_PLATE_RECT.x + ASSEMBLY_PLATE_RECT.w * 0.5,
        ASSEMBLY_PLATE_RECT.y + ASSEMBLY_PLATE_RECT.h * 0.5,
        6,
        '#FDE047',
        'SPARK'
      );
    }
  }

  private handleCustomerTap(slotIndex: 0 | 1 | 2): void {
    if (this.plate.dish !== null) {
      const res = this.queue.serveDish(this.plate.dish, slotIndex);
      if (res.served) {
        this.plate.dish = null;
        return;
      }
    }
    if (this.tehTarik.isReady) {
      const res = this.queue.serveDish('TEH_TARIK', slotIndex);
      if (res.served) {
        this.tehTarik.isReady = false;
        this.tehTarik.fillLevel = 0;
      }
    }
  }

  private handleDockTap(dockId: DockButtonId): void {
    const r = DOCK_RECTS[dockId];
    const cx = r.x + r.w * 0.5;
    const cy = r.y + 12;

    switch (dockId) {
      case 'DOUGH': {
        if (this.prep.item === null) {
          this.prep.item = 'DOUGH';
          this.prep.swipesDone = 0;
          this.prep.swipesRequired = 2;
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
          const kr = KUALI_SLOT_RECTS[burgerSlot.id];
          this.addPopup(kr.x + kr.w * 0.5, kr.y + 34, '+Veg', '#4ADE80');
          return;
        }
        if (this.prep.item === null) {
          this.prep.item = 'VEG';
          this.prep.swipesDone = 0;
          this.prep.swipesRequired = 3;
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
        const slot = this.kuali[openSlot];
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
        const slot = this.kuali[openSlot];
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
          const kr = KUALI_SLOT_RECTS[burgerSlot.id];
          this.addPopup(kr.x + kr.w * 0.5, kr.y + 34, '+Sauce', '#FB923C');
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
        // Quick tap on trash clears any burnt kuali slot
        for (let i = 0; i < 2; i++) {
          const slotIndex = i as 0 | 1;
          if (this.kuali[slotIndex].state === 'BURNT') {
            this.clearKualiSlot(slotIndex);
            this.addPopup(cx, cy, 'Cleared', '#A1A1AA');
            return;
          }
        }
        break;
      }
    }
  }

  private handleDragDrop(
    source: PointerSession['source'],
    x: number,
    y: number
  ): void {
    const overTrash = pointInRect(x, y, DOCK_RECTS.TRASH);
    const overWrapper = pointInRect(x, y, DOCK_RECTS.WRAPPER);
    const customerSlot = this.queue.getSlotAtPoint(x, y);

    if (source === 'PLATE' && this.plate.dish !== null) {
      if (overTrash) {
        this.plate.dish = null;
        this.addPopup(
          DOCK_RECTS.TRASH.x + DOCK_RECTS.TRASH.w * 0.5,
          DOCK_RECTS.TRASH.y + 12,
          'Trashed',
          '#A1A1AA'
        );
        return;
      }
      if (customerSlot !== null) {
        const res = this.queue.serveDish(this.plate.dish, customerSlot);
        if (res.served) {
          this.plate.dish = null;
        }
      }
      return;
    }

    if (source === 'TEH_TARIK' && this.tehTarik.isReady) {
      if (overTrash) {
        this.tehTarik.isReady = false;
        this.tehTarik.fillLevel = 0;
        return;
      }
      if (customerSlot !== null) {
        const res = this.queue.serveDish('TEH_TARIK', customerSlot);
        if (res.served) {
          this.tehTarik.isReady = false;
          this.tehTarik.fillLevel = 0;
        }
      }
      return;
    }

    if (source === 'KUALI_0' || source === 'KUALI_1') {
      const fromIndex: 0 | 1 = source === 'KUALI_0' ? 0 : 1;
      const toIndex: 0 | 1 = fromIndex === 0 ? 1 : 0;
      const fromSlot = this.kuali[fromIndex];
      const toSlot = this.kuali[toIndex];

      if (overTrash && fromSlot.item !== null) {
        this.clearKualiSlot(fromIndex);
        this.addPopup(
          DOCK_RECTS.TRASH.x + DOCK_RECTS.TRASH.w * 0.5,
          DOCK_RECTS.TRASH.y + 12,
          'Trashed',
          '#A1A1AA'
        );
        return;
      }

      // Drag cooked patty onto egg slot -> WRAPPED_BURGER
      if (
        fromSlot.item === 'PATTY' &&
        fromSlot.state === 'COOKED' &&
        toSlot.item === 'EGG' &&
        toSlot.state !== 'BURNT' &&
        pointInRect(x, y, KUALI_SLOT_RECTS[toIndex])
      ) {
        toSlot.item = 'WRAPPED_BURGER';
        toSlot.state = 'COOKED';
        toSlot.progress = 0.85;
        toSlot.burnProgress = 0;
        toSlot.hasGarnish = false;
        toSlot.hasSauce = false;
        this.clearKualiSlot(fromIndex);
        this.audio.playFlip();
        const r = KUALI_SLOT_RECTS[toIndex];
        this.addPopup(r.x + r.w * 0.5, r.y + 38, 'Wrapped!', '#F59E0B');
        this.spawnParticles(r.x + r.w * 0.5, r.y + r.h * 0.5, 8, '#FDE047', 'SPARK');
        return;
      }

      // Drag dressed WRAPPED_BURGER to Wrapper dock -> plate BURGER_RAMLY
      if (
        fromSlot.item === 'WRAPPED_BURGER' &&
        fromSlot.state !== 'BURNT' &&
        fromSlot.hasGarnish &&
        fromSlot.hasSauce &&
        overWrapper
      ) {
        this.plateWrappedBurger(fromIndex);
      }
    }
  }

  private plateWrappedBurger(slotIndex: 0 | 1): void {
    if (this.plate.dish !== null) {
      this.addPopup(
        ASSEMBLY_PLATE_RECT.x + ASSEMBLY_PLATE_RECT.w * 0.5,
        ASSEMBLY_PLATE_RECT.y + 30,
        'Plate Full!',
        '#F87171'
      );
      return;
    }
    this.plate.dish = 'BURGER_RAMLY';
    this.clearKualiSlot(slotIndex);
    this.audio.playFlip();
    this.spawnParticles(
      ASSEMBLY_PLATE_RECT.x + ASSEMBLY_PLATE_RECT.w * 0.5,
      ASSEMBLY_PLATE_RECT.y + ASSEMBLY_PLATE_RECT.h * 0.5,
      8,
      '#FDE047',
      'SPARK'
    );
  }

  private findWrappedBurger(predicate: (slot: KualiSlot) => boolean): KualiSlot | null {
    for (const slot of this.kuali) {
      if (slot.item === 'WRAPPED_BURGER' && slot.state !== 'BURNT' && predicate(slot)) {
        return slot;
      }
    }
    return null;
  }

  private clearKualiSlot(slotIndex: 0 | 1): void {
    this.kuali[slotIndex] = createEmptyKualiSlot(slotIndex);
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
