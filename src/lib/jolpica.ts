// Shared types and fetch helpers for the Jolpica-F1 (Ergast-compatible) API.
// Base URL: https://api.jolpi.ca/ergast/f1/

export const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1'

export interface DriverStanding {
  position: string
  points: string
  wins: string
  Driver: {
    driverId: string
    permanentNumber?: string
    code?: string
    givenName: string
    familyName: string
    nationality: string
  }
  Constructors: Array<{
    constructorId: string
    name: string
    nationality: string
  }>
}

export interface ConstructorStanding {
  position: string
  points: string
  wins: string
  Constructor: {
    constructorId: string
    name: string
    nationality: string
  }
}

export interface RaceResult {
  season: string
  round: string
  raceName: string
  date: string
  Circuit: {
    circuitName: string
    Location: { locality: string; country: string }
  }
}

export async function fetchDriverStandings(year: string | number): Promise<DriverStanding[]> {
  const res = await fetch(`${JOLPICA_BASE}/${year}/driverStandings.json`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`Jolpica driverStandings fetch failed: ${res.status}`)
  const data = await res.json()
  const list = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings
  return list ?? []
}

export async function fetchConstructorStandings(
  year: string | number
): Promise<ConstructorStanding[]> {
  const res = await fetch(`${JOLPICA_BASE}/${year}/constructorStandings.json`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`Jolpica constructorStandings fetch failed: ${res.status}`)
  const data = await res.json()
  const list = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings
  return list ?? []
}

export async function fetchSeasonRaces(year: string | number): Promise<RaceResult[]> {
  const res = await fetch(`${JOLPICA_BASE}/${year}.json?limit=40`, {
    next: { revalidate: 86400 },
  })
  if (!res.ok) throw new Error(`Jolpica season fetch failed: ${res.status}`)
  const data = await res.json()
  const list = data?.MRData?.RaceTable?.Races
  return list ?? []
}

export function currentSeason(): number {
  return new Date().getFullYear()
}