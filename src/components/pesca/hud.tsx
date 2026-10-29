import { formatCoins } from "@/lib/pesca/format";
import { xpToNext } from "@/lib/pesca/logic";
import type { Save } from "@/lib/pesca/types";
import { GameButton } from "./ui";

export function Hud({
  save,
  zoneName,
  confirmReset,
  onToggleMute,
  onAskReset,
  onCancelReset,
  onReset,
}: {
  save: Save;
  zoneName: string;
  confirmReset: boolean;
  onToggleMute: () => void;
  onAskReset: () => void;
  onCancelReset: () => void;
  onReset: () => void;
}) {
  const need = xpToNext(save.level);
  const xpPct = Math.min(100, Math.round((save.xp / need) * 100));
  return (
    <header className="relative z-20 flex items-start gap-2 p-3 sm:p-4">
      <div className="min-w-0 flex-1 rounded-[24px] border border-[#ead9b8] bg-[#fff8ea]/92 px-4 py-3 shadow-[0_12px_30px_rgba(20,36,36,0.16)]">
        <p className="font-heading text-[1.7rem] leading-none text-[#2c241c]">Caleta</p>
        <p data-testid="zone-name" className="mt-1 truncate text-sm text-[#5c4a36]">
          {zoneName}
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ead9b8]" aria-hidden="true">
          <div className="h-full rounded-full bg-[#1f6f78]" style={{ width: `${xpPct}%` }} />
        </div>
        <p className="mt-1 text-xs text-[#5c4a36]">
          Nivel <span data-testid="level">{save.level}</span>
          <span className="px-1">·</span>
          <span data-testid="xp">
            {save.xp}/{need} xp
          </span>
          <span className="px-1">·</span>
          <span data-testid="points">{save.points}</span> {save.points === 1 ? "punto" : "puntos"}
        </p>
      </div>
      <div className="w-[9.5rem] shrink-0 rounded-[24px] border border-[#ead9b8] bg-[#fff8ea]/92 px-3 py-3 text-right shadow-[0_12px_30px_rgba(20,36,36,0.16)] sm:w-44">
        <p className="font-heading text-3xl leading-none tabular-nums text-[#8a5a12]" data-testid="money">
          {formatCoins(save.money)}
        </p>
        <p className="text-xs text-[#5c4a36]">monedas</p>
        <div className="mt-2 flex flex-col items-end gap-1">
          <GameButton tone="ghost" className="h-8 px-3 text-xs" onClick={onToggleMute} data-testid="mute">
            {save.muted ? "Activar sonido" : "Silencio"}
          </GameButton>
          {confirmReset ? (
            <div className="grid gap-1">
              <p className="text-left text-[11px] leading-snug text-[#5c4a36]">¿Borrar el progreso de este navegador?</p>
              <GameButton tone="alert" className="h-8 text-xs" onClick={onReset} data-testid="reset-confirm">
                Borrar
              </GameButton>
              <GameButton tone="ghost" className="h-8 text-xs" onClick={onCancelReset}>
                Cancelar
              </GameButton>
            </div>
          ) : (
            <GameButton tone="ghost" className="h-8 px-3 text-xs" onClick={onAskReset} data-testid="reset">
              Nueva partida
            </GameButton>
          )}
        </div>
      </div>
    </header>
  );
}
