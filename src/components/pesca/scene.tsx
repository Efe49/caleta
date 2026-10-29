import type { Lance, ZoneMood } from "@/lib/pesca/types";

const MOOD: Record<
  ZoneMood,
  { sky: string; water: string; far: string; near: string; sun: string; night: boolean }
> = {
  sunset: {
    sky: "linear-gradient(180deg, #f8d7a4 0%, #f3a57c 42%, #ef8f88 68%, #79b5c8 100%)",
    water: "linear-gradient(180deg, #3aa3a6 0%, #14717a 45%, #0c3e4b 100%)",
    far: "#7e9a78",
    near: "#5e7d55",
    sun: "#ffe3ad",
    night: false,
  },
  reeds: {
    sky: "linear-gradient(180deg, #d9f0ea 0%, #b7ddc8 46%, #8ec6b4 100%)",
    water: "linear-gradient(180deg, #2f947c 0%, #146454 46%, #0c3d38 100%)",
    far: "#6d8f62",
    near: "#3f6a45",
    sun: "#fff6d4",
    night: false,
  },
  fog: {
    sky: "linear-gradient(180deg, #d5e0e6 0%, #b7c6ce 48%, #8ea6b2 100%)",
    water: "linear-gradient(180deg, #6d909b 0%, #355863 48%, #1a333c 100%)",
    far: "#8b9aa3",
    near: "#667983",
    sun: "#eef3f5",
    night: false,
  },
  moon: {
    sky: "linear-gradient(180deg, #12182e 0%, #243156 46%, #3d4f78 100%)",
    water: "linear-gradient(180deg, #1a4d68 0%, #0d2d42 48%, #071820 100%)",
    far: "#1d2b3d",
    near: "#14202e",
    sun: "#f6f1df",
    night: true,
  },
};

const STARS = [
  [8, 12],
  [16, 22],
  [24, 8],
  [38, 16],
  [52, 7],
  [63, 18],
  [74, 10],
  [86, 20],
  [92, 8],
  [45, 24],
];

export function Scene({
  mood,
  castPower,
  phase,
}: {
  mood: ZoneMood;
  castPower: number;
  phase: Lance["kind"];
}) {
  const look = MOOD[mood];
  const bobberX = phase === "idle" || phase === "cast" ? 26 : 32 + castPower * 34;
  const bobClass = phase === "bite" ? "caleta-dunk" : phase === "wait" || phase === "reel" ? "caleta-bob" : "";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0" style={{ background: look.sky }} />
      {look.night
        ? STARS.map(([left, top]) => (
            <span
              key={`${left}-${top}`}
              className="caleta-twinkle absolute size-1 rounded-full bg-[#f7f3e4]"
              style={{ left: `${left}%`, top: `${top}%` }}
            />
          ))
        : null}
      <div
        className="absolute size-24 rounded-full"
        style={{
          right: look.night ? "14%" : "18%",
          top: look.night ? "10%" : "12%",
          background: `radial-gradient(circle at 40% 40%, #fff 0%, ${look.sun} 42%, transparent 70%)`,
          boxShadow: look.night ? "0 0 40px rgba(246,241,223,0.45)" : "0 0 50px rgba(255,210,140,0.65)",
        }}
      />
      {!look.night ? (
        <>
          <Cloud className="left-[8%] top-[14%] w-28" />
          <Cloud className="left-[38%] top-[8%] w-36 opacity-80" />
          <Cloud className="right-[8%] top-[18%] w-24 opacity-70" />
        </>
      ) : null}
      <svg viewBox="0 0 1440 420" className="absolute inset-x-0 top-0 h-[52%] w-full" preserveAspectRatio="xMidYMax slice">
        <path d="M0 300 C180 240 280 250 460 280 C640 310 760 230 980 250 C1180 268 1300 230 1440 250 L1440 420 L0 420 Z" fill={look.far} />
        <path d="M0 340 C200 300 320 320 520 330 C760 344 860 290 1100 320 C1260 338 1360 310 1440 324 L1440 420 L0 420 Z" fill={look.near} />
        {mood === "sunset" ? <Village /> : null}
        {mood === "fog" ? <Cliffs /> : null}
        {mood === "moon" ? <NightRidge /> : null}
      </svg>
      <div className="absolute inset-x-0 bottom-0 top-[48%]" style={{ background: look.water }} />
      <div
        className="absolute right-[18%] top-[48%] h-16 w-16 -translate-y-1/2 rounded-full opacity-40 blur-sm"
        style={{ background: look.sun }}
      />
      <Waves night={look.night} />
      {mood === "reeds" ? <Reeds /> : null}
      {mood === "fog" ? <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),transparent_42%,rgba(255,255,255,0.08))]" /> : null}
      {mood === "moon" ? <Sparkles /> : null}
      <Boat night={look.night} />
      <Pier />
      <Fisher night={look.night} casting={phase === "cast"} />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line
          x1="21"
          y1="36"
          x2={bobberX}
          y2="54"
          stroke={look.night ? "rgba(255,244,220,0.85)" : "rgba(42,33,24,0.7)"}
          strokeWidth="0.22"
        />
      </svg>
      <div className={`absolute top-[54%] size-4 ${bobClass}`} style={{ left: `${bobberX}%` }}>
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_35%,#fff_0_18%,#e23d3d_19%_46%,#fff_47%_58%,#e23d3d_59%)] shadow-[0_2px_0_rgba(0,0,0,0.25)]" />
        {phase === "bite" ? (
          <>
            <span className="absolute -inset-3 rounded-full border border-white/70" />
            <span className="absolute -inset-5 rounded-full border border-white/40" />
          </>
        ) : null}
      </div>
      {!look.night ? (
        <>
          <Gull className="left-[48%] top-[18%]" />
          <Gull className="left-[62%] top-[24%] scale-75" />
        </>
      ) : null}
      <div className="absolute inset-0 shadow-[inset_0_0_90px_rgba(32,22,12,0.28)]" />
    </div>
  );
}

