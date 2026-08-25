import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Small shared pieces, ported from the Olvable system (chennai-events):
 * pill, tone map, avatar, stat tile, boxed data row. Each is a few lines;
 * grouping them keeps the import list short.
 */

export type Tone =
  | "sky"
  | "mint"
  | "lemon"
  | "rose"
  | "lilac"
  | "peach"
  | "accent"
  | "accent-soft"
  | "neutral"
  | "ink"
  | "success"
  | "warning";

const TONE_BG: Record<string, string> = {
  sky: "bg-sky text-sky-ink",
  mint: "bg-mint text-mint-ink",
  lemon: "bg-lemon text-lemon-ink",
  rose: "bg-rose text-rose-ink",
  lilac: "bg-lilac text-lilac-ink",
  peach: "bg-peach text-peach-ink",
  accent: "bg-accent text-white",
  "accent-soft": "bg-primary-soft text-accent-foreground",
  neutral: "bg-surface-2 text-ink-muted",
  ink: "bg-foreground text-background",
  success: "bg-success-soft text-success",
  warning: "bg-lemon text-lemon-ink",
};

export function toneClass(tone: Tone = "neutral"): string {
  return TONE_BG[tone] ?? TONE_BG.neutral;
}

export function Pill({
  tone = "neutral",
  size = "md",
  className,
  children,
}: {
  tone?: Tone;
  size?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap",
        size === "sm" ? "h-6 px-2 text-[11.5px]" : "h-7 px-2.5 text-[12.5px]",
        toneClass(tone),
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * The score badge from the feed: a translucent white pill with a coloured
 * dot, the band's word, and the number. The word carries the meaning so the
 * number never has to be decoded.
 */
export function ScoreBand({
  label,
  value,
  dot,
  className,
}: {
  label: string;
  value?: number;
  dot: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border border-border bg-card/95 px-2.5 text-[12px] font-medium text-foreground backdrop-blur-sm",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dot)} />
      {label}
      {value !== undefined && (
        <span className="font-mono text-ink-subtle tabular-nums">{value}</span>
      )}
    </span>
  );
}

/** Coverage band: the word people read, the number for the ones who want it. */
export function coverageBand(pct: number): { label: string; dot: string } {
  if (pct >= 85) return { label: "Ready", dot: "bg-success" };
  if (pct >= 60) return { label: "Getting there", dot: "bg-accent" };
  if (pct >= 35) return { label: "Thin", dot: "bg-lemon-ink" };
  return { label: "Needs people", dot: "bg-destructive" };
}

/** Initials avatar. Tone derives from the name, so it is stable per person. */
export function Avatar({
  name,
  size = 36,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  const fallback = (["sky", "mint", "lemon", "rose", "lilac", "peach"] as const)[
    name.length % 6
  ];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold",
        toneClass(fallback),
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {initials || "?"}
    </span>
  );
}

/** Stat tile: big number, small label, pastel tint. */
export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl px-4 py-3.5", toneClass(tone), className)}>
      <p className="text-[13px] font-medium opacity-80">{label}</p>
      <p className="mt-1.5 font-mono text-[30px] leading-none font-semibold tracking-[-0.02em] tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-[12.5px] opacity-70">{hint}</p> : null}
    </div>
  );
}

/** Boxed metadata row: icon + label in a tinted block. */
export function DataRow({
  icon,
  label,
  value,
  tone = "neutral",
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value?: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-3.5 py-3",
        toneClass(tone),
        className,
      )}
    >
      <span className="[&_svg]:size-5">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-medium tracking-[0.06em] uppercase opacity-70">
          {label}
        </p>
        {value ? <p className="text-[14.5px] font-medium break-words">{value}</p> : null}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="g-card flex flex-col items-start gap-3 p-6">
      <div>
        <p className="text-[15px] font-medium">{title}</p>
        {hint && <p className="mt-1 text-[13.5px] text-ink-muted">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
