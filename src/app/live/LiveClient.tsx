'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  Radio,
  Gauge,
  Flag,
  AlertTriangle,
  Loader2,
  CircleDot,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

const POLL_INTERVAL_MS = 3000

interface DriverInfo {
  driver_number: number
  full_name?: string
  name_acronym?: string
  team_name?: string
  team_colour?: string
}

interface PositionEntry {
  driver_number: number
  position: number
  date: string
}

interface IntervalEntry {
  driver_number: number
  gap_to_leader: number | string | null
  interval: number | string | null
  date: string
}

interface RaceControlMsg {
  date: string
  category: string
  message: string
  flag?: string | null
  driver_number?: number | null
}

interface LiveBundle {
  live: boolean
  session: {
    session_key: number
    session_name: string
    session_type: string
    location: string
    country_name: string
    date_start: string
    date_end: string
  } | null
  drivers: DriverInfo[]
  positions: PositionEntry[]
  intervals: IntervalEntry[]
  raceControl: RaceControlMsg[]
  message?: string
}

interface TelemetryPoint {
  t: number
  speed: number
  rpm: number
}

// Tyre compounds aren't exposed on every endpoint uniformly across all
// session types, so the board renders a placeholder dash when unknown
// rather than guessing.
const COMPOUND_COLORS: Record<string, string> = {
  SOFT: 'text-neon-red',
  MEDIUM: 'text-neon-yellow',
  HARD: 'text-pit-text',
  INTERMEDIATE: 'text-neon-green',
  WET: 'text-neon-blue',
}

function latestByDriver<T extends { driver_number: number; date: string }>(
  entries: T[]
): Map<number, T> {
  const map = new Map<number, T>()
  for (const entry of entries) {
    const existing = map.get(entry.driver_number)
    if (!existing || new Date(entry.date) > new Date(existing.date)) {
      map.set(entry.driver_number, entry)
    }
  }
  return map
}

function formatGap(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') return value.toUpperCase()
  return `+${value.toFixed(3)}`
}

