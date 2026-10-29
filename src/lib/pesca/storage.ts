import { BAITS, FISH, REELS, RODS, ZONES } from "./data";
import { defaultSave } from "./logic";
import type { Save, StatKey } from "./types";
import { STAT_KEYS } from "./types";

export const SAVE_KEY = "caleta-v1";

const ROD_IDS = new Set(RODS.map((rod) => rod.id));
const REEL_IDS = new Set(REELS.map((reel) => reel.id));
const ZONE_IDS = new Set(ZONES.map((zone) => zone.id));
const FISH_IDS = new Set(FISH.map((fish) => fish.id));
const BAIT_IDS = new Set(BAITS.filter((bait) => !bait.infinite).map((bait) => bait.id));

function integer(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function sanitize(input: unknown): Save {
  const base = defaultSave();
  if (!input || typeof input !== "object") return base;
  const raw = input as Partial<Save>;
  const stats = { ...base.stats };
  if (raw.stats && typeof raw.stats === "object") {
    for (const key of STAT_KEYS) {
      stats[key] = integer((raw.stats as Partial<Record<StatKey, unknown>>)[key], base.stats[key], 1, 15);
    }
  }
  const ownedRods = Array.isArray(raw.ownedRods)
    ? raw.ownedRods.filter((id): id is string => typeof id === "string" && ROD_IDS.has(id))
    : [];
  if (!ownedRods.includes("bambu")) ownedRods.unshift("bambu");
  const ownedReels = Array.isArray(raw.ownedReels)
    ? raw.ownedReels.filter((id): id is string => typeof id === "string" && REEL_IDS.has(id))
    : [];
  if (!ownedReels.includes("madera")) ownedReels.unshift("madera");
  const zones = Array.isArray(raw.zones)
    ? raw.zones.filter((id): id is string => typeof id === "string" && ZONE_IDS.has(id))
    : [];
  if (!zones.includes("muelle")) zones.unshift("muelle");
  const bait: Record<string, number> = {};
  if (raw.bait && typeof raw.bait === "object") {
    for (const id of BAIT_IDS) {
      const count = (raw.bait as Record<string, unknown>)[id];
      if (typeof count === "number" && Number.isFinite(count) && count > 0) {
        bait[id] = Math.min(999, Math.round(count));
      }
    }
  }
  const logbook: Save["logbook"] = {};
  if (raw.logbook && typeof raw.logbook === "object") {
    for (const id of FISH_IDS) {
      const entry = (raw.logbook as Record<string, unknown>)[id];
      if (!entry || typeof entry !== "object") continue;
      const record = entry as { count?: unknown; bestWeight?: unknown };
      const count = integer(record.count, 0, 0, 99999);
      const bestWeight =
        typeof record.bestWeight === "number" && Number.isFinite(record.bestWeight)
          ? Math.max(0, record.bestWeight)
          : 0;
      if (count > 0) logbook[id] = { count, bestWeight };
    }
  }
  const equippedRod =
    raw.equipped && typeof raw.equipped.rod === "string" && ownedRods.includes(raw.equipped.rod)
      ? raw.equipped.rod
      : "bambu";
  const equippedReel =
    raw.equipped && typeof raw.equipped.reel === "string" && ownedReels.includes(raw.equipped.reel)
      ? raw.equipped.reel
      : "madera";
  let equippedBait =
    raw.equipped && typeof raw.equipped.bait === "string" ? raw.equipped.bait : "miga";
  if (equippedBait !== "miga" && (bait[equippedBait] ?? 0) <= 0) equippedBait = "miga";
  const currentZone =
    typeof raw.currentZone === "string" && zones.includes(raw.currentZone) ? raw.currentZone : "muelle";
  return {
    level: integer(raw.level, 1, 1, 40),
    xp: integer(raw.xp, 0, 0, 999999),
    money: integer(raw.money, base.money, 0, 999999),
    points: integer(raw.points, 0, 0, 80),
    stats,
    ownedRods,
    ownedReels,
    bait,
    equipped: { rod: equippedRod, reel: equippedReel, bait: equippedBait },
    zones,
    currentZone,
    logbook,
    totalCaught: integer(raw.totalCaught, 0, 0, 999999),
    totalEscaped: integer(raw.totalEscaped, 0, 0, 999999),
    welcomed: raw.welcomed === true,
    muted: raw.muted === true,
  };
}

export function loadSave(): Save {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    return sanitize(JSON.parse(raw) as unknown);
  } catch {
    return defaultSave();
  }
}

export function writeSave(save: Save): void {
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

type SaveListener = () => void;

const listeners = new Set<SaveListener>();
let memory: Save | null = null;

export function subscribeSave(listener: SaveListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getClientSave(): Save | null {
  if (memory) return memory;
  memory = loadSave();
  return memory;
}

export function getServerSave(): null {
  return null;
}

export function commitSave(next: Save): void {
  memory = next;
  writeSave(next);
  for (const listener of listeners) listener();
}
