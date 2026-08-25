import { redirect } from 'next/navigation'

/**
 * Guild is a team-formation platform, so the root is the Team Board.
 *
 * The event feed this app grew out of still exists at /feed and is what a
 * squad forms around -- but it is the supporting surface, not the product.
 * Landing on it made the whole app read as an events aggregator.
 */
export default function Home() {
  redirect('/teams')
}