function Cloud({ className }: { className: string }) {
  return (
    <div className={`caleta-float absolute h-8 rounded-full bg-white/75 ${className}`}>
      <span className="absolute -left-3 top-2 size-7 rounded-full bg-white/80" />
      <span className="absolute left-4 -top-3 size-9 rounded-full bg-white/85" />
      <span className="absolute right-2 top-1 size-7 rounded-full bg-white/75" />
    </div>
  );
}

function Waves({ night }: { night: boolean }) {
  const fill = night ? "#16485f" : "#2f8f96";
  return (
    <div className="absolute inset-x-0 top-[46%] h-16 overflow-hidden">
      <div className="caleta-drift flex h-full w-[200%]">
        <Wave fill={fill} />
        <Wave fill={fill} />
      </div>
    </div>
  );
}

function Wave({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 600 80" className="h-full w-1/2" preserveAspectRatio="none">
      <path d="M0 40 Q 25 18 50 40 T 100 40 T 150 40 T 200 40 T 250 40 T 300 40 T 350 40 T 400 40 T 450 40 T 500 40 T 550 40 T 600 40 V 80 H 0 Z" fill={fill} opacity="0.9" />
    </svg>
  );
}

function Pier() {
  return (
    <div className="absolute left-0 top-[46%] h-5 w-[34%]" style={{ background: "repeating-linear-gradient(90deg, #8d5b38 0 16px, #7a4c2e 16px 18px)" }}>
      <span className="absolute -bottom-10 left-[8%] h-10 w-2 bg-[#5c3a24]" />
      <span className="absolute -bottom-12 left-[28%] h-12 w-2 bg-[#5c3a24]" />
      <span className="absolute -bottom-8 left-[52%] h-8 w-2 bg-[#5c3a24]" />
      <span className="absolute -top-8 right-[18%] h-8 w-1 bg-[#3d2a1c]" />
      <span className="absolute -top-11 right-[16%] size-4 rounded-full bg-[#ffcf70] shadow-[0_0_16px_#ffcf70]" />
      <span className="absolute -top-3 right-[6%] h-4 w-5 rounded-sm bg-[#c9844a]" />
    </div>
  );
}

