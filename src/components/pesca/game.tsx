"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getBait, getFish, getRod, getZone } from "@/lib/pesca/data";
import { formatSeconds } from "@/lib/pesca/format";
import {
  adjustedSweet,
  clamp,
  deriveMods,
  escapeCopy,
  reduce,
  rollCatch,
  tensionLabel,
  waitDuration,
  type Action,
  type Step,
} from "@/lib/pesca/logic";
import { playTone } from "@/lib/pesca/sound";
import { commitSave, getClientSave, getServerSave, subscribeSave } from "@/lib/pesca/storage";
import type { Lance, Rarity } from "@/lib/pesca/types";
import { Dock } from "./dock";
import { Hud } from "./hud";
import { GearPanel, LogbookPanel, ShopPanel, StatsPanel } from "./panels";
import { Scene } from "./scene";
import { Chip, GameButton } from "./ui";

type Panel = "pesca" | "tienda" | "equipo" | "bitacora" | "mejoras";

const TABS: { id: Panel; label: string }[] = [
  { id: "pesca", label: "Pescar" },
  { id: "tienda", label: "Tienda" },
  { id: "equipo", label: "Equipo" },
  { id: "bitacora", label: "Bitácora" },
  { id: "mejoras", label: "Mejoras" },
];

function rarityOf(id: string): Rarity {
  return getFish(id)?.rarity ?? "comun";
}

function reelLine(fishId: string): string {
  const fish = getFish(fishId);
  return fish ? tensionLabel(fish) : "Cobrando.";
}

