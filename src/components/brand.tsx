import Image from "next/image";

/**
 * The supplied logo, used as supplied. The artwork is white-on-black, so the
 * mark sits in an ink tile rather than being recoloured — that keeps the file
 * untouched and reads as a deliberate app icon.
 */
export function GuildMark({ className = "size-8" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-foreground ${className}`}
    >
      <Image
        src="/brand/guild-mark.png"
        alt=""
        width={128}
        height={128}
        className="size-full object-cover"
        priority
      />
    </span>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <GuildMark className="size-8" />
      <span className="text-[17px] leading-none font-semibold tracking-[-0.02em]">
        Guild
      </span>
    </span>
  );
}

/** The full supplied lockup, for the landing hero. */
export function LogoLockup({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden rounded-3xl bg-foreground ${className}`}
    >
      <Image
        src="/brand/guild-logo.png"
        alt="Guild"
        width={512}
        height={512}
        className="size-full object-contain"
        priority
      />
    </span>
  );
}

// Categorical pastels, each paired with the dark stop of its own hue. Text on
// a pastel is never plain black.
const TINTS = [
  "bg-sky text-sky-ink",
  "bg-mint text-mint-ink",
  "bg-lemon text-lemon-ink",
  "bg-rose text-rose-ink",
  "bg-lilac text-lilac-ink",
  "bg-peach text-peach-ink",
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
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const tint =
    TINTS[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % TINTS.length];
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-medium ${tint} ${className}`}
    >
      {initials}
    </span>
  );
}
