import { BAITS, getBait, getFish, getReel, getRod, getZone, RODS, REELS, ZONES, FISH } from "./data";
import type { EscapeReason, Fish, Rarity, Save, StatKey, Zone } from "./types";

export type Mods = {
  rareza: number;
  ventanaMs: number;
  zonaDulce: number;
  precio: number;
  potencia: number;
  sweet: number;
};

export type Action =
  | { type: "spend"; stat: StatKey }
  | { type: "buy-rod"; id: string }
  | { type: "buy-reel"; id: string }
  | { type: "buy-bait"; id: string }
  | { type: "buy-zone"; id: string }
  | { type: "equip-rod"; id: string }
  | { type: "equip-reel"; id: string }
  | { type: "equip-bait"; id: string }
  | { type: "select-zone"; id: string }
  | { type: "use-bait" }
  | { type: "catch"; fishId: string; weight: number }
  | { type: "escape" }
  | { type: "welcome" }
  | { type: "mute" }
  | { type: "reset" };

export type Step = {
  save: Save;
  error?: string;
  notice?: string;
  levelsGained?: number;
  value?: number;
  xp?: number;
  discovered?: boolean;
};

const STAT_CAP = 15;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function defaultSave(): Save {
  return {
    level: 1,
    xp: 0,
    money: 40,
    points: 0,
    stats: { fuerza: 1, suerte: 1, paciencia: 1, tecnica: 1 },
    ownedRods: ["bambu"],
    ownedReels: ["madera"],
    bait: { lombriz: 3 },
    equipped: { rod: "bambu", reel: "madera", bait: "miga" },
    zones: ["muelle"],
    currentZone: "muelle",
    logbook: {},
    totalCaught: 0,
    totalEscaped: 0,
    welcomed: false,
    muted: false,
  };
}

export function xpToNext(level: number): number {
  return 30 + (level - 1) * 18;
}

export function luckScore(save: Save): number {
  const zone = getZone(save.currentZone);
  const rod = getRod(save.equipped.rod);
  const bait = getBait(save.equipped.bait);
  return save.stats.suerte * 3 + bait.luck + rod.luck + zone.rareBias * 4;
}

export function biteWindowMs(paciencia: number, reelControl: number): number {
  return 1400 + (paciencia - 1) * 100 + reelControl * 80;
}

export function sweetSpotWidth(paciencia: number, tecnica: number, reelControl: number): number {
  return clamp(0.3 + (paciencia - 1) * 0.02 + (tecnica - 1) * 0.015 + reelControl * 0.025, 0.18, 0.7);
}

export function deriveMods(save: Save): Mods {
  const reel = getReel(save.equipped.reel);
  const rod = getRod(save.equipped.rod);
  const sweet = sweetSpotWidth(save.stats.paciencia, save.stats.tecnica, reel.control);
  return {
    rareza: luckScore(save),
    ventanaMs: biteWindowMs(save.stats.paciencia, reel.control),
    zonaDulce: Math.round(sweet * 100),
    precio: save.stats.tecnica * 5,
    potencia: save.stats.fuerza + rod.power,
    sweet,
  };
}

export function adjustedSweet(base: number, fish: Fish, fuerza: number, rodPower: number): number {
  const deficit = Math.max(0, fish.difficulty - fuerza - rodPower);
  return clamp(base * (1 - deficit * 0.08), 0.12, 0.7);
}

export function rarityWeights(luck: number, castPower: number, zoneRareBias: number): Record<Rarity, number> {
  const cast = clamp(castPower, 0, 1) * 10;
  return {
    comun: Math.max(5, 64 - luck * 0.9 - cast),
    poco_comun: 22 + luck * 0.35 + cast * 0.25,
    raro: 5 + luck * 0.45 + zoneRareBias * 2 + cast * 0.15,
    legendario:
      zoneRareBias >= 2
        ? 1 + luck * 0.2 + (zoneRareBias - 1) * 1.5
        : zoneRareBias === 1
          ? Math.max(0, (luck - 8) * 0.12)
          : 0,
  };
}

