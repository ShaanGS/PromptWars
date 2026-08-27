import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * Guild is a team-formation platform, so the root is the Team Board.
 *
 * The event feed this app grew out of still exists at /feed and is what a
 * squad forms around -- but it is the supporting surface, not the product.
 * Landing on it made the whole app read as an events aggregator.
 *
 * A first-time visitor is sent through /welcome first, which asks for the
 * four things the engine actually scores. Only the root gates: every deep
 * link -- /teams, /squad/[id], a profile -- stays reachable, so a mistake
 * here costs a redirect and can never strand someone mid-demo.
 */
export default async function Home() {
  const seen = (await cookies()).get('guild-onboarded')
  redirect(seen ? '/teams' : '/welcome')
}
