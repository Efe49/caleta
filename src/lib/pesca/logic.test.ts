import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getFish } from "./data";
import {
  adjustedSweet,
  biteWindowMs,
  defaultSave,
  deriveMods,
  fishValue,
  grantXp,
  luckScore,
  rarityWeights,
  reduce,
  rollCatch,
  sweetSpotWidth,
  unlockQuote,
  xpToNext,
} from "./logic";
import { sanitize } from "./storage";
import { getZone } from "./data";

describe("caleta", () => {
  it("empieza con números claros en el muelle", () => {
    const save = defaultSave();
    const mods = deriveMods(save);
    assert.equal(mods.rareza, 3);
    assert.equal(mods.ventanaMs, 1400);
    assert.equal(mods.zonaDulce, 30);
    assert.equal(mods.precio, 5);
    assert.equal(mods.potencia, 1);
    assert.equal(save.money, 40);
    assert.equal(save.zones[0], "muelle");
  });

  it("el equipo y los atributos mueven la captura", () => {
    const base = defaultSave();
    const worm = reduce(base, { type: "equip-bait", id: "lombriz" }).save;
    assert.equal(deriveMods(worm).rareza, deriveMods(base).rareza + 4);

    const rich = { ...base, money: 200 };
    const rod = reduce(rich, { type: "buy-rod", id: "rio" }).save;
    assert.equal(rod.equipped.rod, "rio");
    assert.equal(rod.money, 155);
    assert.equal(deriveMods(rod).potencia, 2);
    assert.ok(deriveMods(rod).rareza > deriveMods(base).rareza);

    const reel = reduce(rich, { type: "buy-reel", id: "laton" }).save;
    assert.ok(deriveMods(reel).zonaDulce > deriveMods(base).zonaDulce);
    assert.ok(deriveMods(reel).ventanaMs > deriveMods(base).ventanaMs);

    const spent = reduce({ ...base, points: 1 }, { type: "spend", stat: "tecnica" }).save;
    assert.equal(spent.stats.tecnica, 2);
    assert.equal(spent.points, 0);
    assert.equal(deriveMods(spent).precio, 10);
    assert.ok(deriveMods(spent).zonaDulce > deriveMods(base).zonaDulce);
  });

  it("no compra sin monedas y no abre el acantilado solo con dinero", () => {
    const poor = reduce(defaultSave(), { type: "buy-rod", id: "rio" });
    assert.ok(poor.error);
    assert.equal(poor.save.money, 40);

    const rushed = reduce({ ...defaultSave(), money: 1000, level: 1 }, { type: "buy-zone", id: "acantilado" });
    assert.ok(rushed.error);
    assert.equal(rushed.save.currentZone, "muelle");
  });

  it("la ensenada se abre pagando o al llegar al nivel", () => {
    const paid = reduce({ ...defaultSave(), money: 90 }, { type: "buy-zone", id: "ensenada" });
    assert.equal(paid.error, undefined);
    assert.equal(paid.save.money, 0);
    assert.equal(paid.save.currentZone, "ensenada");
    assert.ok(deriveMods(paid.save).rareza > deriveMods(defaultSave()).rareza);

    const earned = reduce({ ...defaultSave(), money: 0, level: 3 }, { type: "buy-zone", id: "ensenada" });
    assert.equal(earned.save.money, 0);
    assert.ok(earned.save.zones.includes("ensenada"));
    assert.match(unlockQuote({ ...defaultSave(), money: 10, level: 1 }, getZone("ensenada")).reason, /90/);
  });

  it("subir de nivel da un punto y el pez paga más con técnica", () => {
    assert.equal(xpToNext(1), 30);
    const leveled = grantXp(defaultSave(), 30);
    assert.equal(leveled.levelsGained, 1);
    assert.equal(leveled.save.level, 2);
    assert.equal(leveled.save.points, 1);
    assert.equal(leveled.save.xp, 0);

    const sardine = getFish("sardina");
    assert.ok(sardine);
    if (!sardine) return;
    assert.ok(fishValue(sardine, 0.3, 8) > fishValue(sardine, 0.3, 1));
  });

  it("una captura entra en la bitácora y una lombriz se gasta", () => {
    const baited = reduce(defaultSave(), { type: "equip-bait", id: "lombriz" }).save;
    const used = reduce(baited, { type: "use-bait" });
    assert.equal(used.save.bait.lombriz, 2);
    assert.equal(used.save.equipped.bait, "lombriz");

    const last = reduce({ ...baited, bait: { lombriz: 1 } }, { type: "use-bait" });
    assert.equal(last.save.bait.lombriz, 0);
    assert.equal(last.save.equipped.bait, "miga");
    assert.match(last.notice ?? "", /miga/);

    const caught = reduce(defaultSave(), { type: "catch", fishId: "sardina", weight: 0.3 });
    assert.equal(caught.discovered, true);
    assert.equal(caught.save.totalCaught, 1);
    assert.equal(caught.save.logbook.sardina?.count, 1);
    assert.ok((caught.value ?? 0) > 0);
    assert.ok(caught.save.money > defaultSave().money);
    assert.equal(caught.save.xp, 10);
  });

  it("la suerte y el caladero cambian los pesos de rareza", () => {
    const shore = rarityWeights(luckScore(defaultSave()), 0.2, 0);
    const deep = rarityWeights(40, 1, 3);
    assert.equal(shore.legendario, 0);
    assert.ok(deep.legendario > 0);
    assert.ok(deep.comun < shore.comun);
    assert.ok(sweetSpotWidth(1, 1, 7) > sweetSpotWidth(1, 1, 0));
    assert.equal(biteWindowMs(2, 2), 1400 + 100 + 160);
  });

  it("un pez difícil estrecha la franja si falta fuerza", () => {
    const tuna = getFish("atun");
    assert.ok(tuna);
    if (!tuna) return;
    const weak = adjustedSweet(0.4, tuna, 1, 0);
    const strong = adjustedSweet(0.4, tuna, 12, 4);
    assert.ok(strong > weak);
    assert.ok(weak >= 0.12);
  });

  it("el lance del muelle devuelve un pez de ese caladero", () => {
    const rolled = rollCatch(defaultSave(), 0.2, () => 0);
    assert.equal(rolled.fish.zoneId, "muelle");
    assert.equal(rolled.fish.id, "sardina");
  });

  it("una partida rota vuelve a un estado jugable", () => {
    const save = sanitize({
      money: -40,
      level: 99,
      stats: { fuerza: 0, suerte: "mucha" },
      ownedRods: ["no-existe"],
      equipped: { rod: "rio", reel: "plata", bait: "luna" },
      zones: [],
      currentZone: "fosa",
      logbook: { sardina: { count: 2, bestWeight: 0.4 }, fantasma: { count: 1, bestWeight: 1 } },
    });
    assert.equal(save.money, 0);
    assert.equal(save.level, 40);
    assert.equal(save.stats.fuerza, 1);
    assert.equal(save.stats.suerte, 1);
    assert.ok(save.ownedRods.includes("bambu"));
    assert.equal(save.equipped.rod, "bambu");
    assert.equal(save.equipped.bait, "miga");
    assert.deepEqual(save.zones, ["muelle"]);
    assert.equal(save.currentZone, "muelle");
    assert.equal(save.logbook.sardina?.count, 2);
    assert.equal(save.logbook.fantasma, undefined);
  });
});
