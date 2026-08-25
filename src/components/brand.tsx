/**
 * The Guild mark: a cluster of people fused into one body. Drawn as vectors
 * rather than shipped as the PNG so it stays crisp at 20px in the nav, takes
 * the current text colour, and costs nothing to load.
 */
export function GuildMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <g fill="currentColor">
        {/* the four gathered around */}
        <circle cx="32" cy="9" r="6" />
        <circle cx="14" cy="19" r="6" />
        <circle cx="50" cy="19" r="6" />
        <circle cx="20" cy="36" r="0" />
        {/* the body they form together */}
        <path d="M32 18c5.6 0 9.4 2.6 12 6.4 2 2.9 5.4 3.4 7.6 5.6 3.6 3.6 4 9.2 1.8 13.3-1.7 3.2-4.9 4.6-6.2 8-1.2 3.2-1 6.9-3.6 9.2-2.9 2.6-7.7 2.2-10-1-1.8-2.5-1.5-5.8-1.6-8.7-.1-2.4-1.6-4.6-4-4.6s-3.7 2.1-3.8 4.4c-.1 2.6.4 5.6-1.3 7.8-2.2 2.9-6.9 3-9.4.5-2.6-2.6-2-6.7-2.6-10.1-.6-3.4-3.4-5.6-4.4-8.9-1.4-4.6.6-10.2 4.9-12.6 2.4-1.4 5.3-1.5 7.3-3.5C21.4 20.9 26.2 18 32 18Zm0 8.6a6.6 6.6 0 1 0 0 13.2 6.6 6.6 0 0 0 0-13.2Z" />
      </g>
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <GuildMark className="size-7 text-primary" />
      <span className="text-[19px] leading-none font-extrabold tracking-[-0.03em]">
        Guild
      </span>
    </span>
  );
}

const AVATAR_TINTS = [
  "bg-primary-soft text-accent-foreground",
  "bg-[#fce7f3] text-[#a43f7f]",
  "bg-cream text-[#8a6a1f]",
  "bg-surface-3 text-ink-muted",
  "bg-[#e0f2fe] text-[#0369a1]",
];

/** Deterministic tint so the same person keeps the same colour everywhere. */
export function Avatar({
  name,
  className = "size-9 text-xs",
}: {
  name: string;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const tint =
    AVATAR_TINTS[
      [...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % AVATAR_TINTS.length
    ];
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${tint} ${className}`}
    >
      {initials}
    </span>
  );
}
