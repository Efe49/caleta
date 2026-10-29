export const STAT_KEYS = ["fuerza", "suerte", "paciencia", "tecnica"] as const;

export type StatKey = (typeof STAT_KEYS)[number];

export type Rarity = "comun" | "poco_comun" | "raro" | "legendario";

export type FishShape = "slim" | "round" | "flat" | "crab" | "eel" | "big";

export type ZoneMood = "sunset" | "reeds" | "fog" | "moon";

export type ZoneGate = "free" | "either" | "both";

export type Stats = Record<StatKey, number>;

export type LogEntry = {
  count: number;
  bestWeight: number;
};

export type Save = {
  level: number;
  xp: number;
  money: number;
  points: number;
  stats: Stats;
  ownedRods: string[];
  ownedReels: string[];
  bait: Record<string, number>;
  equipped: {
    rod: string;
    reel: string;
    bait: string;
  };
  zones: string[];
  currentZone: string;
  logbook: Record<string, LogEntry>;
  totalCaught: number;
  totalEscaped: number;
  welcomed: boolean;
  muted: boolean;
};

export type Fish = {
  id: string;
  name: string;
  zoneId: string;
  rarity: Rarity;
  basePrice: number;
  xp: number;
  minWeight: number;
  maxWeight: number;
  difficulty: number;
  shape: FishShape;
  color: string;
  line: string;
};

export type Zone = {
  id: string;
  name: string;
  blurb: string;
  price: number;
  level: number;
  gate: ZoneGate;
  rareBias: number;
  mood: ZoneMood;
};

export type Rod = {
  id: string;
  name: string;
  price: number;
  power: number;
  luck: number;
  blurb: string;
};

export type Reel = {
  id: string;
  name: string;
  price: number;
  control: number;
  blurb: string;
};

export type Bait = {
  id: string;
  name: string;
  luck: number;
  packSize: number;
  packPrice: number;
  infinite: boolean;
  blurb: string;
};

export type EscapeReason = "tarde" | "zona";

export type Outcome =
  | {
      type: "catch";
      fishId: string;
      weight: number;
      value: number;
      xp: number;
      levelsGained: number;
      discovered: boolean;
    }
  | {
      type: "escape";
      reason: EscapeReason;
      rarity: Rarity;
    };

export type Lance =
  | { kind: "idle" }
  | { kind: "cast" }
  | { kind: "wait"; biteAt: number; castPower: number; fishId: string; weight: number }
  | { kind: "bite"; until: number; castPower: number; fishId: string; weight: number }
  | {
      kind: "reel";
      castPower: number;
      fishId: string;
      weight: number;
      sweet: number;
      width: number;
    }
  | { kind: "result"; castPower: number; outcome: Outcome };
