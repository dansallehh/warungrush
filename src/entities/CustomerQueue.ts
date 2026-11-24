import {
  createDefaultUpgrades,
  getIngredientPriceBonus,
  getPatienceBonusMultiplier,
  getTipBonusRM,
} from '../core/ProgressStore';
import type {
  AudioController,
  CustomerArchetype,
  CustomerOrder,
  DishType,
  FloatingPopup,
  KitchenUpgrades,
  Particle,
} from '../types/game';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const SHIFT_DURATION_SECONDS = 80;

// 4 spacious landscape customer slots across the 960x540 counter
export const CUSTOMER_SLOT_RECTS: readonly [Rect, Rect, Rect, Rect] = [
  { x: 18, y: 66, w: 220, h: 152 },
  { x: 252, y: 66, w: 220, h: 152 },
  { x: 486, y: 66, w: 220, h: 152 },
  { x: 720, y: 66, w: 220, h: 152 },
];

export const BASE_DISH_PRICES_RM: Readonly<Record<DishType, number>> = {
  TEH_TARIK: 4,
  ROTI_CANAI: 5,
  ROTI_TELUR: 7,
  BURGER_RAMLY: 10,
};

interface ArchetypeConfig {
  archetype: CustomerArchetype;
  maxPatience: number;
  minItems: number;
  maxItems: number;
  tipRM: number;
}

const ARCHETYPES: readonly ArchetypeConfig[] = [
  {
    archetype: 'PAK_CIK',
    maxPatience: 44,
    minItems: 1,
    maxItems: 2,
    tipRM: 3,
  },
  {
    archetype: 'OFFICE_RUSH',
    maxPatience: 27,
    minItems: 1,
    maxItems: 2,
    tipRM: 6,
  },
  {
    archetype: 'LEPAK',
    maxPatience: 52,
    minItems: 2,
    maxItems: 3,
    tipRM: 4,
  },
  {
    archetype: 'KAKAK_FOODIE',
    maxPatience: 38,
    minItems: 2,
    maxItems: 3,
    tipRM: 5,
  },
];

export interface ServeResult {
  served: boolean;
  completedOrder: boolean;
  earnedRM: number;
  combo: number;
  slotIndex?: 0 | 1 | 2 | 3;
}

export interface FeedbackSink {
  addPopup: (x: number, y: number, text: string, color: string, scale?: number) => void;
  spawnParticles: (
    x: number,
    y: number,
    count: number,
    color: string,
    kind: Particle['kind']
  ) => void;
  triggerShake: (amount: number) => void;
}

export class CustomerQueue {
  public shift = 1;
  public cashRM = 0;
  public targetRM = 55;
  public shiftTimeLeft = SHIFT_DURATION_SECONDS;
  public combo = 1;
  public customers: CustomerOrder[] = [];
  public servedCount = 0;
  public missedCount = 0;

  private readonly audio: AudioController;
  private readonly feedback: FeedbackSink;
  private upgrades: KitchenUpgrades = createDefaultUpgrades();
  private spawnTimer = 0.5;
  private nextOrderId = 1;

  constructor(audio: AudioController, feedback?: FeedbackSink) {
    this.audio = audio;
    this.feedback = feedback ?? {
      addPopup: () => {},
      spawnParticles: () => {},
      triggerShake: () => {},
    };
  }

  public startShift(shiftNumber: number, upgrades?: KitchenUpgrades): void {
    this.shift = Math.max(1, Math.floor(shiftNumber));
    this.upgrades = upgrades ? { ...upgrades } : createDefaultUpgrades();
    this.cashRM = 0;
    this.targetRM = 55 + (this.shift - 1) * 30;
    this.shiftTimeLeft = SHIFT_DURATION_SECONDS;
    this.combo = 1;
    this.customers = [];
    this.servedCount = 0;
    this.missedCount = 0;
    this.spawnTimer = 0.4;
  }

  public getUnlockedDishes(): DishType[] {
    if (this.shift <= 1) {
      return ['ROTI_CANAI', 'TEH_TARIK'];
    }
    if (this.shift === 2) {
      return ['ROTI_CANAI', 'TEH_TARIK', 'BURGER_RAMLY'];
    }
    return ['ROTI_CANAI', 'ROTI_TELUR', 'TEH_TARIK', 'BURGER_RAMLY'];
  }

