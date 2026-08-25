/**
 * Image URL tuning per source.
 *
 * AllEvents hands us an imgproxy URL already cropped to 500x250 (`rs:fill`),
 * which is both low-res and sliced top and bottom from a 16:9 banner -- the
 * "cut-off images" complaint. The proxy honours other operations, so ask for
 * the whole banner at a sensible size instead. Verified 2026-08-23 with HEAD
 * requests: fit:1200:675 returns 200.
 */
export function bestImageUrl(url: string | null): string | null {
  if (!url) return null
  if (url.includes('cdn-ip.allevents.in/') && /\/rs:fill:\d+:\d+\//.test(url)) {
    return url.replace(/\/rs:fill:\d+:\d+\//, '/rs:fit:1200:675/')
  }
  return url
}
