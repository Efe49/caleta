import { useEffect, useState, type RefObject } from "react";
import { ZONES, getBait, getFish, getReel, getRod } from "@/lib/pesca/data";
import { formatWeight } from "@/lib/pesca/format";
import { escapeCopy, tensionLabel, unlockQuote } from "@/lib/pesca/logic";
import type { Lance, Save } from "@/lib/pesca/types";
import { FishGlyph, GameButton, RarityPill } from "./ui";

export function Dock({
  save,
  lance,
  markerRef,
  onCast,
  onRelease,
  onHook,
  onReel,
  onZone,
}: {
  save: Save;
  lance: Lance;
  markerRef: RefObject<number>;
  onCast: () => void;
  onRelease: (power: number) => void;
  onHook: () => void;
  onReel: (marker: number) => void;
  onZone: (id: string) => void;
}) {
  const busy = lance.kind !== "idle" && lance.kind !== "result";
  const fish = lance.kind === "result" && lance.outcome.type === "catch" ? getFish(lance.outcome.fishId) : undefined;
  const fight = lance.kind === "reel" || lance.kind === "bite" || lance.kind === "wait" ? getFish(lance.fishId) : undefined;
  return (
    <div className="grid gap-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {ZONES.map((zone) => {
          const open = save.zones.includes(zone.id);
          const active = save.currentZone === zone.id;
          const quote = unlockQuote(save, zone);
          return (
            <button
              key={zone.id}
              type="button"
              data-testid={`zone-${zone.id}`}
              aria-pressed={active}
              disabled={busy}
              onClick={() => onZone(zone.id)}
              className={`w-40 shrink-0 rounded-2xl border px-3 py-2 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6f78] disabled:opacity-60 ${
                active ? "border-[#1f6f78] bg-[#e7f3f1]" : "border-[#ead9b8] bg-white/70"
              }`}
            >
              <span className="block truncate font-semibold text-[#2c241c]" title={zone.name}>
                {zone.name}
              </span>
              <span className="block text-xs text-[#6a5844]">
                {open ? "Abierto" : quote.cost === 0 && save.level >= zone.level ? "Se abre con tu nivel" : zone.gate === "either" ? `${zone.price} monedas o nivel ${zone.level}` : `Nivel ${zone.level} · ${zone.price} monedas`}
              </span>
            </button>
          );
        })}
      </div>

      {lance.kind === "idle" ? (
        <p className="text-sm leading-relaxed text-[#5c4a36]">
          Lanza el sedal, espera a que el corcho se hunda y clava. Después cobra dentro de la franja dorada.
        </p>
      ) : null}
      {lance.kind === "cast" ? (
        <div className="grid gap-2">
          <p className="text-sm text-[#5c4a36]">Suelta cuando el punto esté alto si quieres agua más honda.</p>
          <CastMeter markerRef={markerRef} />
          <div className="flex justify-between text-[11px] uppercase tracking-wide text-[#7a6854]">
            <span>Orilla</span>
            <span>Agua honda</span>
          </div>
        </div>
      ) : null}
      {lance.kind === "wait" ? (
        <p data-testid="waiting" className="text-sm text-[#5c4a36]">
          El corcho baila. La picada llega sola: no hace falta tocar nada todavía.
        </p>
      ) : null}
      {lance.kind === "bite" ? (
        <div className="grid gap-2">
          <p className="font-semibold text-[#9a3412]">¡Pica! Clava antes de que se suelte.</p>
          <BiteMeter until={lance.until} />
        </div>
      ) : null}
      {lance.kind === "reel" && fight ? (
        <div className="grid gap-2">
          <p className="text-sm text-[#5c4a36]">{tensionLabel(fight)}</p>
          <ReelMeter markerRef={markerRef} sweet={lance.sweet} width={lance.width} />
        </div>
      ) : null}
      {lance.kind === "result" && lance.outcome.type === "catch" && fish ? (
        <article className="flex items-center gap-3 rounded-2xl bg-white/75 p-3" data-testid="catch-card">
          <FishGlyph shape={fish.shape} color={fish.color} />
          <div>
            <RarityPill rarity={fish.rarity} />
            <h3 data-testid="catch-name" className="font-heading text-2xl leading-tight text-[#2c241c]">
              {fish.name}
            </h3>
            <p className="text-sm text-[#5c4a36]">
              {formatWeight(lance.outcome.weight)} · +{lance.outcome.value} monedas · +{lance.outcome.xp} xp
            </p>
            <p className="text-sm italic text-[#6d5b46]">{fish.line}</p>
            {lance.outcome.discovered ? <p className="text-sm font-semibold text-[#1f6f78]">Nueva en la bitácora.</p> : null}
            {lance.outcome.levelsGained > 0 ? (
              <p className="text-sm font-semibold text-[#8a5a12]">Subes de nivel. Ya puedes mejorar un atributo.</p>
            ) : null}
          </div>
        </article>
      ) : null}
      {lance.kind === "result" && lance.outcome.type === "escape" ? (
        <p data-testid="escape" className="rounded-2xl bg-[#f8e4d8] px-3 py-3 text-sm text-[#6a3418]">
          {escapeCopy(lance.outcome.reason, lance.outcome.rarity)}
        </p>
      ) : null}

      {lance.kind === "cast" ? (
        <GameButton data-testid="action-button" className="h-12 text-base" onClick={() => onRelease(markerRef.current ?? 0)}>
          Soltar
        </GameButton>
      ) : null}
      {lance.kind === "bite" ? (
        <GameButton data-testid="action-button" tone="alert" className="h-12 text-base" onClick={onHook}>
          ¡Clava!
        </GameButton>
      ) : null}
      {lance.kind === "reel" ? (
        <GameButton data-testid="action-button" tone="sand" className="h-12 text-base" onClick={() => onReel(markerRef.current ?? 0)}>
          Cobrar
        </GameButton>
      ) : null}
      {lance.kind === "idle" || lance.kind === "result" ? (
        <GameButton data-testid="action-button" className="h-12 text-base" onClick={onCast}>
          {lance.kind === "result" ? "Lanzar otra vez" : "Lanzar el sedal"}
        </GameButton>
      ) : null}
      <p className="text-center text-[11px] text-[#7a6854]">
        {gearLine(save)}
        {lance.kind === "reel" && fight ? ` · Esta pieza usa una franja del ${Math.round(lance.width * 100)}%.` : ""}
      </p>
    </div>
  );
}

