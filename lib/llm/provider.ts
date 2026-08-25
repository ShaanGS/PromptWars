/**
 * LLM access with provider failover.
 *
 * Gemini is primary, Groq is the fallback. ONE key each -- Groq's rate limits
 * apply at the organization level, so extra keys multiply nothing, and
 * stacking accounts to raise a quota is a named violation of their AI policy.
 * Failover across *different* providers is legitimate and also more resilient
 * to either one having an outage.
 *
 * temperature is 0 everywhere. Scoring has to be reproducible or the cache is
 * meaningless and the dashboard reorders itself for no reason.
 */

export interface LlmResult<T> {
  data: T
  model: string
}

export class LlmError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'LlmError'
  }
}

/** Verified live: 2.5-era models now 404 for newly-issued keys. */
const GEMINI_MODEL = 'gemini-3.5-flash-lite'
const GROQ_MODEL = 'openai/gpt-oss-120b'

interface Provider {
  name: string
  model: string
  available(): boolean
  call<T>(prompt: string, schema: object): Promise<T>
}

const gemini: Provider = {
  name: 'gemini',
  model: GEMINI_MODEL,
  available: () => Boolean(process.env.GEMINI_API_KEY),
  async call<T>(prompt: string, schema: object): Promise<T> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY as string,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
            responseSchema: schema,
          },
        }),
      },
    )
    if (!res.ok) {
      throw new LlmError(`gemini ${res.status}: ${(await res.text()).slice(0, 300)}`, res.status)
    }
    const body = await res.json()
    const text = body?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new LlmError('gemini returned no text')
    return JSON.parse(text) as T
  },
}

const groq: Provider = {
  name: 'groq',
  model: GROQ_MODEL,
  available: () => Boolean(process.env.GROQ_API_KEY),
  async call<T>(prompt: string): Promise<T> {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      throw new LlmError(`groq ${res.status}: ${(await res.text()).slice(0, 300)}`, res.status)
    }
    const body = await res.json()
    const text = body?.choices?.[0]?.message?.content
    if (!text) throw new LlmError('groq returned no content')
    return JSON.parse(text) as T
  },
}

const PROVIDERS = [gemini, groq]

/**
 * Token-bucket pacing.
 *
 * Groq's free tier is 8K tokens/minute on the strict-schema models, which is
 * the binding constraint -- not requests-per-day. Reacting to 429s means
 * generating them constantly; pacing ahead of time means never seeing one.
 */
const TPM_BUDGET = 8_000
let windowStart = Date.now()
let tokensThisWindow = 0

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5)
}

async function pace(estimated: number): Promise<void> {
  const now = Date.now()
  if (now - windowStart >= 60_000) {
    windowStart = now
    tokensThisWindow = 0
  }
  if (tokensThisWindow + estimated > TPM_BUDGET) {
    const wait = 60_000 - (now - windowStart)
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    windowStart = Date.now()
    tokensThisWindow = 0
  }
  tokensThisWindow += estimated
}

export async function complete<T>(prompt: string, schema: object): Promise<LlmResult<T>> {
  await pace(estimateTokens(prompt))

  const errors: string[] = []
  for (const provider of PROVIDERS) {
    if (!provider.available()) {
      errors.push(`${provider.name}: no API key`)
      continue
    }
    try {
      const data = await provider.call<T>(prompt, schema)
      return { data, model: `${provider.name}/${provider.model}` }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err))
      // Fall through to the next provider.
    }
  }
  throw new LlmError(`all providers failed:\n${errors.join('\n')}`)
}

/** The model relevance is pinned to. Stored per row so drift is detectable. */
export const SCORING_MODEL = `gemini/${GEMINI_MODEL}`