  public isFever(): boolean {
    return this.combo >= 4;
  }

  public isShiftTimeUp(): boolean {
    return this.shiftTimeLeft <= 0;
  }

  public didMeetTarget(): boolean {
    return this.cashRM >= this.targetRM;
  }

  public getStarsEarned(): number {
    if (this.cashRM < this.targetRM) return 0;
    if (this.cashRM >= Math.round(this.targetRM * 1.65)) return 3;
    if (this.cashRM >= Math.round(this.targetRM * 1.3)) return 2;
    return 1;
  }

  public getDishPrice(dish: DishType): number {
    return BASE_DISH_PRICES_RM[dish] + getIngredientPriceBonus(this.upgrades);
  }

  public getSlotAtPoint(x: number, y: number): (0 | 1 | 2 | 3) | null {
    for (let i = 0; i < CUSTOMER_SLOT_RECTS.length; i++) {
      const r = CUSTOMER_SLOT_RECTS[i]!;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        return i as 0 | 1 | 2 | 3;
      }
    }
    return null;
  }

  public update(dt: number): void {
    if (this.shiftTimeLeft > 0) {
      this.shiftTimeLeft = Math.max(0, this.shiftTimeLeft - dt);
    }

    const remaining: CustomerOrder[] = [];
    for (const customer of this.customers) {
      customer.patience -= dt;
      if (customer.happyFlash > 0) {
        customer.happyFlash = Math.max(0, customer.happyFlash - dt);
      }
      if (customer.patience <= 0) {
        this.missedCount += 1;
        this.combo = 1;
        const rect = CUSTOMER_SLOT_RECTS[customer.slotIndex];
        this.feedback.addPopup(
          rect.x + rect.w * 0.5,
          rect.y + 44,
          'Lama sangat!',
          '#EF4444',
          1.1
        );
        this.feedback.triggerShake(0.24);
      } else {
        remaining.push(customer);
      }
    }
    this.customers = remaining;

    const maxConcurrent = this.shift === 1 ? 3 : 4;
    if (this.shiftTimeLeft > 3 && this.customers.length < maxConcurrent) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnCustomer();
        const baseInterval = Math.max(2.1, 4.6 - (this.shift - 1) * 0.42);
        this.spawnTimer = baseInterval + Math.random() * 1.2;
      }
    }
  }

  public serveDish(dish: DishType, targetSlotIndex?: 0 | 1 | 2 | 3): ServeResult {
    const candidate = this.findMatchingCustomer(dish, targetSlotIndex);
    if (!candidate) {
      return {
        served: false,
        completedOrder: false,
        earnedRM: 0,
        combo: this.combo,
      };
    }

    const { customer, itemIndex } = candidate;
    customer.fulfilled[itemIndex] = true;
    customer.happyFlash = 0.6;

    const patienceRatio = customer.patience / customer.maxPatience;
    const isLayan = patienceRatio > 0.5;
    const wasFever = this.isFever();
    if (isLayan) {
      this.combo = Math.min(5, this.combo + 1);
    } else {
      this.combo = 1;
    }

    const nowFever = this.isFever();
    const basePrice = this.getDishPrice(dish);
    const comboBonus = isLayan ? Math.max(0, this.combo - 1) : 0;
    let earnedRM = basePrice + comboBonus;

    const allFulfilled = customer.fulfilled.every(Boolean);
    const rect = CUSTOMER_SLOT_RECTS[customer.slotIndex];
    const cx = rect.x + rect.w * 0.5;
    const cy = rect.y + 58;

    if (allFulfilled) {
      const cfg = ARCHETYPES.find((a) => a.archetype === customer.archetype);
      const baseTip = cfg ? cfg.tipRM + getTipBonusRM(this.upgrades) : 0;
      const feverMult = nowFever ? 2 : 1;
      const tip = isLayan ? baseTip * feverMult : 0;
      earnedRM += tip;
      this.servedCount += 1;
      this.customers = this.customers.filter((c) => c.id !== customer.id);

      if (this.customers.length === 0 && this.spawnTimer > 0.9) {
        this.spawnTimer = 0.65;
      }
    }

    this.cashRM += earnedRM;
    this.audio.playServe(this.combo);
    if (!wasFever && nowFever) {
      this.audio.playFever();
      this.feedback.addPopup(480, 110, 'LAYAN FEVER! 2x TIPS', '#FACC15', 1.35);
    }

    this.feedback.addPopup(cx, cy, `+RM${earnedRM}`, '#4ADE80', 1.15);
    if (isLayan && this.combo >= 2) {
      this.feedback.addPopup(
        cx,
        cy - 24,
        nowFever ? `FEVER x${this.combo}!` : `Layan! x${this.combo}`,
        nowFever ? '#FACC15' : '#F59E0B',
        1.05
      );
    }
    this.feedback.spawnParticles(
      cx,
      cy,
      allFulfilled ? 14 : 7,
      nowFever ? '#FACC15' : '#FDE047',
      allFulfilled ? 'HEART' : 'STAR'
    );

    return {
      served: true,
      completedOrder: allFulfilled,
      earnedRM,
      combo: this.combo,
      slotIndex: customer.slotIndex,
    };
  }

  public getCustomers(): CustomerOrder[] {
    return this.customers;
  }

  private findMatchingCustomer(
    dish: DishType,
    targetSlotIndex?: 0 | 1 | 2 | 3
  ): { customer: CustomerOrder; itemIndex: number } | null {
    if (targetSlotIndex !== undefined) {
      const customer = this.customers.find((c) => c.slotIndex === targetSlotIndex);
      if (!customer) return null;
      const itemIndex = customer.items.findIndex(
        (item, idx) => item === dish && !customer.fulfilled[idx]
      );
      return itemIndex >= 0 ? { customer, itemIndex } : null;
    }

    let best: { customer: CustomerOrder; itemIndex: number; ratio: number } | null = null;
    for (const customer of this.customers) {
      const itemIndex = customer.items.findIndex(
        (item, idx) => item === dish && !customer.fulfilled[idx]
      );
      if (itemIndex >= 0) {
        const ratio = customer.patience / customer.maxPatience;
        if (!best || ratio < best.ratio) {
          best = { customer, itemIndex, ratio };
        }
      }
    }

    return best ? { customer: best.customer, itemIndex: best.itemIndex } : null;
  }

  private spawnCustomer(): void {
    const occupied = new Set(this.customers.map((c) => c.slotIndex));
    const freeSlots = ([0, 1, 2, 3] as const).filter((slot) => !occupied.has(slot));
    if (freeSlots.length === 0) return;

    const slotIndex = freeSlots[Math.floor(Math.random() * freeSlots.length)]!;
    const cfg = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)]!;
    const unlocked = this.getUnlockedDishes();

    const maxAllowedItems = this.shift === 1 ? Math.min(2, cfg.maxItems) : cfg.maxItems;
    const itemCount =
      cfg.minItems +
      Math.floor(
        Math.random() * (Math.max(cfg.minItems, maxAllowedItems) - cfg.minItems + 1)
      );

    const items: DishType[] = [];
    for (let i = 0; i < itemCount; i++) {
      items.push(unlocked[Math.floor(Math.random() * unlocked.length)]!);
    }

    const shiftScale = Math.max(0.74, 1 - (this.shift - 1) * 0.045);
    const upgradeScale = getPatienceBonusMultiplier(this.upgrades);
    const maxPatience = Math.round(cfg.maxPatience * shiftScale * upgradeScale);

    const order: CustomerOrder = {
      id: `cust_${this.nextOrderId++}`,
      slotIndex,
      archetype: cfg.archetype,
      items,
      fulfilled: items.map(() => false),
      patience: maxPatience,
      maxPatience,
      happyFlash: 0,
    };

    this.customers.push(order);
  }
}

export function createEmptyFeedback(): {
  popups: FloatingPopup[];
  particles: Particle[];
} {
  return { popups: [], particles: [] };
}