export function pickWeighted<T extends string>(weights: Record<T, number>, rng: () => number): T {
  const entries = (Object.entries(weights) as [T, number][]).filter(([, weight]) => weight > 0);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (entries.length === 0 || total <= 0) {
    return "comun" as T;
  }
  let roll = rng() * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

export function rollWeight(fish: Fish, fuerza: number, rodPower: number, rng: () => number): number {
  const span = fish.maxWeight - fish.minWeight;
  const base = fish.minWeight + span * (0.25 + rng() * 0.75);
  const bonus = 1 + fuerza * 0.03 + rodPower * 0.04;
  return Math.round(base * bonus * 100) / 100;
}

export function fishValue(fish: Fish, weight: number, tecnica: number): number {
  const span = Math.max(0.001, fish.maxWeight - fish.minWeight);
  const norm = clamp((weight - fish.minWeight) / span, 0, 1.5);
  const size = 0.85 + norm * 0.4;
  return Math.max(1, Math.round(fish.basePrice * size * (1 + tecnica * 0.05)));
}

const RARITY_FALLBACK: Rarity[] = ["legendario", "raro", "poco_comun", "comun"];

export function rollCatch(save: Save, castPower: number, rng: () => number = Math.random): { fish: Fish; weight: number } {
  const zone = getZone(save.currentZone);
  const luck = luckScore(save);
  const weights = rarityWeights(luck, castPower, zone.rareBias);
  let rarity = pickWeighted(weights, rng);
  let pool: Fish[] = [];
  for (let guard = 0; guard < 4; guard += 1) {
    pool = FISH.filter((fish) => fish.zoneId === zone.id && fish.rarity === rarity);
    if (pool.length > 0) break;
    const index = RARITY_FALLBACK.indexOf(rarity);
    rarity = RARITY_FALLBACK[Math.min(RARITY_FALLBACK.length - 1, index + 1)];
  }
  if (pool.length === 0) pool = FISH.filter((fish) => fish.zoneId === zone.id);
  const fish = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))] ?? FISH[0];
  const rod = getRod(save.equipped.rod);
  return { fish, weight: rollWeight(fish, save.stats.fuerza, rod.power, rng) };
}

export function waitDuration(paciencia: number, rng: () => number = Math.random): number {
  const base = 1200 + rng() * 1600;
  const hurry = Math.min(500, Math.max(0, paciencia - 1) * 80);
  return Math.max(800, Math.round(base - hurry));
}

export function grantXp(save: Save, amount: number): { save: Save; levelsGained: number } {
  let xp = save.xp + amount;
  let level = save.level;
  let points = save.points;
  let levelsGained = 0;
  while (level < 40 && xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    level += 1;
    points += 1;
    levelsGained += 1;
  }
  return { save: { ...save, xp, level, points }, levelsGained };
}

export function unlockQuote(save: Save, zone: Zone): { can: boolean; cost: number; reason: string } {
  if (save.zones.includes(zone.id)) {
    return { can: true, cost: 0, reason: "Ya está abierto." };
  }
  if (zone.gate === "free") {
    return { can: true, cost: 0, reason: "" };
  }
  const levelOk = save.level >= zone.level;
  const moneyOk = save.money >= zone.price;
  if (zone.gate === "either") {
    if (levelOk) return { can: true, cost: 0, reason: `Tu nivel abre este caladero.` };
    if (moneyOk) return { can: true, cost: zone.price, reason: "" };
    return {
      can: false,
      cost: zone.price,
      reason: `${zone.name} cuesta ${zone.price} monedas, o se abre solo al nivel ${zone.level}.`,
    };
  }
  if (!levelOk) {
    return { can: false, cost: zone.price, reason: `${zone.name} pide nivel ${zone.level} y ${zone.price} monedas.` };
  }
  if (!moneyOk) {
    return { can: false, cost: zone.price, reason: `Te faltan ${zone.price - save.money} monedas para ${zone.name}.` };
  }
  return { can: true, cost: zone.price, reason: "" };
}

