type Tone = "cast" | "bite" | "catch" | "miss" | "buy";

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext;
  if (!Ctx) return null;
  if (!context) context = new Ctx();
  return context;
}

export function playTone(kind: Tone, muted: boolean): void {
  if (muted) return;
  const ctx = audio();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    const notes = kind === "catch" ? [523, 659, 784] : kind === "bite" ? [620, 780] : [kind === "miss" ? 160 : kind === "buy" ? 494 : 340];
    notes.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = kind === "miss" ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      const start = ctx.currentTime + index * 0.07;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.05, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
      oscillator.start(start);
      oscillator.stop(start + 0.18);
    });
  } catch {
    context = null;
  }
}
