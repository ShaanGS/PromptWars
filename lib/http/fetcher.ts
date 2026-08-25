/**
 * The only outbound HTTP path in the project.
 *
 * Connectors never call global fetch: politeness, user-agent policy and retry
 * behaviour are per-host decisions and belong in one place.
 */

/** Last request time per host, so the delay applies across connectors. */
const lastRequestAt = new Map<string, number>()

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /**
     * First 2KB of the response body. Vercel Hobby keeps logs about an hour,
     * so by the time anyone investigates, both the logs and the remote page
     * have changed. This snippet is often the only evidence left.
     */
    readonly bodySnippet: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export interface FetcherOptions {
  crawlDelayMs: number
  userAgent: string
  maxRetries?: number
  timeoutMs?: number
}

export function createFetcher(opts: FetcherOptions) {
  const { crawlDelayMs, userAgent, maxRetries = 3, timeoutMs = 30_000 } = opts

  async function throttle(host: string): Promise<void> {
    const last = lastRequestAt.get(host) ?? 0
    const wait = crawlDelayMs - (Date.now() - last)
    if (wait > 0) await sleep(wait)
    lastRequestAt.set(host, Date.now())
  }

  async function once(url: string, init: RequestInit, ua: string): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          'user-agent': ua,
          accept: 'text/html,application/json,application/xhtml+xml,*/*',
          'accept-language': 'en-IN,en;q=0.9',
          ...(init.headers ?? {}),
        },
      })
    } finally {
      clearTimeout(timer)
    }
  }

  return async function get(url: string, init: RequestInit = {}): Promise<Response> {
    const host = new URL(url).host
    let lastError: unknown

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      await throttle(host)

      try {
        // A 403 is a policy signal and is not retried with a different
        // identity: one user agent, honest, everywhere. (A browser-imitating
        // fallback existed for ConferenceAlerts and was removed with it.)
        const res = await once(url, init, userAgent)

        if (res.status === 429) {
          // Honour Retry-After when offered; otherwise back off exponentially.
          const retryAfter = Number(res.headers.get('retry-after'))
          const wait =
            Number.isFinite(retryAfter) && retryAfter > 0
              ? retryAfter * 1000
              : Math.min(60_000, 2 ** attempt * 2_000)
          if (attempt < maxRetries) {
            await sleep(wait)
            continue
          }
        }

        if (res.status >= 500 && attempt < maxRetries) {
          await sleep(Math.min(30_000, 2 ** attempt * 1_000))
          continue
        }

        if (!res.ok) {
          const body = (await res.text().catch(() => '')).slice(0, 2048)
          throw new HttpError(`GET ${url} -> ${res.status}`, res.status, body)
        }

        return res
      } catch (err) {
        // A non-retryable HTTP status must not be swallowed by the retry loop.
        if (err instanceof HttpError) throw err
        lastError = err
        if (attempt < maxRetries) {
          await sleep(Math.min(30_000, 2 ** attempt * 1_000))
          continue
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`GET ${url} failed after ${maxRetries + 1} attempts`)
  }
}
