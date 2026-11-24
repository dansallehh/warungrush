import type {
  AudioController,
  CustomerOrder,
  DishType,
  FloatingPopup,
  Particle,
} from '../types/game';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const SHIFT_DURATION_SECONDS = 75;

export const CUSTOMER_SLOT_RECTS: readonly [Rect, Rect, Rect] = [
  { x: 15, y: 56, w: 113, h: 164 },
  { x: 138, y: 56, w: 113, h: 164 },
  { x: 261, y: 56, w: 113, h: 164 },
];

export const DISH_PRICES_RM: Readonly<Record<DishType, number>> = {
  ROTI_CANAI: 4,
  TEH_TARIK: 3,
  BURGER_RAMLY: 8,
};

interface ArchetypeConfig {
  archetype: CustomerOrder['archetype'];
  maxPatience: number;
  minItems: number;
  maxItems: number;
  tipRM: number;
}

const ARCHETYPES: readonly ArchetypeConfig[] = [
  {
    archetype: 'PAK_CIK',
    maxPatience: 42,
    minItems: 1,
    maxItems: 2,
    tipRM: 2,
  },
  {
    archetype: 'OFFICE_RUSH',
    maxPatience: 25,
    minItems: 1,
    maxItems: 2,
    tipRM: 4,
  },
  {
    archetype: 'LEPAK',
    maxPatience: 50,
    minItems: 2,
    maxItems: 3,
    tipRM: 3,
  },
];

export interface ServeResult {
  served: boolean;
  completedOrder: boolean;
  earnedRM: number;
  combo: number;
  slotIndex?: 0 | 1 | 2;
}

export interface FeedbackSink {
  addPopup: (x: number, y: number, text: string, color: string) => void;
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
  public targetRM = 45;
  public shiftTimeLeft = SHIFT_DURATION_SECONDS;
  public combo = 1;
  public customers: CustomerOrder[] = [];
  public servedCount = 0;
  public missedCount = 0;

  private readonly audio: AudioController;
  private readonly feedback: FeedbackSink;
  private spawnTimer = 0.8;
  private nextOrderId = 1;

  constructor(audio: AudioController, feedback?: FeedbackSink) {
    this.audio = audio;
    this.feedback = feedback ?? {
      addPopup: () => {},
      spawnParticles: () => {},
      triggerShake: () => {},
    };
  }

  public startShift(shiftNumber: number): void {
    this.shift = Math.max(1, Math.floor(shiftNumber));
    this.cashRM = 0;
    this.targetRM = 45 + (this.shift - 1) * 25;
    this.shiftTimeLeft = SHIFT_DURATION_SECONDS;
    this.combo = 1;
    this.customers = [];
    this.servedCount = 0;
    this.missedCount = 0;
    this.spawnTimer = 0.5;
  }

  public getUnlockedDishes(): DishType[] {
    if (this.shift <= 1) {
      return ['ROTI_CANAI', 'TEH_TARIK'];
    }
    return ['ROTI_CANAI', 'TEH_TARIK', 'BURGER_RAMLY'];
  }

  public isShiftTimeUp(): boolean {
    return this.shiftTimeLeft <= 0;
  }

  public didMeetTarget(): boolean {
    return this.cashRM >= this.targetRM;
  }

