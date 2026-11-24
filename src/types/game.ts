export type DishType = 'ROTI_CANAI' | 'ROTI_TELUR' | 'BURGER_RAMLY' | 'TEH_TARIK';

export type CustomerArchetype = 'PAK_CIK' | 'OFFICE_RUSH' | 'LEPAK' | 'KAKAK_FOODIE';

export type KualiItemState =
  | 'RAW'
  | 'COOKING_SIDE1'
  | 'READY_FLIP'
  | 'COOKING_SIDE2'
  | 'COOKED'
  | 'BURNT';

export interface KualiSlot {
  id: number;
  unlocked: boolean;
  item: 'ROTI' | 'PATTY' | 'EGG' | 'WRAPPED_BURGER' | null;
  state: KualiItemState;
  progress: number;
  burnProgress: number;
  hasGarnish: boolean;
  hasSauce: boolean;
}

export interface PrepBoardState {
  item: 'DOUGH' | 'VEG' | null;
  swipesDone: number;
  swipesRequired: number;
  slicedStock: number;
}

export interface TehTarikState {
  isPulling: boolean;
  fillLevel: number;
  readyCount: number;
  maxCups: number;
  spilledTimer: number;
  sweetMin: number;
  sweetMax: number;
}

export interface ServingPlateSlot {
  id: number;
  unlocked: boolean;
  dish: 'ROTI_CANAI' | 'ROTI_TELUR' | 'BURGER_RAMLY' | null;
}

export interface CustomerOrder {
  id: string;
  slotIndex: 0 | 1 | 2 | 3;
  archetype: CustomerArchetype;
  items: DishType[];
  fulfilled: boolean[];
  patience: number;
  maxPatience: number;
  happyFlash: number;
}

export interface FlyingDish {
  id: string;
  dish: DishType;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
}

export interface FloatingPopup {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
  scale?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  kind: 'SPARK' | 'STEAM' | 'STAR' | 'HEART';
}

export type UpgradeKey =
  | 'kualiLevel'
  | 'tehLevel'
  | 'plateLevel'
  | 'prepLevel'
  | 'ingredientLevel'
  | 'decorLevel';

export interface KitchenUpgrades {
  kualiLevel: number; // 1..3 -> 2, 3, 4 slots + faster cooking
  tehLevel: number; // 1..3 -> 1, 2, 3 cup slots + faster pull & wider sweet spot
  plateLevel: number; // 1..3 -> 2, 3, 4 serving plates
  prepLevel: number; // 1..3 -> fewer swipes & more veg stock
  ingredientLevel: number; // 1..3 -> higher dish prices
  decorLevel: number; // 1..3 -> higher customer patience & tips
}

export interface ProgressData {
  walletRM: number;
  highestShift: number;
  bestStars: Record<number, number>;
  upgrades: KitchenUpgrades;
}

export interface GameSnapshot {
  shift: number;
  cashRM: number;
  walletRM: number;
  targetRM: number;
  shiftTimeLeft: number;
  combo: number;
  isFever: boolean;
  kuali: KualiSlot[];
  prep: PrepBoardState;
  tehTarik: TehTarikState;
  plates: ServingPlateSlot[];
  customers: CustomerOrder[];
  flyingDishes: FlyingDish[];
  popups: FloatingPopup[];
  particles: Particle[];
  screenShake: number;
  activeDrag: { source: string; dish?: DishType; item?: string; x: number; y: number } | null;
  upgrades: KitchenUpgrades;
  starsEarned: number;
}

export interface AudioController {
  unlock(): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  playSizzle(): void;
  playChop(): void;
  playFlip(): void;
  playPour(fillLevel: number): void;
  playServe(combo: number): void;
  playBurn(): void;
  playSpill(): void;
  playUpgrade(): void;
  playFever(): void;
  playClick(): void;
  playShiftWin(): void;
  playShiftFail(): void;
}
