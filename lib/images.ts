/**
 * Image URL tuning per source.
 *
 * AllEvents hands us an imgproxy URL already cropped to 500x250 (`rs:fill`),
 * which is both low-res and sliced top and bottom from a 16:9 banner -- the
 * "cut-off images" complaint. The proxy honours other operations, so ask for
 * the whole banner at a sensible size instead. Verified 2026-08-23 with HEAD
 * requests: fit:1200:675 returns 200.
 *
 * Devpost's `thumbnail_url` always names the `medium_square` rendition, which
 * is 200x200 -- visibly soft once the card scales it. The same asset is
 * published as `large` at 300x300; verified 2026-08-25 with HEAD requests
 * across four assets in both .jpg and .png. Nothing else is offered:
 * `open-graph` and `thumbnail` 403.
 */
export function bestImageUrl(url: string | null): string | null {
  if (!url) return null
  if (url.includes('cdn-ip.allevents.in/') && /\/rs:fill:\d+:\d+\//.test(url)) {
    return url.replace(/\/rs:fill:\d+:\d+\//, '/rs:fit:1200:675/')
  }
  if (url.includes('/challenge_thumbnails/') && url.includes('/medium_square.')) {
    return url.replace('/medium_square.', '/large.')
  }
  return url
}