export function withEquipped(save: Save, patch: Partial<Save["equipped"]>): Save {
  return { ...save, equipped: { ...save.equipped, ...patch } };
}

export function withZone(save: Save, zoneId: string): Save {
  return { ...save, currentZone: zoneId };
}

export function tensionLabel(fish: Fish): string {
  if (fish.rarity === "legendario") return "El sedal canta. Esto es enorme.";
  if (fish.rarity === "raro") return "Pesa de verdad. No aflojes.";
  if (fish.difficulty >= 4) return "Tira hacia el fondo.";
  return "Una picada clara. Cobra en la franja dorada.";
}

export function escapeCopy(reason: EscapeReason, rarity: Rarity): string {
  if (reason === "tarde") {
    if (rarity === "legendario") return "Has clavado tarde. Algo legendario se ha ido al fondo.";
    if (rarity === "raro") return "Tarde. Un pez raro se ha soltado del anzuelo.";
    return "Has clavado tarde. El pez se ha soltado.";
  }
  if (rarity === "legendario") return "Fuera de la franja. Se te escapa una pieza legendaria.";
  if (rarity === "raro") return "Fuera de la franja. Era un pez raro.";
  return "Fuera de la franja. El sedal se afloja y se va.";
}

function missingMoney(price: number, money: number): string {
  return `Te faltan ${price - money} monedas.`;
}

