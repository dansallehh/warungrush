import type { KitchenUpgrades, ProgressData, UpgradeKey } from '../types/game';

const STORAGE_KEY = 'warung_rush_v2_save';
export const MAX_UPGRADE_LEVEL = 3;

export interface UpgradeDefinition {
  key: UpgradeKey;
  name: string;
  shortDesc: string;
  accent: string;
  costs: readonly [number, number]; // cost for Lv1->2, Lv2->3
  levelLabels: readonly [string, string, string];
}

export const UPGRADE_CATALOG: readonly UpgradeDefinition[] = [
  {
    key: 'kualiLevel',
    name: 'Kuali Griddle',
    shortDesc: 'More grill slots & faster heat',
    accent: '#F97316',
    costs: [55, 130],
    levelLabels: ['2 Slots · 1.0x', '3 Slots · 1.18x', '4 Slots · 1.38x'],
  },
  {
    key: 'tehLevel',
    name: 'Teh Tarik Urn',
    shortDesc: 'Hold more cups & easier tarik',
    accent: '#F59E0B',
    costs: [45, 110],
    levelLabels: ['1 Cup · Normal', '2 Cups · Fast', '3 Cups · Master'],
  },
  {
    key: 'plateLevel',
    name: 'Serving Plates',
    shortDesc: 'More plated dishes ready to go',
    accent: '#38BDF8',
    costs: [50, 120],
    levelLabels: ['2 Plates', '3 Plates', '4 Plates'],
  },
  {
    key: 'prepLevel',
    name: 'Prep Board',
    shortDesc: 'Fewer swipes & extra veg yield',
    accent: '#4ADE80',
    costs: [40, 100],
    levelLabels: ['2/3 Swipes · +3', '2/2 Swipes · +4', '1/2 Swipes · +5'],
  },
  {
    key: 'ingredientLevel',
    name: 'Premium Spices',
    shortDesc: 'Boosts RM price on all dishes',
    accent: '#FACC15',
    costs: [65, 150],
    levelLabels: ['Base Price', '+RM 1 / dish', '+RM 3 / dish'],
  },
  {
    key: 'decorLevel',
    name: 'Warung Lights',
    shortDesc: 'Happier customers & bigger tips',
    accent: '#EC4899',
    costs: [50, 125],
    levelLabels: ['Standard', '+15% Wait · +RM1', '+30% Wait · +RM2'],
  },
];

export function createDefaultUpgrades(): KitchenUpgrades {
  return {
    kualiLevel: 1,
    tehLevel: 1,
    plateLevel: 1,
    prepLevel: 1,
    ingredientLevel: 1,
    decorLevel: 1,
  };
}

export function createDefaultProgress(): ProgressData {
  return {
    walletRM: 0,
    highestShift: 1,
    bestStars: {},
    upgrades: createDefaultUpgrades(),
  };
}

export class ProgressStore {
  private data: ProgressData;

  constructor() {
    this.data = this.load();
  }

  public getData(): ProgressData {
    return {
      walletRM: this.data.walletRM,
      highestShift: this.data.highestShift,
      bestStars: { ...this.data.bestStars },
      upgrades: { ...this.data.upgrades },
    };
  }

  public getUpgrades(): KitchenUpgrades {
    return { ...this.data.upgrades };
  }

  public getWalletRM(): number {
    return this.data.walletRM;
  }

  public getHighestShift(): number {
    return this.data.highestShift;
  }

  public getUpgradeCost(key: UpgradeKey): number | null {
    const def = UPGRADE_CATALOG.find((u) => u.key === key);
    if (!def) return null;
    const lv = this.data.upgrades[key];
    if (lv >= MAX_UPGRADE_LEVEL) return null;
    return def.costs[lv - 1] ?? null;
  }

  public canAffordUpgrade(key: UpgradeKey): boolean {
    const cost = this.getUpgradeCost(key);
    return cost !== null && this.data.walletRM >= cost;
  }

  public purchaseUpgrade(key: UpgradeKey): boolean {
    const cost = this.getUpgradeCost(key);
    if (cost === null || this.data.walletRM < cost) {
      return false;
    }
    this.data.walletRM -= cost;
    this.data.upgrades[key] = Math.min(MAX_UPGRADE_LEVEL, this.data.upgrades[key] + 1);
    this.save();
    return true;
  }

