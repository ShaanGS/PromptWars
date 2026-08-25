/**
 * Route-level skeleton.
 *
 * The page is fully dynamic, so without this a filter click gave literally
 * nothing until the server render came back -- which is what read as "10
 * seconds of lag". With it, navigation paints this instantly while the data
 * loads.
 */
export default function Loading() {
  return (
    <div className="animate-pulse px-4 pb-24 pt-4 sm:px-6 lg:pb-16">
      {/* search bar */}
      <div className="h-11 rounded-full bg-black/[0.05] dark:bg-white/[0.06]" />

      {/* greeting */}
      <div className="mt-8 h-9 w-72 rounded-lg bg-black/[0.06] dark:bg-white/[0.07]" />
      <div className="mt-3 h-4 w-96 max-w-full rounded bg-black/[0.04] dark:bg-white/[0.05]" />

      {/* stat tiles */}
      <div className="mt-6 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[92px] rounded-2xl bg-black/[0.05] dark:bg-white/[0.06]" />
        ))}
      </div>

      {/* filter chips */}
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-24 rounded-full bg-black/[0.04] dark:bg-white/[0.05]" />
        ))}
      </div>

      {/* cards */}
      <div className="mt-8 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-[18px] border border-black/[0.06] bg-white dark:border-white/10 dark:bg-neutral-900"
          >
            <div className="h-[124px] bg-black/[0.05] dark:bg-white/[0.06]" />
            <div className="space-y-2.5 p-3.5">
              <div className="h-4 w-4/5 rounded bg-black/[0.06] dark:bg-white/[0.07]" />
              <div className="h-3 w-3/5 rounded bg-black/[0.04] dark:bg-white/[0.05]" />
              <div className="h-16 rounded-xl bg-black/[0.04] dark:bg-white/[0.05]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
