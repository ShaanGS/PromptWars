import { config } from 'dotenv'

/**
 * Import this first in any script.
 *
 * `dotenv/config` only reads `.env`. Next.js reads `.env.local` by
 * convention and that is where the secrets actually live, so the scripts have
 * to be told. `.env.local` wins over `.env`, matching Next's own precedence.
 *
 * In GitHub Actions neither file exists and the values come from the
 * environment, which `override: false` leaves untouched.
 */
config({ path: '.env.local', override: false, quiet: true })
config({ path: '.env', override: false, quiet: true })
