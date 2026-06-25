import { Trophy, Users, TrendingUp } from 'lucide-react'
import {
  fetchDriverStandings,
  fetchConstructorStandings,
  currentSeason,
} from '@/lib/jolpica'

export const revalidate = 3600

export default async function HomePage() {
  const year = currentSeason()

  const [driverResult, constructorResult] = await Promise.allSettled([
    fetchDriverStandings(year),
    fetchConstructorStandings(year),
  ])

  const drivers = driverResult.status === 'fulfilled' ? driverResult.value : []
  const constructors =
    constructorResult.status === 'fulfilled' ? constructorResult.value : []

  const fetchFailed =
    driverResult.status === 'rejected' && constructorResult.status === 'rejected'

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-neon-green" />
            {year} Championship Standings
          </h1>
          <p className="text-pit-muted text-sm mt-1">
            Live points table from the Jolpica-F1 API.
          </p>
        </div>
      </div>

      {fetchFailed && (
        <div className="border border-neon-red/40 bg-neon-red/10 text-neon-red rounded-lg px-4 py-3 text-sm font-mono">
          Unable to reach Jolpica-F1 API. The season may not have started yet, or the
          service is temporarily unavailable.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-pit-panel border border-pit-border rounded-xl overflow-hidden">
          <SectionHeader icon={<Trophy className="w-4 h-4 text-neon-yellow" />} title="Drivers" />
          <div className="overflow-x-auto">
            <table className="w-full mono-table text-sm">
              <thead>
                <tr className="text-pit-muted text-xs border-b border-pit-border">
                  <th className="text-left font-medium px-4 py-2">Pos</th>
                  <th className="text-left font-medium px-4 py-2">Driver</th>
                  <th className="text-left font-medium px-4 py-2">Team</th>
                  <th className="text-right font-medium px-4 py-2">Wins</th>
                  <th className="text-right font-medium px-4 py-2">Pts</th>
                </tr>
              </thead>
              <tbody>
                {drivers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-pit-muted">
                      No standings data available yet for {year}.
                    </td>
                  </tr>
                )}
                {drivers.map((d, i) => (
                  <tr
                    key={d.Driver.driverId}
                    className={`border-b border-pit-border/60 hover:bg-pit-panel2 transition-colors ${
                      i < 3 ? 'text-neon-green' : 'text-pit-text'
                    }`}
                  >
                    <td className="px-4 py-2.5 font-semibold">{d.position}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold">{d.Driver.code ?? d.Driver.familyName.slice(0, 3).toUpperCase()}</span>{' '}
                      <span className="text-pit-muted">
                        {d.Driver.givenName} {d.Driver.familyName}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-pit-muted">
                      {d.Constructors?.[0]?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">{d.wins}</td>
                    <td className="px-4 py-2.5 text-right font-bold">{d.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-pit-panel border border-pit-border rounded-xl overflow-hidden">
          <SectionHeader icon={<Users className="w-4 h-4 text-neon-purple" />} title="Constructors" />
          <div className="overflow-x-auto">
            <table className="w-full mono-table text-sm">
              <thead>
                <tr className="text-pit-muted text-xs border-b border-pit-border">
                  <th className="text-left font-medium px-4 py-2">Pos</th>
                  <th className="text-left font-medium px-4 py-2">Team</th>
                  <th className="text-right font-medium px-4 py-2">Wins</th>
                  <th className="text-right font-medium px-4 py-2">Pts</th>
                </tr>
              </thead>
              <tbody>
                {constructors.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-pit-muted">
                      No standings data available yet for {year}.
                    </td>
                  </tr>
                )}
                {constructors.map((c, i) => (
                  <tr
                    key={c.Constructor.constructorId}
                    className={`border-b border-pit-border/60 hover:bg-pit-panel2 transition-colors ${
                      i === 0 ? 'text-neon-purple' : 'text-pit-text'
                    }`}
                  >
                    <td className="px-4 py-2.5 font-semibold">{c.position}</td>
                    <td className="px-4 py-2.5">{c.Constructor.name}</td>
                    <td className="px-4 py-2.5 text-right">{c.wins}</td>
                    <td className="px-4 py-2.5 text-right font-bold">{c.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-pit-border bg-pit-panel2/50">
      {icon}
      <h2 className="font-semibold text-sm uppercase tracking-wide">{title}</h2>
    </div>
  )
}