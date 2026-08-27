import type { Icon } from '@phosphor-icons/react'
import {
  Binoculars,
  Handshake,
  PlusCircle,
  ShieldCheck,
  Trophy,
  UserCircle,
  UsersThree,
} from '@phosphor-icons/react/dist/ssr'

/**
 * One nav definition for the sidebar, the top bar and the bottom tabs.
 *
 * The `tab` items are the phone's bottom bar -- Team Board, People,
 * Hackathons -- plus You. Everything else is sidebar-only (desktop).
 */
export type NavItem = {
  href: string
  label: string
  icon: Icon
  exact?: boolean
  tab?: boolean
  soon?: boolean
  admin?: boolean
}

export const NAV_PRIMARY: NavItem[] = [
  // Guild is a team-formation platform: the two supply-side surfaces come
  // first and own the root. Hackathons is the demand side -- what a squad
  // forms around -- and is the only event surface that earns a nav row.
  //
  // Olvable's other event screens (/events, /feed, /calendar, /saved) and its
  // setup screens (/sources, /interests, /settings) are deliberately NOT
  // listed. They still resolve by URL; they are simply not this product. Nav
  // is the strongest claim a build makes about what it is for, and seven
  // aggregator rows against three Guild rows made the answer to "what is this
  // app" the wrong one -- the same misreading that cost the first submission
  // its Problem Statement Alignment score.
  { href: '/teams', label: 'Team Board', icon: Handshake, exact: true, tab: true },
  { href: '/people', label: 'People', icon: UsersThree, tab: true },
  { href: '/hackathons', label: 'Hackathons', icon: Trophy, tab: true },
]

export const NAV_ADMIN: NavItem[] = [
  { href: '/admin/add', label: 'Add event', icon: PlusCircle, admin: true },
  { href: '/admin/discovery', label: 'Leads', icon: Binoculars, admin: true },
  // exact, or /admin/add lights this row too (isActive is startsWith).
  { href: '/admin', label: 'Access', icon: ShieldCheck, admin: true, exact: true },
]

/**
 * The "You" tab. Points at the seeded Guild profile rather than /settings:
 * identity in this build comes from `DEMO_PROFILE_HANDLE` in lib/demo.ts, not
 * from the auth stub, and the profile screen is the one that answers "who am
 * I here" with a Guild Score. The handle is duplicated rather than imported
 * because lib/demo.ts reaches Supabase, and this module is bundled for the
 * client.
 */
export const NAV_YOU: NavItem = { href: '/p/aarav', label: 'You', icon: UserCircle, tab: true }

export function isActive(pathname: string, item: NavItem): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href)
}
