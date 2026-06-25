import type { Metadata } from 'next'
import Link from 'next/link'
import { Flag, History, Radio, Gauge } from 'lucide-react'
import './globals.css'

export const metadata: Metadata = {
  title: 'F1 PitWall Dashboard',
  description: 'Live timing, telemetry and historical F1 data dashboard.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-pit-bg text-pit-text antialiased min-h-screen flex flex-col">
        <header className="border-b border-pit-border bg-pit-panel/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
              <Gauge className="w-6 h-6 text-neon-red" strokeWidth={2.5} />
              <span className="text-lg">
                PIT<span className="text-neon-red">WALL</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 font-mono text-sm">
              <NavLink href="/" icon={<Flag className="w-4 h-4" />} label="Standings" />
              <NavLink href="/history" icon={<History className="w-4 h-4" />} label="History" />
              <NavLink href="/live" icon={<Radio className="w-4 h-4" />} label="Live" />
            </nav>
          </div>
        </header>
        <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-6">{children}</main>
        <footer className="border-t border-pit-border py-4 text-center text-xs text-pit-muted font-mono">
          Data: Jolpica-F1 (Ergast-compatible) &amp; OpenF1 — unofficial, non-commercial fan project.
        </footer>
      </body>
    </html>
  )
}

function NavLink({
  href,
  icon,
  label,
}: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-3 py-2 rounded-md text-pit-muted hover:text-pit-text hover:bg-pit-panel2 transition-colors"
    >
      {icon}
      {label}
    </Link>
  )
}