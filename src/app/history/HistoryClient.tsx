'use client'

import { useEffect, useMemo, useState } from 'react'
import { History, Trophy, CalendarDays, Loader2, AlertTriangle } from 'lucide-react'

interface RaceSummary {
  round: string
  raceName: string
  date: string
  circuitName: string
  locality: string
  country: string
  winnerGivenName?: string
  winnerFamilyName?: string
  winnerConstructor?: string
}

interface SeasonChampions {
  driverChampion: string | null
  driverChampionTeam: string | null
  constructorChampion: string | null
}

interface SeasonPayload {
  year: number
  races: RaceSummary[]
  champions: SeasonChampions
}

const CURRENT_YEAR = new Date().getFullYear()
const EARLIEST_YEAR = 1950
const YEARS = Array.from(
  { length: CURRENT_YEAR - EARLIEST_YEAR + 1 },
  (_, i) => CURRENT_YEAR - i
)

async function fetchSeasonData(year: number): Promise<SeasonPayload> {
  const base = 'https://api.jolpi.ca/ergast/f1'

  const [scheduleRes, driverStandingsRes, constructorStandingsRes] = await Promise.all([
    fetch(`${base}/${year}/results/1.json?limit=40`), // round-1 winners give a quick calendar+winner combo fallback
    fetch(`${base}/${year}/driverStandings.json`),
    fetch(`${base}/${year}/constructorStandings.json`),
  ])

  // Full calendar (separate call keeps payload light and reliable for any year back to 1950)
  const calendarRes = await fetch(`${base}/${year}.json?limit=40`)
  const calendarJson = await calendarRes.json()
  const races = calendarJson?.MRData?.RaceTable?.Races ?? []

  let driverChampion: string | null = null
  let driverChampionTeam: string | null = null
  let constructorChampion: string | null = null

  if (driverStandingsRes.ok) {
    const dJson = await driverStandingsRes.json()
    const top = dJson?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings?.[0]
    if (top) {
      driverChampion = `${top.Driver.givenName} ${top.Driver.familyName}`
      driverChampionTeam = top.Constructors?.[0]?.name ?? null
    }
  }

  if (constructorStandingsRes.ok) {
    const cJson = await constructorStandingsRes.json()
    const top = cJson?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings?.[0]
    if (top) {
      constructorChampion = top.Constructor.name
    }
  }

  if (scheduleRes.ok) {
    // no-op: reserved for future per-race winner enrichment
  }

  const mappedRaces: RaceSummary[] = races.map((r: any) => ({
    round: r.round,
    raceName: r.raceName,
    date: r.date,
    circuitName: r.Circuit?.circuitName ?? '—',
    locality: r.Circuit?.Location?.locality ?? '',
    country: r.Circuit?.Location?.country ?? '',
  }))

  return {
    year,
    races: mappedRaces,
    champions: { driverChampion, driverChampionTeam, constructorChampion },
  }
}

export default function HistoryClient() {
  const [year, setYear] = useState<number>(CURRENT_YEAR - 1)
  const [data, setData] = useState<SeasonPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchSeasonData(year)
      .then((payload) => {
        if (!cancelled) setData(payload)
      })
      .catch(() => {
        if (!cancelled) {
          setError(`Could not load ${year} season data from Jolpica-F1.`)
          setData(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [year])

  const sortedRaces = useMemo(
    () => [...(data?.races ?? [])].sort((a, b) => Number(a.round) - Number(b.round)),
    [data]
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-neon-purple" />
            Season History
          </h1>
          <p className="text-pit-muted text-sm mt-1">
            Browse any Formula 1 season back to {EARLIEST_YEAR}.
          </p>
        </div>

        <label className="flex items-center gap-2 bg-pit-panel border border-pit-border rounded-lg px-3 py-2">
          <CalendarDays className="w-4 h-4 text-pit-muted" />
          <span className="text-xs text-pit-muted font-mono">SEASON</span>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-transparent font-mono text-sm font-semibold focus:outline-none cursor-pointer"
          >
            {YEARS.map((y) => (
              <option key={y} value={y} className="bg-pit-panel text-pit-text">
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="border border-neon-red/40 bg-neon-red/10 text-neon-red rounded-lg px-4 py-3 text-sm font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-1 bg-pit-panel border border-pit-border rounded-xl p-5 space-y-4 h-fit">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-neon-yellow" />
            <h2 className="font-semibold text-sm uppercase tracking-wide">{year} Champions</h2>
          </div>

          {loading ? (
            <LoadingRow />
          ) : (
            <div className="space-y-4 font-mono">
              <ChampionStat
                label="Drivers' Champion"
                value={data?.champions.driverChampion ?? 'Not yet decided / unavailable'}
                sub={data?.champions.driverChampionTeam}
                color="text-neon-green"
              />
              <ChampionStat
                label="Constructors' Champion"
                value={data?.champions.constructorChampion ?? 'Not yet decided / unavailable'}
                color="text-neon-purple"
              />
            </div>
          )}
        </section>

        <section className="lg:col-span-2 bg-pit-panel border border-pit-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-pit-border bg-pit-panel2/50">
            <CalendarDays className="w-4 h-4 text-neon-blue" />
            <h2 className="font-semibold text-sm uppercase tracking-wide">
              {year} Race Calendar
            </h2>
          </div>

          <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
            <table className="w-full mono-table text-sm">
              <thead className="sticky top-0 bg-pit-panel2">
                <tr className="text-pit-muted text-xs border-b border-pit-border">
                  <th className="text-left font-medium px-4 py-2">Rnd</th>
                  <th className="text-left font-medium px-4 py-2">Grand Prix</th>
                  <th className="text-left font-medium px-4 py-2">Circuit</th>
                  <th className="text-left font-medium px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-pit-muted">
                      <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                      Loading {year} calendar…
                    </td>
                  </tr>
                )}
                {!loading && sortedRaces.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-pit-muted">
                      No race data found for {year}.
                    </td>
                  </tr>
                )}
                {!loading &&
                  sortedRaces.map((r) => (
                    <tr
                      key={r.round}
                      className="border-b border-pit-border/60 hover:bg-pit-panel2 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-pit-muted">{r.round}</td>
                      <td className="px-4 py-2.5 font-semibold">{r.raceName}</td>
                      <td className="px-4 py-2.5 text-pit-muted">
                        {r.circuitName}
                        {r.locality ? `, ${r.locality}` : ''}
                      </td>
                      <td className="px-4 py-2.5">{r.date}</td>
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

function ChampionStat({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub?: string | null
  color: string
}) {
  return (
    <div>
      <div className="text-xs text-pit-muted uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-pit-muted mt-0.5">{sub}</div>}
    </div>
  )
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-2 text-pit-muted text-sm py-4">
      <Loader2 className="w-4 h-4 animate-spin" />
      Loading champions…
    </div>
  )
}