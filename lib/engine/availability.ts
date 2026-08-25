import type { AvailabilityWindow, Member } from "./types";

type Interval = { start: number; end: number }; // minutes since day start

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const iv of sorted) {
    const last = out[out.length - 1];
    if (last && iv.start <= last.end) last.end = Math.max(last.end, iv.end);
    else out.push({ ...iv });
  }
  return out;
}

function intersectSets(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = [];
  for (const x of a) {
    for (const y of b) {
      const start = Math.max(x.start, y.start);
      const end = Math.min(x.end, y.end);
      if (end > start) out.push({ start, end });
    }
  }
  return out;
}

function dayIntervals(windows: AvailabilityWindow[], day: number): Interval[] {
  return mergeIntervals(
    windows
      .filter((w) => w.day === day)
      .map((w) => ({ start: toMinutes(w.start), end: toMinutes(w.end) }))
      .filter((iv) => iv.end > iv.start),
  );
}

/** Weekly minutes in the intersection of ALL members' availability windows. */
export function sharedMinutesPerWeek(members: Member[]): number {
  if (members.length === 0) return 0;
  let total = 0;
  for (let day = 0; day < 7; day++) {
    let common = dayIntervals(members[0].availability, day);
    for (let i = 1; i < members.length && common.length > 0; i++) {
      common = intersectSets(common, dayIntervals(members[i].availability, day));
    }
    total += common.reduce((sum, iv) => sum + (iv.end - iv.start), 0);
  }
  return total;
}
