import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { FishShape, Rarity } from "@/lib/pesca/types";
import { RARITY_LABEL } from "@/lib/pesca/data";

const TONE = {
  sea: "bg-[#1c6b62] text-[#f7f3e8] hover:bg-[#185e56]",
  sand: "bg-[#f0d7a4] text-[#3a2a1c] hover:bg-[#e7c98a]",
  alert: "bg-[#c4492c] text-[#fff8f3] hover:bg-[#b03f24]",
  ink: "bg-[#2c241c] text-[#f7f3e8] hover:bg-[#3d342b]",
  ghost: "bg-[#fff8ea] text-[#3a2a1c] hover:bg-[#f3e6cf]",
} as const;

export function GameButton({
  tone = "sea",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: keyof typeof TONE }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6f78] disabled:cursor-not-allowed disabled:opacity-45 ${TONE[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

export function RarityPill({ rarity }: { rarity: Rarity }) {
  const tone =
    rarity === "legendario"
      ? "bg-[#f3df9a] text-[#6a4b10]"
      : rarity === "raro"
        ? "bg-[#d7e4f5] text-[#23405f]"
        : rarity === "poco_comun"
          ? "bg-[#dcead4] text-[#24502a]"
          : "bg-[#efe4d2] text-[#5c4a36]";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tone}`}>{RARITY_LABEL[rarity]}</span>;
}

export function FishGlyph({
  shape,
  color,
  size = 72,
  muted = false,
}: {
  shape: FishShape;
  color: string;
  size?: number;
  muted?: boolean;
}) {
  const fill = muted ? "#cfc3ae" : color;
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" aria-hidden="true" className="shrink-0">
      {shape === "crab" ? <Crab fill={fill} /> : null}
      {shape === "eel" ? <Eel fill={fill} /> : null}
      {shape === "flat" ? <Flat fill={fill} /> : null}
      {shape === "slim" ? <Slim fill={fill} /> : null}
      {shape === "round" ? <Round fill={fill} /> : null}
      {shape === "big" ? <Big fill={fill} /> : null}
      {muted ? (
        <text x="36" y="42" textAnchor="middle" fontSize="18" fill="#6d5c48" fontFamily="serif">
          ?
        </text>
      ) : null}
    </svg>
  );
}

function Slim({ fill }: { fill: string }) {
  return (
    <g>
      <ellipse cx="34" cy="36" rx="20" ry="9" fill={fill} stroke="#2c241c" strokeWidth="1.4" />
      <path d="M14 36 L4 28 L6 36 L4 44 Z" fill={fill} stroke="#2c241c" strokeWidth="1.4" />
      <circle cx="46" cy="34" r="1.5" fill="#2c241c" />
    </g>
  );
}

function Round({ fill }: { fill: string }) {
  return (
    <g>
      <ellipse cx="36" cy="36" rx="18" ry="16" fill={fill} stroke="#2c241c" strokeWidth="1.4" />
      <path d="M18 36 L8 26 L10 36 L8 46 Z" fill={fill} stroke="#2c241c" strokeWidth="1.4" />
      <circle cx="46" cy="32" r="1.6" fill="#2c241c" />
      <path d="M40 40 q6 4 8 0" fill="none" stroke="#2c241c" strokeWidth="1.2" />
    </g>
  );
}

function Big({ fill }: { fill: string }) {
  return (
    <g>
      <path d="M12 36 C22 18 48 16 58 28 C64 34 64 42 56 48 C42 58 22 54 12 40 Z" fill={fill} stroke="#2c241c" strokeWidth="1.4" />
      <path d="M14 36 L4 26 L8 36 L4 48 Z" fill={fill} stroke="#2c241c" strokeWidth="1.4" />
      <circle cx="50" cy="32" r="1.7" fill="#2c241c" />
    </g>
  );
}

function Flat({ fill }: { fill: string }) {
  return (
    <g>
      <path d="M8 40 C20 24 52 22 64 34 C52 46 22 50 8 40 Z" fill={fill} stroke="#2c241c" strokeWidth="1.4" />
      <circle cx="50" cy="34" r="1.5" fill="#2c241c" />
      <path d="M28 36 l4 6 M36 34 l3 7" stroke="#2c241c" strokeWidth="1" />
    </g>
  );
}

function Eel({ fill }: { fill: string }) {
  return (
    <path
      d="M6 46 C16 28 24 22 34 30 C42 36 44 24 54 20 C62 17 66 24 60 30 C50 40 40 34 30 42 C20 50 14 58 6 46 Z"
      fill={fill}
      stroke="#2c241c"
      strokeWidth="1.4"
    />
  );
}

function Crab({ fill }: { fill: string }) {
  return (
    <g stroke="#2c241c" strokeWidth="1.4" fill={fill}>
      <ellipse cx="36" cy="38" rx="14" ry="10" />
      <path d="M22 34 C12 24 10 18 16 16" fill="none" />
      <path d="M50 34 C60 24 62 18 56 16" fill="none" />
      <circle cx="16" cy="16" r="2.2" />
      <circle cx="56" cy="16" r="2.2" />
      <path d="M28 48 l-4 8 M34 50 l0 8 M40 50 l0 8 M46 48 l4 8" fill="none" />
      <circle cx="31" cy="36" r="1.2" fill="#2c241c" />
      <circle cx="41" cy="36" r="1.2" fill="#2c241c" />
    </g>
  );
}

export function Chip({ testId, children }: { testId?: string; children: ReactNode }) {
  return (
    <span data-testid={testId} className="rounded-full bg-[#fff8ea] px-2.5 py-1 text-xs font-semibold text-[#3a2a1c] shadow-sm">
      {children}
    </span>
  );
}