export function reduce(save: Save, action: Action): Step {
  switch (action.type) {
    case "reset":
      return { save: defaultSave(), notice: "Empiezas de cero en el muelle." };
    case "welcome":
      return { save: { ...save, welcomed: true } };
    case "mute":
      return { save: { ...save, muted: !save.muted } };
    case "spend": {
      if (save.points < 1) return { save, error: "No tienes puntos. Sube de nivel pescando." };
      if (save.stats[action.stat] >= STAT_CAP) return { save, error: "Ese atributo está al máximo." };
      const stats = { ...save.stats, [action.stat]: save.stats[action.stat] + 1 };
      return {
        save: { ...save, points: save.points - 1, stats },
        notice: `${labelStat(action.stat)} sube a ${stats[action.stat]}.`,
      };
    }
    case "buy-rod": {
      const rod = RODS.find((item) => item.id === action.id);
      if (!rod || rod.price <= 0) return { save, error: "Esa caña no está en la tienda." };
      if (save.ownedRods.includes(rod.id)) return { save, error: "Ya tienes esa caña." };
      if (save.money < rod.price) return { save, error: missingMoney(rod.price, save.money) };
      return {
        save: {
          ...save,
          money: save.money - rod.price,
          ownedRods: [...save.ownedRods, rod.id],
          equipped: { ...save.equipped, rod: rod.id },
        },
        notice: `Ahora usas ${rod.name}.`,
      };
    }
    case "buy-reel": {
      const reel = REELS.find((item) => item.id === action.id);
      if (!reel || reel.price <= 0) return { save, error: "Ese carrete no está en la tienda." };
      if (save.ownedReels.includes(reel.id)) return { save, error: "Ya tienes ese carrete." };
      if (save.money < reel.price) return { save, error: missingMoney(reel.price, save.money) };
      return {
        save: {
          ...save,
          money: save.money - reel.price,
          ownedReels: [...save.ownedReels, reel.id],
          equipped: { ...save.equipped, reel: reel.id },
        },
        notice: `Ahora usas ${reel.name}.`,
      };
    }
    case "buy-bait": {
      const bait = BAITS.find((item) => item.id === action.id);
      if (!bait || bait.infinite) return { save, error: "Ese cebo no se compra." };
      if (save.money < bait.packPrice) return { save, error: missingMoney(bait.packPrice, save.money) };
      const have = save.bait[bait.id] ?? 0;
      return {
        save: {
          ...save,
          money: save.money - bait.packPrice,
          bait: { ...save.bait, [bait.id]: have + bait.packSize },
          equipped: { ...save.equipped, bait: bait.id },
        },
        notice: `Compras ${bait.packSize} × ${bait.name} y lo equipas.`,
      };
    }
    case "buy-zone": {
      const zone = ZONES.find((item) => item.id === action.id);
      if (!zone) return { save, error: "Ese caladero no existe." };
      if (save.zones.includes(zone.id)) return { save, error: "Ese caladero ya está abierto." };
      const quote = unlockQuote(save, zone);
      if (!quote.can) return { save, error: quote.reason };
      return {
        save: {
          ...save,
          money: save.money - quote.cost,
          zones: [...save.zones, zone.id],
          currentZone: zone.id,
        },
        notice: quote.cost === 0 ? `Tu nivel abre ${zone.name}.` : `Abres ${zone.name}.`,
      };
    }
    case "equip-rod": {
      if (!save.ownedRods.includes(action.id)) return { save, error: "No tienes esa caña." };
      if (save.equipped.rod === action.id) return { save };
      return {
        save: withEquipped(save, { rod: action.id }),
        notice: `Ahora usas ${getRod(action.id).name}.`,
      };
    }
    case "equip-reel": {
      if (!save.ownedReels.includes(action.id)) return { save, error: "No tienes ese carrete." };
      if (save.equipped.reel === action.id) return { save };
      return {
        save: withEquipped(save, { reel: action.id }),
        notice: `Ahora usas ${getReel(action.id).name}.`,
      };
    }
    case "equip-bait": {
      const bait = getBait(action.id);
      if (!bait.infinite && (save.bait[bait.id] ?? 0) <= 0) {
        return { save, error: `No te queda ${bait.name.toLowerCase()}.` };
      }
      if (save.equipped.bait === bait.id) return { save };
      return {
        save: withEquipped(save, { bait: bait.id }),
        notice: `Anzuelo con ${bait.name.toLowerCase()}.`,
      };
    }
    case "select-zone": {
      if (!save.zones.includes(action.id)) return { save, error: "Aún no puedes pescar ahí." };
      if (save.currentZone === action.id) return { save };
      return { save: { ...save, currentZone: action.id } };
    }
    case "use-bait": {
      const bait = getBait(save.equipped.bait);
      if (bait.infinite) return { save };
      const count = save.bait[bait.id] ?? 0;
      if (count <= 0) {
        return {
          save: withEquipped(save, { bait: "miga" }),
          notice: "Sin cebo. Usas miga de pan.",
        };
      }
      const left = count - 1;
      const baitCounts = { ...save.bait, [bait.id]: left };
      if (left <= 0) {
        return {
          save: { ...save, bait: baitCounts, equipped: { ...save.equipped, bait: "miga" } },
          notice: `Se acabó ${bait.name.toLowerCase()}. Vuelves a la miga de pan.`,
        };
      }
      return { save: { ...save, bait: baitCounts } };
    }
    case "catch": {
      const fish = getFish(action.fishId);
      if (!fish) return { save, error: "Ese pez no está en la lonja." };
      const value = fishValue(fish, action.weight, save.stats.tecnica);
      const previous = save.logbook[fish.id];
      const discovered = !previous;
      const gained = grantXp(
        {
          ...save,
          money: save.money + value,
          totalCaught: save.totalCaught + 1,
          logbook: {
            ...save.logbook,
            [fish.id]: {
              count: (previous?.count ?? 0) + 1,
              bestWeight: Math.max(previous?.bestWeight ?? 0, action.weight),
            },
          },
        },
        fish.xp,
      );
      return {
        save: gained.save,
        levelsGained: gained.levelsGained,
        value,
        xp: fish.xp,
        discovered,
        notice:
          gained.levelsGained > 0
            ? `Nivel ${gained.save.level}. Tienes ${gained.save.points} ${gained.save.points === 1 ? "punto" : "puntos"} para mejorar.`
            : undefined,
      };
    }
    case "escape":
      return { save: { ...save, totalEscaped: save.totalEscaped + 1 } };
    default:
      return { save };
  }
}

function labelStat(stat: StatKey): string {
  if (stat === "fuerza") return "Fuerza";
  if (stat === "suerte") return "Suerte";
  if (stat === "paciencia") return "Paciencia";
  return "Técnica";
}

export { STAT_CAP };