  public getSlotAtPoint(x: number, y: number): (0 | 1 | 2) | null {
    for (let i = 0; i < CUSTOMER_SLOT_RECTS.length; i++) {
      const r = CUSTOMER_SLOT_RECTS[i]!;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        return i as 0 | 1 | 2;
      }
    }
    return null;
  }

  public update(dt: number): void {
    if (this.shiftTimeLeft > 0) {
      this.shiftTimeLeft = Math.max(0, this.shiftTimeLeft - dt);
    }

    // Update patience for existing customers
    const remaining: CustomerOrder[] = [];
    for (const customer of this.customers) {
      customer.patience -= dt;
      if (customer.patience <= 0) {
        this.missedCount += 1;
        this.combo = 1;
        const rect = CUSTOMER_SLOT_RECTS[customer.slotIndex];
        this.feedback.addPopup(
          rect.x + rect.w * 0.5,
          rect.y + 44,
          'Lama sangat!',
          '#EF4444'
        );
        this.feedback.triggerShake(0.2);
      } else {
        remaining.push(customer);
      }
    }
    this.customers = remaining;

    // Spawn new customers while shift time remains
    if (this.shiftTimeLeft > 3 && this.customers.length < 3) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnCustomer();
        const baseInterval = Math.max(2.6, 5.4 - (this.shift - 1) * 0.45);
        this.spawnTimer = baseInterval + Math.random() * 1.4;
      }
    }
  }

  public serveDish(dish: DishType, targetSlotIndex?: 0 | 1 | 2): ServeResult {
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

    const patienceRatio = customer.patience / customer.maxPatience;
    const isLayan = patienceRatio > 0.5;
    if (isLayan) {
      this.combo = Math.min(5, this.combo + 1);
    } else {
      this.combo = 1;
    }

    const basePrice = DISH_PRICES_RM[dish];
    const comboBonus = isLayan ? Math.max(0, this.combo - 1) : 0;
    let earnedRM = basePrice + comboBonus;

    const allFulfilled = customer.fulfilled.every(Boolean);
    const rect = CUSTOMER_SLOT_RECTS[customer.slotIndex];
    const cx = rect.x + rect.w * 0.5;
    const cy = rect.y + 54;

    if (allFulfilled) {
      const cfg = ARCHETYPES.find((a) => a.archetype === customer.archetype);
      const tip = isLayan && cfg ? cfg.tipRM : 0;
      earnedRM += tip;
      this.servedCount += 1;
      this.customers = this.customers.filter((c) => c.id !== customer.id);

      // Keep queue lively when all slots clear
      if (this.customers.length === 0 && this.spawnTimer > 1.0) {
        this.spawnTimer = 0.8;
      }
    }

    this.cashRM += earnedRM;
    this.audio.playServe(this.combo);

    this.feedback.addPopup(cx, cy, `+RM${earnedRM}`, '#22C55E');
    if (isLayan && this.combo >= 2) {
      this.feedback.addPopup(cx, cy - 22, `Layan! x${this.combo}`, '#F59E0B');
    }
    this.feedback.spawnParticles(cx, cy, allFulfilled ? 12 : 6, '#FDE047', 'STAR');

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
    targetSlotIndex?: 0 | 1 | 2
  ): { customer: CustomerOrder; itemIndex: number } | null {
    if (targetSlotIndex !== undefined) {
      const customer = this.customers.find((c) => c.slotIndex === targetSlotIndex);
      if (!customer) return null;
      const itemIndex = customer.items.findIndex(
        (item, idx) => item === dish && !customer.fulfilled[idx]
      );
      return itemIndex >= 0 ? { customer, itemIndex } : null;
    }

    // Tap-to-serve picks the most urgent matching customer (lowest patience ratio)
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
    const freeSlots = ([0, 1, 2] as const).filter((slot) => !occupied.has(slot));
    if (freeSlots.length === 0) return;

    const slotIndex = freeSlots[Math.floor(Math.random() * freeSlots.length)]!;
    const cfg = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)]!;
    const unlocked = this.getUnlockedDishes();

    const maxAllowedItems = this.shift === 1 ? Math.min(2, cfg.maxItems) : cfg.maxItems;
    const itemCount =
      cfg.minItems +
      Math.floor(Math.random() * (Math.max(cfg.minItems, maxAllowedItems) - cfg.minItems + 1));

    const items: DishType[] = [];
    for (let i = 0; i < itemCount; i++) {
      items.push(unlocked[Math.floor(Math.random() * unlocked.length)]!);
    }

    // Slight patience tightening on higher shifts
    const patienceScale = Math.max(0.75, 1 - (this.shift - 1) * 0.05);
    const maxPatience = Math.round(cfg.maxPatience * patienceScale);

    const order: CustomerOrder = {
      id: `cust_${this.nextOrderId++}`,
      slotIndex,
      archetype: cfg.archetype,
      items,
      fulfilled: items.map(() => false),
      patience: maxPatience,
      maxPatience,
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