function Fisher({ night, casting }: { night: boolean; casting: boolean }) {
  const shirt = night ? "#243652" : "#2f6f86";
  return (
    <svg viewBox="0 0 120 150" className="absolute bottom-[52%] left-[7%] w-[104px]">
      <ellipse cx="62" cy="22" rx="26" ry="7" fill="#e7c98a" />
      <path d="M40 22 Q62 2 86 22" fill="#f3ddb0" />
      <circle cx="62" cy="36" r="11" fill="#f0c7a4" />
      <path d="M42 64 Q62 50 84 66 L90 108 H36 Z" fill={shirt} />
      <path
        d={casting ? "M80 70 Q108 78 112 96" : "M80 70 Q104 52 114 40"}
        stroke="#f0c7a4"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M50 106 L46 136" stroke="#5c4636" strokeWidth="8" strokeLinecap="round" />
      <path d="M74 106 L80 136" stroke="#5c4636" strokeWidth="8" strokeLinecap="round" />
      <path d="M36 136 h18 v5 h-22 z" fill="#3a2a22" />
      <path d="M70 136 h18 v5 h-22 z" fill="#3a2a22" />
    </svg>
  );
}

function Boat({ night }: { night: boolean }) {
  return (
    <svg viewBox="0 0 160 70" className="caleta-float absolute right-[8%] top-[49%] w-36">
      <path d="M10 36 Q80 70 150 36 L140 46 Q80 68 18 46 Z" fill={night ? "#6d5434" : "#8d5a32"} />
      <path d="M78 36 V10" stroke="#5c4030" strokeWidth="3" />
      <path d="M80 14 L112 32 H80 Z" fill={night ? "#d7c7ef" : "#f4efe4"} />
    </svg>
  );
}

function Gull({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 40 16" className={`caleta-gull absolute w-10 ${className}`}>
      <path d="M2 10 Q10 2 20 8 Q30 2 38 10" fill="none" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

function Village() {
  return (
    <g>
      <House x={180} y={300} />
      <House x={230} y={292} tall />
      <House x={290} y={308} />
      <rect x="248" y="250" width="6" height="42" fill="#6b5344" />
      <circle cx="251" cy="246" r="5" fill="#ffd27a" />
    </g>
  );
}

function House({ x, y, tall = false }: { x: number; y: number; tall?: boolean }) {
  const h = tall ? 48 : 36;
  return (
    <g>
      <rect x={x} y={y - h} width={tall ? 42 : 36} height={h} fill="#f6e6cb" />
      <path d={`M${x - 6} ${y - h + 4} L${x + (tall ? 21 : 18)} ${y - h - 18} L${x + (tall ? 48 : 42)} ${y - h + 4} Z`} fill="#c45c3e" />
      <rect x={x + 14} y={y - 16} width="8" height="12" fill="#6e8f9a" />
    </g>
  );
}

function Cliffs() {
  return (
    <g fill="#667983">
      <path d="M980 250 L1040 120 L1100 250 Z" />
      <path d="M1080 270 L1160 90 L1240 280 Z" fill="#7d9099" />
      <path d="M1200 260 L1280 140 L1360 270 Z" />
    </g>
  );
}

function NightRidge() {
  return <path d="M900 300 L980 180 L1040 260 L1120 150 L1200 280 L1320 190 L1440 280 L1440 420 L900 420 Z" fill="#10182a" />;
}

function Reeds() {
  return (
    <svg viewBox="0 0 200 80" className="absolute bottom-[46%] right-[6%] w-40">
      <path d="M20 80 C24 40 10 20 18 4 M40 80 C30 30 48 16 36 0 M70 80 C78 36 60 20 74 6 M100 80 C90 40 110 24 96 2" stroke="#1d4a38" strokeWidth="3" fill="none" />
      <circle cx="18" cy="6" r="3" fill="#8fb56a" />
      <circle cx="36" cy="2" r="3" fill="#b6c97a" />
      <circle cx="74" cy="8" r="3" fill="#8fb56a" />
    </svg>
  );
}

function Sparkles() {
  return (
    <div className="absolute inset-x-[20%] top-[58%] flex justify-between">
      {["18%", "40%", "62%", "80%"].map((left) => (
        <span key={left} className="caleta-twinkle size-1.5 rounded-full bg-[#9be7d8]" style={{ marginLeft: left }} />
      ))}
    </div>
  );
}
