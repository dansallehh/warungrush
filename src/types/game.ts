export type DishType = 'ROTI_CANAI' | 'BURGER_RAMLY' | 'TEH_TARIK';

export type KualiItemState =
  | 'RAW'
  | 'COOKING_SIDE1'
  | 'READY_FLIP'
  | 'COOKING_SIDE2'
  | 'COOKED'
  | 'BURNT';

export interface KualiSlot {
  id: 0 | 1;
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
  isReady: boolean;
  spilledTimer: number;
}

export interface AssemblyPlateState {
  dish: 'ROTI_CANAI' | 'BURGER_RAMLY' | null;
}

export interface CustomerOrder {
  id: string;
  slotIndex: 0 | 1 | 2;
  archetype: 'PAK_CIK' | 'OFFICE_RUSH' | 'LEPAK';
  items: DishType[];
  fulfilled: boolean[];
  patience: number;
  maxPatience: number;
}

export interface FloatingPopup {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
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
  kind: 'SPARK' | 'STEAM' | 'STAR';
}

export interface GameSnapshot {
  shift: number;
  cashRM: number;
  targetRM: number;
  shiftTimeLeft: number;
  combo: number;
  kuali: [KualiSlot, KualiSlot];
  prep: PrepBoardState;
  tehTarik: TehTarikState;
  plate: AssemblyPlateState;
  customers: CustomerOrder[];
  popups: FloatingPopup[];
  particles: Particle[];
  screenShake: number;
  activeDrag: { source: string; dish?: DishType; x: number; y: number } | null;
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
}
