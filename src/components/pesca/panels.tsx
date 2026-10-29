import { BAITS, FISH, REELS, RODS, STAT_INFO, ZONES, getBait } from "@/lib/pesca/data";
import { formatCoins, formatSeconds, formatWeight } from "@/lib/pesca/format";
import { deriveMods, unlockQuote, withEquipped, withZone, type Action, type Mods } from "@/lib/pesca/logic";
import { STAT_KEYS, type Save, type StatKey } from "@/lib/pesca/types";
import { FishGlyph, GameButton, RarityPill } from "./ui";

export function ShopPanel({ save, onAction }: { save: Save; onAction: (action: Action) => void }) {
  const mods = deriveMods(save);
  return (
    <div className="grid gap-4">
      <p className="text-sm text-[#5c4a36]">La lonja paga cada pez al cobrarlo. Aquí se compran cañas, carretes, cebos y caladeros.</p>
      <section className="grid gap-2">
        <h3 className="font-heading text-xl text-[#2c241c]">Caladeros</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {ZONES.map((zone) => {
            const open = save.zones.includes(zone.id);
            const quote = unlockQuote(save, zone);
            const preview = modChanges(mods, deriveMods(withZone(save, zone.id)));
            return (
              <article key={zone.id} className="rounded-2xl border border-[#ead9b8] bg-white/75 p-3">
                <h4 className="font-heading text-lg text-[#2c241c]">{zone.name}</h4>
                <p className="text-sm text-[#5c4a36]">{zone.blurb}</p>
                <p className="mt-1 text-xs text-[#6a5844]">{preview.join(" · ") || "Misma rareza que ahora."}</p>
                {open ? (
                  <p className="mt-2 text-sm font-semibold text-[#1f6f78]">{save.currentZone === zone.id ? "Estás pescando aquí." : "Abierto."}</p>
                ) : (
                  <GameButton
                    className="mt-2"
                    data-testid={`buy-zone-${zone.id}`}
                    disabled={!quote.can}
                    onClick={() => onAction({ type: "buy-zone", id: zone.id })}
                  >
                    {quote.cost === 0 ? "Abrir con tu nivel" : `Abrir por ${formatCoins(quote.cost)} monedas`}
                  </GameButton>
                )}
                {!open && !quote.can ? <p className="mt-1 text-xs text-[#8a4b32]">{quote.reason}</p> : null}
              </article>
            );
          })}
        </div>
      </section>
      <GearShop
        title="Cañas"
        items={RODS.filter((rod) => rod.price > 0).map((rod) => ({
          id: rod.id,
          name: rod.name,
          blurb: rod.blurb,
          price: rod.price,
          owned: save.ownedRods.includes(rod.id),
          equipped: save.equipped.rod === rod.id,
          changes: modChanges(mods, deriveMods(withEquipped(save, { rod: rod.id }))),
          buy: "buy-rod" as const,
          equip: "equip-rod" as const,
        }))}
        onAction={onAction}
      />
      <GearShop
        title="Carretes"
        items={REELS.filter((reel) => reel.price > 0).map((reel) => ({
          id: reel.id,
          name: reel.name,
          blurb: reel.blurb,
          price: reel.price,
          owned: save.ownedReels.includes(reel.id),
          equipped: save.equipped.reel === reel.id,
          changes: modChanges(mods, deriveMods(withEquipped(save, { reel: reel.id }))),
          buy: "buy-reel" as const,
          equip: "equip-reel" as const,
        }))}
        onAction={onAction}
      />
      <section className="grid gap-2">
        <h3 className="font-heading text-xl text-[#2c241c]">Cebos</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {BAITS.map((bait) => {
            const count = bait.infinite ? null : (save.bait[bait.id] ?? 0);
            const changes = modChanges(mods, deriveMods(withEquipped(save, { bait: bait.id })));
            return (
              <article key={bait.id} className="rounded-2xl border border-[#ead9b8] bg-white/75 p-3">
                <h4 className="font-heading text-lg text-[#2c241c]">{bait.name}</h4>
                <p className="text-sm text-[#5c4a36]">{bait.blurb}</p>
                <p className="mt-1 text-xs text-[#6a5844]">{changes.join(" · ") || "Sin cambio de números."}</p>
                <p className="mt-1 text-xs text-[#6a5844]">{bait.infinite ? "No se acaba." : `Tienes ${count}.`}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {bait.infinite ? null : (
                    <GameButton data-testid={`buy-bait-${bait.id}`} disabled={save.money < bait.packPrice} onClick={() => onAction({ type: "buy-bait", id: bait.id })}>
                      {bait.packSize} × por {formatCoins(bait.packPrice)}
                    </GameButton>
                  )}
                  <GameButton
                    tone="ghost"
                    data-testid={`equip-bait-${bait.id}`}
                    disabled={save.equipped.bait === bait.id || (!bait.infinite && (count ?? 0) <= 0)}
                    onClick={() => onAction({ type: "equip-bait", id: bait.id })}
                  >
                    {save.equipped.bait === bait.id ? "En el anzuelo" : "Equipar"}
                  </GameButton>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function GearShop({
  title,
  items,
  onAction,
}: {
  title: string;
  items: {
    id: string;
    name: string;
    blurb: string;
    price: number;
    owned: boolean;
    equipped: boolean;
    changes: string[];
    buy: "buy-rod" | "buy-reel";
    equip: "equip-rod" | "equip-reel";
  }[];
  onAction: (action: Action) => void;
}) {
  return (
    <section className="grid gap-2">
      <h3 className="font-heading text-xl text-[#2c241c]">{title}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-[#ead9b8] bg-white/75 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="font-heading text-lg text-[#2c241c]">{item.name}</h4>
              <span className="text-sm text-[#8a5a12]">{item.owned ? "Tuya" : `${formatCoins(item.price)} monedas`}</span>
            </div>
            <p className="text-sm text-[#5c4a36]">{item.blurb}</p>
            <p className="mt-1 text-xs text-[#6a5844]">{item.changes.join(" · ")}</p>
            <div className="mt-2">
              {item.owned ? (
                <GameButton tone="ghost" data-testid={`${item.equip}-${item.id}`} disabled={item.equipped} onClick={() => onAction({ type: item.equip, id: item.id })}>
                  {item.equipped ? "En uso" : "Equipar"}
                </GameButton>
              ) : (
                <GameButton data-testid={`${item.buy}-${item.id}`} onClick={() => onAction({ type: item.buy, id: item.id })}>
                  Comprar y equipar
                </GameButton>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function GearPanel({ save, onAction }: { save: Save; onAction: (action: Action) => void }) {
  return (
    <div className="grid gap-4">
      <p className="text-sm text-[#5c4a36]">Lo que llevas encima cambia la rareza, la ventana y la franja dorada.</p>
      <section>
        <h3 className="font-heading text-xl text-[#2c241c]">Cañas</h3>
        <div className="mt-2 grid gap-2">
          {RODS.filter((rod) => save.ownedRods.includes(rod.id)).map((rod) => (
            <div key={rod.id} className="flex items-center justify-between gap-2 rounded-2xl bg-white/70 px-3 py-2">
              <div>
                <p className="font-semibold">{rod.name}</p>
                <p className="text-xs text-[#6a5844]">Potencia +{rod.power} · rareza +{rod.luck}</p>
              </div>
              <GameButton tone="ghost" data-testid={`equip-rod-${rod.id}`} disabled={save.equipped.rod === rod.id} onClick={() => onAction({ type: "equip-rod", id: rod.id })}>
                {save.equipped.rod === rod.id ? "En uso" : "Equipar"}
              </GameButton>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3 className="font-heading text-xl text-[#2c241c]">Carretes</h3>
        <div className="mt-2 grid gap-2">
          {REELS.filter((reel) => save.ownedReels.includes(reel.id)).map((reel) => (
            <div key={reel.id} className="flex items-center justify-between gap-2 rounded-2xl bg-white/70 px-3 py-2">
              <div>
                <p className="font-semibold">{reel.name}</p>
                <p className="text-xs text-[#6a5844]">Control +{reel.control}</p>
              </div>
              <GameButton tone="ghost" data-testid={`equip-reel-${reel.id}`} disabled={save.equipped.reel === reel.id} onClick={() => onAction({ type: "equip-reel", id: reel.id })}>
                {save.equipped.reel === reel.id ? "En uso" : "Equipar"}
              </GameButton>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3 className="font-heading text-xl text-[#2c241c]">Cebos</h3>
        <div className="mt-2 grid gap-2">
          {BAITS.map((bait) => {
            const count = bait.infinite ? null : (save.bait[bait.id] ?? 0);
            if (!bait.infinite && (count ?? 0) <= 0 && save.equipped.bait !== bait.id) return null;
            return (
              <div key={bait.id} className="flex items-center justify-between gap-2 rounded-2xl bg-white/70 px-3 py-2">
                <div>
                  <p className="font-semibold">{bait.name}</p>
                  <p className="text-xs text-[#6a5844]">{bait.infinite ? "Infinito" : `${count} en la caja`} · rareza +{bait.luck}</p>
                </div>
                <GameButton tone="ghost" data-testid={`equip-bait-${bait.id}`} disabled={save.equipped.bait === bait.id} onClick={() => onAction({ type: "equip-bait", id: bait.id })}>
                  {save.equipped.bait === bait.id ? "En el anzuelo" : "Equipar"}
                </GameButton>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function LogbookPanel({ save }: { save: Save }) {
  const known = Object.values(save.logbook).reduce((sum, entry) => sum + entry.count, 0);
  return (
    <div className="grid gap-3">
      <p className="text-sm text-[#5c4a36]">
        {known === 0 ? "La bitácora está en blanco. El primer pez escribe la primera línea." : `${known} peces cobrados · ${save.totalEscaped} se fueron.`} La lonja paga al momento.
      </p>
      {ZONES.map((zone) => (
        <section key={zone.id}>
          <h3 className="font-heading text-lg text-[#2c241c]">{zone.name}</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FISH.filter((fish) => fish.zoneId === zone.id).map((fish) => {
              const entry = save.logbook[fish.id];
              return (
                <article key={fish.id} className="rounded-2xl border border-[#ead9b8] bg-white/70 p-2">
                  <FishGlyph shape={fish.shape} color={fish.color} size={56} muted={!entry} />
                  {entry ? (
                    <>
                      <p className="font-semibold leading-tight">{fish.name}</p>
                      <RarityPill rarity={fish.rarity} />
                      <p className="text-xs text-[#6a5844]">
                        {entry.count} · mejor {formatWeight(entry.bestWeight)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-[#7a6854]">Aún no aparece</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function StatsPanel({ save, onAction }: { save: Save; onAction: (action: Action) => void }) {
  const mods = deriveMods(save);
  return (
    <div className="grid gap-3">
      <p className="text-sm text-[#5c4a36]">
        Cada nivel da un punto. Ahora tienes <span className="font-semibold">{save.points}</span>. El máximo de cada atributo es 15.
      </p>
      {STAT_KEYS.map((key) => {
        const info = STAT_INFO[key];
        const next = previewStat(save, key);
        const changes = save.stats[key] >= 15 ? [] : modChanges(mods, deriveMods(next));
        return (
          <article key={key} className="flex items-center gap-3 rounded-2xl border border-[#ead9b8] bg-white/75 p-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-heading text-xl text-[#2c241c]">
                {info.name} <span className="tabular-nums">{save.stats[key]}</span>
              </h3>
              <p className="text-sm text-[#5c4a36]">{info.blurb}</p>
              {changes.length > 0 ? <p className="mt-1 text-xs text-[#1f6f78]">{changes.join(" · ")}</p> : null}
            </div>
            <GameButton data-testid={`spend-${key}`} disabled={save.points < 1 || save.stats[key] >= 15} onClick={() => onAction({ type: "spend", stat: key })}>
              Sumar
            </GameButton>
          </article>
        );
      })}
    </div>
  );
}

function previewStat(save: Save, key: StatKey): Save {
  return { ...save, stats: { ...save.stats, [key]: save.stats[key] + 1 } };
}

function modChanges(current: Mods, next: Mods): string[] {
  const lines: string[] = [];
  if (current.rareza !== next.rareza) lines.push(`Rareza +${current.rareza} pasa a +${next.rareza}`);
  if (current.ventanaMs !== next.ventanaMs) lines.push(`Ventana ${formatSeconds(current.ventanaMs)} pasa a ${formatSeconds(next.ventanaMs)}`);
  if (current.zonaDulce !== next.zonaDulce) lines.push(`Zona dulce ${current.zonaDulce}% pasa a ${next.zonaDulce}%`);
  if (current.precio !== next.precio) lines.push(`Precio +${current.precio}% pasa a +${next.precio}%`);
  if (current.potencia !== next.potencia) lines.push(`Potencia ${current.potencia} pasa a ${next.potencia}`);
  return lines;
}

export function gearSummary(save: Save): string {
  const bait = getBait(save.equipped.bait);
  const count = bait.infinite ? "ilimitada" : String(save.bait[bait.id] ?? 0);
  return `${getRodName(save)} · ${getReelName(save)} · ${bait.name} (${count})`;
}

function getRodName(save: Save): string {
  return RODS.find((rod) => rod.id === save.equipped.rod)?.name ?? "Caña";
}

function getReelName(save: Save): string {
  return REELS.find((reel) => reel.id === save.equipped.reel)?.name ?? "Carrete";
}
