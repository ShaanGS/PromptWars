import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { BRAND } from '@/lib/brand'
import { Sidebar } from '@/components/shell/sidebar'
import { TabBar, TopBar } from '@/components/shell/mobile'
import { getSessionUser } from '@/lib/auth/server'
import { isAdmin } from '@/lib/auth/roles'

/**
 * Inter, 400/500/600 only. Agreed 2026-08-23 from the reference set: a
 * neutral grotesque is what makes the cards, pills and calendar blocks read
 * as one clean system rather than as a "designed" page.
 */
const sans = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

const mono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: BRAND.name,
  description: BRAND.tagline,
  // The dashboard is a public unauthenticated URL. Keep it out of indexes.
  robots: { index: false, follow: false },
  // Installed-app behaviour on iOS, which ignores the manifest for this.
  appleWebApp: { capable: true, title: 'Olvable', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  // Status bar blends with the canvas instead of sitting on white.
  themeColor: '#f5f6fa',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getSessionUser()
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full bg-canvas font-sans text-ink">
        {user ? (
          <>
            <div className="flex min-h-dvh">
              <Sidebar email={user.email ?? ''} admin={isAdmin(user)} />
              <div className="min-w-0 flex-1">
                <TopBar admin={isAdmin(user)} />
                {children}
              </div>
            </div>
            <TabBar />
          </>
        ) : (
          // Signed out: the login page owns the whole viewport.
          children
        )}
      </body>
    </html>
  )
}
