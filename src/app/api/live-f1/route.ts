import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Server-side proxy for the OpenF1 API (https://openf1.org).
//
// Purpose:
//  - Centralize all OpenF1 calls behind one Next.js route so the browser
//    never talks to OpenF1 directly (avoids CORS issues and client-side
//    rate-limiting — OpenF1's free tier allows 3 req/s / 30 req/min).
//  - Cache the aggregated "live" payload for a short TTL (3s) so that many
//    connected dashboard clients polling this route only translate into a
//    small, bounded number of upstream requests to OpenF1.
//
// Usage from the frontend:
//   GET /api/live-f1                -> latest session + driver/position/
//                                       interval/car-data/race-control bundle
//   GET /api/live-f1?type=car_data&driver_number=44 -> raw passthrough for a
//                                       specific OpenF1 endpoint when needed
// ---------------------------------------------------------------------------

const OPENF1_BASE = 'https://api.openf1.org/v1'
const CACHE_TTL_MS = 3000

interface CacheEntry {
  timestamp: number
  data: unknown
}

// Module-level cache persists across requests within the same server
// runtime/lambda instance, giving us the "poll upstream every 3s max"
// behavior regardless of how often the frontend polls this route.
const cache = new Map<string, CacheEntry>()

async function fetchJson(path: string) {
  const res = await fetch(`${OPENF1_BASE}${path}`, {
    headers: { Accept: 'application/json' },
    // Always hit network fresh on the server-side fetch itself; our own
    // in-memory cache below is what enforces the 3s throttle.
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`OpenF1 request failed (${res.status}): ${path}`)
  }
  return res.json()
}

async function getCached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const existing = cache.get(key)
  const now = Date.now()
  if (existing && now - existing.timestamp < CACHE_TTL_MS) {
    return existing.data as T
  }
  const data = await loader()
  cache.set(key, { timestamp: now, data })
  return data
}

// Finds the most recent session (race weekend session) regardless of
// whether it is currently live, so /live has something meaningful to show
// even between sessions, and flags it as "live" only if within the active
// window (OpenF1 treats data as live from 30 min before to 30 min after).
async function getLatestSession(): Promise<any | null> {
  return getCached<any | null>('latest_session', async () => {
    const sessions = await fetchJson('/sessions?session_key=latest')
    return Array.isArray(sessions) && sessions.length > 0 ? sessions[0] : null
  })
}

function isSessionLive(session: any): boolean {
  if (!session?.date_start || !session?.date_end) return false
  const now = Date.now()
  const start = new Date(session.date_start).getTime() - 30 * 60 * 1000
  const end = new Date(session.date_end).getTime() + 30 * 60 * 1000
  return now >= start && now <= end
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  try {
    // --- Raw passthrough mode -------------------------------------------------
    // Lets the frontend request a specific OpenF1 endpoint (e.g. telemetry
    // for one driver) without us having to enumerate every shape up front.
    if (type) {
      const allowed = new Set([
        'car_data',
        'position',
        'intervals',
        'laps',
        'pit',
        'race_control',
        'drivers',
        'weather',
        'stints',
        'team_radio',
        'sessions',
      ])
      if (!allowed.has(type)) {
        return NextResponse.json({ error: `Unsupported type: ${type}` }, { status: 400 })
      }

      const session = await getLatestSession()
      const sessionKey = session?.session_key ?? 'latest'

      const passthroughParams = new URLSearchParams(searchParams)
      passthroughParams.delete('type')
      if (!passthroughParams.has('session_key')) {
        passthroughParams.set('session_key', String(sessionKey))
      }

      const cacheKey = `${type}?${passthroughParams.toString()}`
      const data = await getCached(cacheKey, () =>
        fetchJson(`/${type}?${passthroughParams.toString()}`)
      )

      return NextResponse.json({ type, session_key: sessionKey, data })
    }

    // --- Default aggregated "PitWall" bundle ---------------------------------
    const session = await getLatestSession()

    if (!session) {
      return NextResponse.json({
        live: false,
        session: null,
        drivers: [],
        positions: [],
        intervals: [],
        raceControl: [],
        message: 'No session data available from OpenF1.',
      })
    }

    const sessionKey = session.session_key
    const live = isSessionLive(session)

    const [drivers, positions, intervals, raceControl] = await Promise.all([
      getCached(`drivers_${sessionKey}`, () =>
        fetchJson(`/drivers?session_key=${sessionKey}`)
      ),
      getCached(`position_${sessionKey}`, () =>
        fetchJson(`/position?session_key=${sessionKey}`)
      ),
      getCached(`intervals_${sessionKey}`, () =>
        fetchJson(`/intervals?session_key=${sessionKey}`)
      ),
      getCached(`race_control_${sessionKey}`, () =>
        fetchJson(`/race_control?session_key=${sessionKey}`)
      ),
    ])

    return NextResponse.json({
      live,
      session,
      drivers,
      positions,
      intervals,
      raceControl,
      fetchedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[/api/live-f1] proxy error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch data from OpenF1.', detail: (err as Error).message },
      { status: 502 }
    )
  }
}