export function Game() {
  const save = useSyncExternalStore(subscribeSave, getClientSave, getServerSave);
  const [lance, setLance] = useState<Lance>({ kind: "idle" });
  const [panel, setPanel] = useState<Panel>("pesca");
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const markerRef = useRef(0);
  const lanceRef = useRef<Lance>(lance);
  const attemptRef = useRef(0);
  const actionsRef = useRef<{
    onHook: () => void;
    onReel: (marker: number) => void;
    onRelease: (power: number) => void;
    startCast: () => void;
  }>({
    onHook: () => {},
    onReel: () => {},
    onRelease: () => {},
    startCast: () => {},
  });

  function moveLance(next: Lance) {
    lanceRef.current = next;
    setLance(next);
    if (next.kind === "bite" || next.kind === "reel") setPanel("pesca");
  }

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (lance.kind !== "wait") return;
    const wait = lance;
    const attempt = attemptRef.current;
    const delay = Math.max(0, wait.biteAt - Date.now());
    const timer = window.setTimeout(() => {
      if (attemptRef.current !== attempt) return;
      const current = getClientSave();
      if (!current) return;
      const mods = deriveMods(current);
      moveLance({
        kind: "bite",
        until: Date.now() + mods.ventanaMs,
        castPower: wait.castPower,
        fishId: wait.fishId,
        weight: wait.weight,
      });
      playTone("bite", current.muted);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [lance]);

  useEffect(() => {
    if (lance.kind !== "bite") return;
    const bite = lance;
    const attempt = attemptRef.current;
    const delay = Math.max(0, bite.until - Date.now());
    const timer = window.setTimeout(() => {
      if (attemptRef.current !== attempt) return;
      const current = getClientSave();
      if (!current) return;
      attemptRef.current += 1;
      moveLance({
        kind: "result",
        castPower: bite.castPower,
        outcome: { type: "escape", reason: "tarde", rarity: rarityOf(bite.fishId) },
      });
      commitSave(reduce(current, { type: "escape" }).save);
      playTone("miss", current.muted);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [lance]);

  function apply(action: Action): Step | null {
    const current = getClientSave();
    if (!current) return null;
    const step = reduce(current, action);
    commitSave(step.save);
    if (step.error) setNotice(step.error);
    else if (step.notice) setNotice(step.notice);
    if (!step.error && (action.type.startsWith("buy") || action.type === "spend")) playTone("buy", step.save.muted);
    return step;
  }

  function onHook() {
    const current = getClientSave();
    const active = lanceRef.current;
    if (!current || active.kind !== "bite") return;
    if (Date.now() > active.until) return;
    const fish = getFish(active.fishId);
    if (!fish) return;
    attemptRef.current += 1;
    const rod = getRod(current.equipped.rod);
    const mods = deriveMods(current);
    const width = adjustedSweet(mods.sweet, fish, current.stats.fuerza, rod.power);
    const sweet = Math.random() * (1 - width);
    moveLance({
      kind: "reel",
      castPower: active.castPower,
      fishId: active.fishId,
      weight: active.weight,
      sweet,
      width,
    });
  }

  function onReel(marker: number) {
    const current = getClientSave();
    const active = lanceRef.current;
    if (!current || active.kind !== "reel") return;
    attemptRef.current += 1;
    const hit = marker >= active.sweet && marker <= active.sweet + active.width;
    if (!hit) {
      moveLance({
        kind: "result",
        castPower: active.castPower,
        outcome: { type: "escape", reason: "zona", rarity: rarityOf(active.fishId) },
      });
      commitSave(reduce(current, { type: "escape" }).save);
      playTone("miss", current.muted);
      return;
    }
    const step = reduce(current, { type: "catch", fishId: active.fishId, weight: active.weight });
    commitSave(step.save);
    moveLance({
      kind: "result",
      castPower: active.castPower,
      outcome: {
        type: "catch",
        fishId: active.fishId,
        weight: active.weight,
        value: step.value ?? 0,
        xp: step.xp ?? 0,
        levelsGained: step.levelsGained ?? 0,
        discovered: step.discovered ?? false,
      },
    });
    playTone("catch", step.save.muted);
  }

  function onRelease(power: number) {
    const current = getClientSave();
    const active = lanceRef.current;
    if (!current || active.kind !== "cast") return;
    const step = reduce(current, { type: "use-bait" });
    commitSave(step.save);
    if (step.notice) setNotice(step.notice);
    const rolled = rollCatch(step.save, clamp(power, 0, 1));
    const ms = waitDuration(step.save.stats.paciencia);
    attemptRef.current += 1;
    moveLance({
      kind: "wait",
      biteAt: Date.now() + ms,
      castPower: clamp(power, 0, 1),
      fishId: rolled.fish.id,
      weight: rolled.weight,
    });
    playTone("cast", step.save.muted);
  }

  function startCast() {
    const current = getClientSave();
    const active = lanceRef.current;
    if (!current?.welcomed) return;
    if (active.kind !== "idle" && active.kind !== "result") return;
    setPanel("pesca");
    moveLance({ kind: "cast" });
  }

  function onZone(id: string) {
    const current = getClientSave();
    const active = lanceRef.current;
    if (!current) return;
    if (!current.zones.includes(id)) {
      setNotice("Ese caladero sigue cerrado. Míralo en la tienda.");
      setPanel("tienda");
      return;
    }
    if (active.kind !== "idle" && active.kind !== "result") {
      setNotice("Termina el lance antes de cambiar de agua.");
      return;
    }
    apply({ type: "select-zone", id });
  }

  useEffect(() => {
    actionsRef.current = { onHook, onReel, onRelease, startCast };
  });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "BUTTON" || tag === "A" || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      }
      if (event.code !== "Space" && event.code !== "Enter") return;
      const actions = actionsRef.current;
      const active = lanceRef.current;
      if (active.kind === "cast") {
        event.preventDefault();
        actions.onRelease(markerRef.current);
      } else if (active.kind === "bite") {
        event.preventDefault();
        actions.onHook();
      } else if (active.kind === "reel") {
        event.preventDefault();
        actions.onReel(markerRef.current);
      } else if (active.kind === "idle" || active.kind === "result") {
        event.preventDefault();
        actions.startCast();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!save) {
    return (
      <div className="grid h-dvh place-items-center bg-gradient-to-b from-[#ffb089] via-[#7ec8c3] to-[#1d4e89] text-[#1c2430]">
        <p className="font-heading text-2xl">La marea entra…</p>
      </div>
    );
  }

  const zone = getZone(save.currentZone);
  const mods = deriveMods(save);
  const rod = getRod(save.equipped.rod);
  const bait = getBait(save.equipped.bait);
  const busy = lance.kind !== "idle" && lance.kind !== "result";
  const castPower = "castPower" in lance ? lance.castPower : 0;
  const live =
    lance.kind === "idle"
      ? "Listo para lanzar."
      : lance.kind === "cast"
        ? "Elige la fuerza del lance."
        : lance.kind === "wait"
          ? `Esperando picada de ${getFish(lance.fishId)?.name ?? "un pez"}.`
          : lance.kind === "bite"
            ? "¡Pica! Clava ahora."
            : lance.kind === "reel"
              ? reelLine(lance.fishId)
              : lance.outcome.type === "catch"
                ? `Has cobrado ${getFish(lance.outcome.fishId)?.name ?? "un pez"}.`
                : escapeCopy(lance.outcome.reason, lance.outcome.rarity);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden text-[#1c2430]">
      <Scene mood={zone.mood} castPower={castPower} phase={lance.kind} />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <Hud
          save={save}
          zoneName={zone.name}
          confirmReset={confirmReset}
          onToggleMute={() => apply({ type: "mute" })}
          onAskReset={() => setConfirmReset(true)}
          onCancelReset={() => setConfirmReset(false)}
          onReset={() => {
            apply({ type: "reset" });
            attemptRef.current += 1;
            moveLance({ kind: "idle" });
            setPanel("pesca");
            setConfirmReset(false);
          }}
        />
        <div className="min-h-[22vh] flex-1" />
        <section
          className={`relative z-10 flex max-h-[58dvh] min-h-0 flex-col overflow-hidden rounded-t-[1.6rem] border border-white/50 bg-[#f3e2c4]/92 shadow-[0_-18px_50px_rgba(28,36,48,0.18)] backdrop-blur-md ${
            lance.kind === "bite" ? "ring-4 ring-[#b23a2f]" : ""
          }`}
        >
          <div className="flex gap-2 overflow-x-auto px-3 pt-3">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                data-testid={`tab-${tab.id}`}
                onClick={() => setPanel(tab.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
                  panel === tab.id ? "bg-[#1d4e89] text-[#f6efe2]" : "bg-white/70 text-[#1c2430]"
                }`}
              >
                {tab.label}
                {tab.id === "mejoras" && save.points > 0 ? ` · ${save.points}` : ""}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 px-3 pt-3 text-xs">
            <Chip testId="mods-rareza">Rareza +{mods.rareza}</Chip>
            <Chip testId="mods-ventana">Ventana {formatSeconds(mods.ventanaMs)}</Chip>
            <Chip testId="mods-zona">Zona dulce {mods.zonaDulce}%</Chip>
            <Chip testId="mods-precio">Precio +{mods.precio}%</Chip>
            <Chip testId="mods-potencia">Potencia {mods.potencia}</Chip>
          </div>
          <p className="px-3 pt-2 text-sm text-[#5c4a32]">
            {rod.name} · {bait.name}
            {bait.infinite ? "" : ` ×${save.bait[bait.id] ?? 0}`}
          </p>
          {notice ? (
            <p role="status" data-testid="notice" className="mx-3 mt-2 rounded-xl bg-[#1c2430] px-3 py-2 text-sm text-[#f6efe2]">
              {notice}
            </p>
          ) : null}
          {busy && panel !== "pesca" ? (
            <div className="mx-3 mt-2 flex items-center justify-between gap-3 rounded-xl bg-[#b23a2f]/10 px-3 py-2 text-sm">
              <span>Hay un lance en curso.</span>
              <GameButton tone="alert" onClick={() => setPanel("pesca")}>
                Volver al sedal
              </GameButton>
            </div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {panel === "pesca" ? (
              <Dock
                save={save}
                lance={lance}
                markerRef={markerRef}
                onCast={startCast}
                onRelease={onRelease}
                onHook={onHook}
                onReel={onReel}
                onZone={onZone}
              />
            ) : null}
            {panel === "tienda" ? (
              <ShopPanel
                save={save}
                onAction={(action) => {
                  if (action.type === "buy-zone" && busy) {
                    setNotice("Termina el lance antes de cambiar de agua.");
                    return;
                  }
                  apply(action);
                }}
              />
            ) : null}
            {panel === "equipo" ? <GearPanel save={save} onAction={apply} /> : null}
            {panel === "bitacora" ? <LogbookPanel save={save} /> : null}
            {panel === "mejoras" ? <StatsPanel save={save} onAction={apply} /> : null}
          </div>
        </section>
      </div>
      <p className="sr-only" aria-live="polite">
        {live}
      </p>
      {save.welcomed ? null : (
        <div className="absolute inset-0 z-20 grid place-items-center bg-[#1c2430]/45 p-4">
          <div className="max-w-md rounded-3xl bg-[#f6efe2] p-5 shadow-xl">
            <h2 className="font-heading text-3xl text-[#1d4e89]">La caleta</h2>
            <p className="mt-3 text-sm leading-6">
              Esto es la Caleta. Lanzas el sedal, esperas a que el corcho se hunda y clavas. Después cobras cuando el
              punto cruza la franja dorada. Cada pez deja monedas y experiencia. Al subir de nivel ganas un punto para
              fuerza, suerte, paciencia o técnica. En la tienda hay cañas, carretes, cebos y caladeros nuevos. El
              progreso se guarda solo en este navegador.
            </p>
            <GameButton tone="sea" className="mt-4 w-full" data-testid="welcome-start" onClick={() => apply({ type: "welcome" })}>
              Al agua
            </GameButton>
          </div>
        </div>
      )}
    </div>
  );
}
