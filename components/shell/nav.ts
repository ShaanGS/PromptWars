import type { Icon } from '@phosphor-icons/react'
import {
  Binoculars,
  BookmarkSimple,
  CalendarBlank,
  Gear,
  Handshake,
  House,
  ListBullets,
  Plugs,
  PlusCircle,
  ShieldCheck,
  Sparkle,
  Trophy,
  UserCircle,
  UsersThree,
} from '@phosphor-icons/react/dist/ssr'

/**
 * One nav definition for the sidebar, the top bar and the bottom tabs.
 *
 * The four `tab` items are the phone's bottom bar: Feed, Calendar, Saved,
 * You. Everything else is sidebar-only (desktop) or reached from "You".
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
  { href: '/', label: 'Feed', icon: House, exact: true, tab: true },
  { href: '/events', label: 'All events', icon: ListBullets },
  { href: '/hackathons', label: 'Hackathons', icon: Trophy },
  // Guild: the events corpus is the demand side, these two are the supply.
  // Team Board takes a bottom tab because forming a squad is the reason to
  // open the app on a phone; Calendar moves to the sidebar.
  { href: '/teams', label: 'Team Board', icon: Handshake, tab: true },
  { href: '/people', label: 'People', icon: UsersThree },
  { href: '/calendar', label: 'Calendar', icon: CalendarBlank },
  { href: '/saved', label: 'Saved', icon: BookmarkSimple, tab: true },
]

export const NAV_SETUP: NavItem[] = [
  { href: '/sources', label: 'Sources', icon: Plugs },
  { href: '/interests', label: 'Interests', icon: Sparkle },
  { href: '/settings', label: 'Settings', icon: Gear },
]

export const NAV_ADMIN: NavItem[] = [
  { href: '/admin/add', label: 'Add event', icon: PlusCircle, admin: true },
  { href: '/admin/discovery', label: 'Leads', icon: Binoculars, admin: true },
  // exact, or /admin/add lights this row too (isActive is startsWith).
  { href: '/admin', label: 'Access', icon: ShieldCheck, admin: true, exact: true },
]

/** The "You" tab: on phones it is the door to settings and admin. */
export const NAV_YOU: NavItem = { href: '/settings', label: 'You', icon: UserCircle, tab: true }

export function isActive(pathname: string, item: NavItem): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href)
}