export default function LiveClient() {
  const [bundle, setBundle] = useState<LiveBundle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null)
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([])
  const tickRef = useRef(0)

  const pollLiveBundle = useCallback(async () => {
    try {
      const res = await fetch('/api/live-f1', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const data: LiveBundle = await res.json()
      setBundle(data)
      setError(null)
    } catch (err) {
      setError('Lost connection to the live data proxy. Retrying…')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    pollLiveBundle()
    const interval = setInterval(pollLiveBundle, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [pollLiveBundle])

  // Auto-select the current leader once data arrives, if nothing chosen yet.
  useEffect(() => {
    if (selectedDriver === null && bundle?.positions?.length) {
      const leader = [...bundle.positions].sort((a, b) => a.position - b.position)[0]
      if (leader) setSelectedDriver(leader.driver_number)
    }
  }, [bundle, selectedDriver])

  // Poll car telemetry (speed/RPM) for the selected driver every 3s, via the
  // same proxy route using its passthrough mode.
  useEffect(() => {
    if (selectedDriver === null) return
    let cancelled = false

    async function pollTelemetry() {
      try {
        const res = await fetch(
          `/api/live-f1?type=car_data&driver_number=${selectedDriver}`,
          { cache: 'no-store' }
        )
        if (!res.ok) return
        const json = await res.json()
        const samples: Array<{ speed: number; rpm: number; date: string }> = json?.data ?? []
        if (cancelled || samples.length === 0) return

        const recent = samples.slice(-30)
        const points: TelemetryPoint[] = recent.map((s) => {
          tickRef.current += 1
          return { t: tickRef.current, speed: s.speed, rpm: Math.round(s.rpm / 100) }
        })
        setTelemetry(points)
      } catch {
        // Silently skip a failed telemetry tick; the next 3s poll will retry.
      }
    }

    pollTelemetry()
    const interval = setInterval(pollTelemetry, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [selectedDriver])

  const driverMap = useMemo(() => {
    const map = new Map<number, DriverInfo>()
    bundle?.drivers?.forEach((d) => map.set(d.driver_number, d))
    return map
  }, [bundle])

  const intervalMap = useMemo(
    () => latestByDriver(bundle?.intervals ?? []),
    [bundle]
  )

  const runningOrder = useMemo(() => {
    const positions = bundle?.positions ?? []
    const latest = latestByDriver(positions)
    return [...latest.values()].sort((a, b) => a.position - b.position)
  }, [bundle])

  return (
    <div className="space-y-4">
      <PitWallHeader bundle={bundle} loading={loading} error={error} />

      <div className="grid grid-cols-1 xl:grid-cols-pitwall gap-4">
        {/* Main running-order board */}
        <section className="bg-pit-panel border border-pit-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-pit-border bg-pit-panel2/50">
            <Flag className="w-4 h-4 text-neon-green" />
            <h2 className="font-semibold text-sm uppercase tracking-wide">Running Order</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full mono-table text-sm">
              <thead>
                <tr className="text-pit-muted text-xs border-b border-pit-border">
                  <th className="text-left font-medium px-3 py-2">Pos</th>
                  <th className="text-left font-medium px-3 py-2">Driver</th>
                  <th className="text-right font-medium px-3 py-2">Interval</th>
                  <th className="text-right font-medium px-3 py-2">Gap</th>
                  <th className="text-right font-medium px-3 py-2">Tyre</th>
                </tr>
              </thead>
              <tbody>
                {runningOrder.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-pit-muted">
                      {loading ? 'Loading running order…' : 'No active session data right now.'}
                    </td>
                  </tr>
                )}
                {runningOrder.map((row) => {
                  const driver = driverMap.get(row.driver_number)
                  const intervalEntry = intervalMap.get(row.driver_number)
                  const isSelected = selectedDriver === row.driver_number
                  return (
                    <tr
                      key={row.driver_number}
                      onClick={() => setSelectedDriver(row.driver_number)}
                      className={`border-b border-pit-border/60 cursor-pointer transition-colors ${
                        isSelected ? 'bg-pit-panel2' : 'hover:bg-pit-panel2/60'
                      }`}
                    >
                      <td className="px-3 py-2.5 font-bold">{row.position}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className="inline-block w-2 h-2 rounded-full mr-2"
                          style={{
                            backgroundColor: driver?.team_colour
                              ? `#${driver.team_colour}`
                              : '#666',
                          }}
                        />
                        <span className="font-semibold">
                          {driver?.name_acronym ?? `#${row.driver_number}`}
                        </span>{' '}
                        <span className="text-pit-muted text-xs">{driver?.team_name}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-pit-text">
                        {formatGap(intervalEntry?.interval)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-pit-muted">
                        {formatGap(intervalEntry?.gap_to_leader)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-pit-muted">—</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Telemetry panel */}
        <section className="bg-pit-panel border border-pit-border rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-pit-border bg-pit-panel2/50">
            <Gauge className="w-4 h-4 text-neon-purple" />
            <h2 className="font-semibold text-sm uppercase tracking-wide">
              Telemetry
              {selectedDriver !== null && (
                <span className="ml-2 text-pit-muted font-normal">
                  {driverMap.get(selectedDriver)?.name_acronym ?? `#${selectedDriver}`}
                </span>
              )}
            </h2>
          </div>
          <div className="p-3 flex-1 min-h-[260px]">
            {telemetry.length === 0 ? (
              <div className="h-full flex items-center justify-center text-pit-muted text-sm">
                {selectedDriver === null
                  ? 'Select a driver from the board to view telemetry.'
                  : 'Waiting for telemetry samples…'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={telemetry} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid stroke="#262630" strokeDasharray="3 3" />
                  <XAxis dataKey="t" stroke="#7a7a85" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#7a7a85" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121216',
                      border: '1px solid #262630',
                      fontFamily: 'monospace',
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="speed"
                    name="Speed (km/h)"
                    stroke="#39ff8f"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="rpm"
                    name="RPM (x100)"
                    stroke="#b14aff"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Event log ticker spans full width below */}
        <section className="xl:col-span-2 bg-pit-panel border border-pit-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-pit-border bg-pit-panel2/50">
            <Radio className="w-4 h-4 text-neon-red" />
            <h2 className="font-semibold text-sm uppercase tracking-wide">Race Control / Event Log</h2>
          </div>
          <EventTicker messages={bundle?.raceControl ?? []} />
        </section>
      </div>
    </div>
  )
}

function PitWallHeader({
  bundle,
  loading,
  error,
}: {
  bundle: LiveBundle | null
  loading: boolean
  error: string | null
}) {
  const session = bundle?.session
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 bg-pit-panel border border-pit-border rounded-xl px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className={`live-dot inline-block w-2.5 h-2.5 rounded-full ${
            bundle?.live ? 'bg-neon-red' : 'bg-pit-muted'
          }`}
        />
        <div>
          <div className="font-mono text-sm font-bold">
            {bundle?.live ? 'LIVE SESSION' : 'NO ACTIVE SESSION'}
          </div>
          <div className="text-xs text-pit-muted font-mono">
            {session
              ? `${session.location}, ${session.country_name} — ${session.session_name}`
              : bundle?.message ?? 'Connecting to OpenF1…'}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs font-mono text-pit-muted">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {error && (
          <span className="flex items-center gap-1 text-neon-yellow">
            <AlertTriangle className="w-3.5 h-3.5" />
            {error}
          </span>
        )}
        <span className="flex items-center gap-1">
          <CircleDot className="w-3 h-3" />
          Polling every 3s
        </span>
      </div>
    </div>
  )
}

function EventTicker({ messages }: { messages: RaceControlMsg[] }) {
  if (!messages || messages.length === 0) {
    return (
      <div className="px-4 py-4 text-sm text-pit-muted font-mono">
        No race control messages yet.
      </div>
    )
  }

  const recent = [...messages].slice(-15).reverse()

  return (
    <div className="overflow-x-auto whitespace-nowrap py-3 px-4">
      <div className="ticker-track gap-8">
        {recent.map((m, i) => (
          <span key={i} className="inline-flex items-center gap-2 font-mono text-sm mr-8">
            <FlagBadge flag={m.flag} category={m.category} />
            <span className="text-pit-muted text-xs">
              {new Date(m.date).toLocaleTimeString()}
            </span>
            <span>{m.message}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function FlagBadge({ flag, category }: { flag?: string | null; category: string }) {
  const normalized = (flag ?? category ?? '').toUpperCase()
  let color = 'bg-pit-border text-pit-text'
  if (normalized.includes('RED')) color = 'bg-neon-red/20 text-neon-red'
  else if (normalized.includes('YELLOW') || normalized.includes('SAFETY'))
    color = 'bg-neon-yellow/20 text-neon-yellow'
  else if (normalized.includes('GREEN')) color = 'bg-neon-green/20 text-neon-green'
  else if (normalized.includes('PIT')) color = 'bg-neon-red/20 text-neon-red'

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${color}`}>
      {flag || category}
    </span>
  )
}