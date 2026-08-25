import Image from "next/image";

/**
 * The supplied logo, used as one piece. The mark and the wordmark are the
 * same artwork and are never separated or retyped.
 *
 * The file is white-on-black, and the app is dark, so `mix-blend-screen`
 * drops the black to transparent and leaves the white shapes — the artwork
 * itself is untouched.
 */
export function GuildLogo({
  className = "h-8",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/guild-logo.png"
      alt="Guild"
      width={512}
      height={512}
      priority={priority}
      className={`w-auto mix-blend-screen ${className}`}
    />
  );
}

/** Horizontal lockup for the nav: the same file, cropped by the viewport. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <GuildLogo className="h-11" priority />
    </span>
  );
}

export { GuildLogo as GuildMark, GuildLogo as LogoLockup };

// Tints for initials avatars, dark-theme stops.
const TINTS = [
  "bg-accent/15 text-accent",
  "bg-[#1d2b3a] text-[#7fb3e8]",
  "bg-[#2b1d3a] text-[#b78fe8]",
  "bg-[#3a2b1d] text-[#e8b87f]",
  "bg-[#1d3a2b] text-[#7fe8b3]",
  "bg-[#3a1d2b] text-[#e87fb3]",
];

/** Deterministic tint, so a person keeps the same colour on every screen. */
export function Avatar({
  name,
  className = "size-9 text-xs",
}: {
  name: string;
  className?: string;
}) {
  const initials = name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  const tint =
    TINTS[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % TINTS.length];
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${tint} ${className}`}
    >
      {initials || "?"}
    </span>
  );
}