function gearLine(save: Save): string {
  const bait = getBait(save.equipped.bait);
  const count = bait.infinite ? "ilimitada" : String(save.bait[bait.id] ?? 0);
  return `${getRod(save.equipped.rod).name} · ${getReel(save.equipped.reel).name} · ${bait.name} (${count})`;
}

function CastMeter({ markerRef }: { markerRef: RefObject<number> }) {
  const marker = usePing(markerRef, 1500);
  return (
    <div className="relative h-4 rounded-full bg-[#efe0c4]" data-testid="cast-meter">
      <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#b7d4cf] to-[#1f6f78]" style={{ width: `${marker * 100}%` }} />
      <span data-testid="cast-marker" className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#fff8ea] bg-[#21464a]" style={{ left: `${marker * 100}%` }} />
    </div>
  );
}

function ReelMeter({ markerRef, sweet, width }: { markerRef: RefObject<number>; sweet: number; width: number }) {
  const marker = usePing(markerRef, 2800);
  return (
    <div className="relative h-4 rounded-full bg-[#efe0c4]" data-testid="reel-meter">
      <span data-testid="reel-sweet" className="absolute inset-y-0 rounded-full bg-[#e7c56a]" style={{ left: `${sweet * 100}%`, width: `${width * 100}%` }} />
      <span data-testid="reel-marker" className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#fff8ea] bg-[#21464a]" style={{ left: `${marker * 100}%` }} />
    </div>
  );
}

function BiteMeter({ until }: { until: number }) {
  const [duration] = useState(() => Math.max(200, until - Date.now()));
  return (
    <div className="h-3 overflow-hidden rounded-full bg-[#efe0c4]">
      <div className="caleta-shrink h-full rounded-full bg-[#c4492c]" style={{ animationDuration: `${duration}ms` }} />
    </div>
  );
}

function usePing(markerRef: RefObject<number>, period: number): number {
  const [marker, setMarker] = useState(0);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pace = media.matches ? period * 1.6 : period;
    let frame = 0;
    const start = performance.now();
    const loop = (now: number) => {
      const cycle = ((now - start) % pace) / pace;
      const ping = cycle < 0.5 ? cycle * 2 : 2 - cycle * 2;
      markerRef.current = ping;
      setMarker(ping);
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [markerRef, period]);
  return marker;
}