  public recordShiftResult(
    shift: number,
    earnedRM: number,
    metTarget: boolean,
    stars: number
  ): void {
    this.data.walletRM += Math.max(0, Math.round(earnedRM));
    if (metTarget) {
      this.data.highestShift = Math.max(this.data.highestShift, shift + 1);
      const prevBest = this.data.bestStars[shift] ?? 0;
      this.data.bestStars[shift] = Math.max(prevBest, stars);
    }
    this.save();
  }

  public getTotalStars(): number {
    return Object.values(this.data.bestStars).reduce((sum, s) => sum + s, 0);
  }

  public reset(): void {
    this.data = createDefaultProgress();
    this.save();
  }

  private load(): ProgressData {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultProgress();
      const parsed = JSON.parse(raw) as Partial<ProgressData>;
      const defaults = createDefaultProgress();
      const clampLv = (v: unknown): number => {
        const n = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : 1;
        return Math.max(1, Math.min(MAX_UPGRADE_LEVEL, n));
      };
      return {
        walletRM:
          typeof parsed.walletRM === 'number' && Number.isFinite(parsed.walletRM)
            ? Math.max(0, Math.floor(parsed.walletRM))
            : defaults.walletRM,
        highestShift:
          typeof parsed.highestShift === 'number' && Number.isFinite(parsed.highestShift)
            ? Math.max(1, Math.floor(parsed.highestShift))
            : defaults.highestShift,
        bestStars:
          parsed.bestStars && typeof parsed.bestStars === 'object'
            ? { ...parsed.bestStars }
            : {},
        upgrades: {
          kualiLevel: clampLv(parsed.upgrades?.kualiLevel),
          tehLevel: clampLv(parsed.upgrades?.tehLevel),
          plateLevel: clampLv(parsed.upgrades?.plateLevel),
          prepLevel: clampLv(parsed.upgrades?.prepLevel),
          ingredientLevel: clampLv(parsed.upgrades?.ingredientLevel),
          decorLevel: clampLv(parsed.upgrades?.decorLevel),
        },
      };
    } catch {
      return createDefaultProgress();
    }
  }

  private save(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Ignore storage quota/private-mode errors
    }
  }
}

export function getKualiSlotCount(u: KitchenUpgrades): number {
  return 1 + u.kualiLevel; // 2, 3, 4
}

export function getCookSpeedMultiplier(u: KitchenUpgrades): number {
  return u.kualiLevel === 1 ? 1.0 : u.kualiLevel === 2 ? 1.18 : 1.38;
}

export function getTehMaxCups(u: KitchenUpgrades): number {
  return u.tehLevel; // 1, 2, 3
}

export function getTehFillDuration(u: KitchenUpgrades): number {
  return u.tehLevel === 1 ? 1.65 : u.tehLevel === 2 ? 1.35 : 1.05;
}

export function getTehSweetSpot(u: KitchenUpgrades): { min: number; max: number } {
  if (u.tehLevel === 1) return { min: 0.72, max: 0.92 };
  if (u.tehLevel === 2) return { min: 0.68, max: 0.94 };
  return { min: 0.64, max: 0.96 };
}

export function getPlateSlotCount(u: KitchenUpgrades): number {
  return 1 + u.plateLevel; // 2, 3, 4
}

export function getDoughSwipesRequired(u: KitchenUpgrades): number {
  return u.prepLevel >= 3 ? 1 : 2;
}

export function getVegSwipesRequired(u: KitchenUpgrades): number {
  return u.prepLevel >= 2 ? 2 : 3;
}

export function getVegYield(u: KitchenUpgrades): number {
  return 2 + u.prepLevel; // 3, 4, 5
}

export function getIngredientPriceBonus(u: KitchenUpgrades): number {
  return u.ingredientLevel === 1 ? 0 : u.ingredientLevel === 2 ? 1 : 3;
}

export function getPatienceBonusMultiplier(u: KitchenUpgrades): number {
  return u.decorLevel === 1 ? 1.0 : u.decorLevel === 2 ? 1.15 : 1.3;
}

export function getTipBonusRM(u: KitchenUpgrades): number {
  return u.decorLevel - 1; // 0, 1, 2
}
