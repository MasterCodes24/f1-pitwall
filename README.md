# 🏁 F1 PitWall Dashboard

A real-time, terminal-inspired Formula 1 dashboard built with Next.js 14. It combines **live session telemetry**, **historical season data**, and **championship standings** into a single dark-mode "pit wall" style interface — the same kind of board a race engineer might glance at on a Sunday afternoon.

---

## 1. About the Project

**F1 PitWall Dashboard** is an unofficial, non-commercial fan project that aggregates data from two public F1 data sources:

- **[Jolpica-F1](https://api.jolpi.ca/ergast/f1)** — an Ergast-compatible REST API used for historical and season-level data: driver standings, constructor standings, and full race calendars dating back to 1950.
- **[OpenF1](https://openf1.org)** — a live timing API used for in-session data: car positions, gaps/intervals, driver info, and race control messages (flags, safety cars, penalties).

The app is split into three main views:

| Route | Description |
|---|---|
| `/` | **Standings** — current-season Drivers' and Constructors' Championship tables, fetched server-side and revalidated hourly. |
| `/live` | **Live** — a real-time "pit wall" board showing running order, gap/interval to leader, and a live speed/RPM telemetry chart for a selected driver. Polls every 3 seconds. |
| `/history` | **History** — browse any F1 season back to 1950, showing that year's champions and full race calendar. |

### Key features

- ⚡ **Live polling** — the `/live` page polls a server-side proxy route every 3 seconds for running order, intervals, and race control messages, and separately polls car telemetry (speed/RPM) for whichever driver is selected.
- 🛡️ **Server-side API proxying** — all OpenF1 requests are routed through a Next.js Route Handler (`/api/live-f1`) rather than called directly from the browser, which avoids CORS issues and respects OpenF1's free-tier rate limits (3 req/s, 30 req/min) via an in-memory short-TTL cache.
- 📊 **Telemetry charts** — speed and RPM are plotted live using Recharts.
- 🗂️ **Season archive** — full historical race calendars and championship winners for any season from 1950 to present, via Jolpica-F1.
- 🎨 **Pit-wall aesthetic** — a dark, monospace, glowing-accent UI theme (custom Tailwind palette: `pit` and `neon` color scales) designed to look like a race engineering terminal.

### Tech stack

- **Framework:** Next.js 14 (App Router, React Server Components)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Icons:** lucide-react
- **Data fetching (client):** SWR (where applicable), native `fetch` with polling
- **Data sources:** Jolpica-F1 (Ergast-compatible), OpenF1

---

## 2. Project Directory

> Note: source files are organized under Next.js's App Router convention (`src/app`). Below is the intended structure based on each file's imports and routing role.

```
f1-pitwall-dashboard/
├── public/                          # Static assets (if any)
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout — header, nav (Standings/History/Live), footer
│   │   ├── page.tsx                 # "/" — Championship standings (Drivers + Constructors)
│   │   ├── globals.css              # Global styles, scrollbar theming, ticker/pulse animations
│   │   │
│   │   ├── live/
│   │   │   ├── page.tsx             # "/live" — renders <LiveClient />
│   │   │   └── LiveClient.tsx       # Client component: running order, telemetry chart, event log
│   │   │
│   │   ├── history/
│   │   │   ├── page.tsx             # "/history" — renders <HistoryClient />
│   │   │   └── HistoryClient.tsx    # Client component: season picker, champions, race calendar
│   │   │
│   │   └── api/
│   │       └── live-f1/
│   │           └── route.ts         # Server proxy/cache for the OpenF1 API
│   │
│   └── lib/
│       └── jolpica.ts               # Shared types + fetch helpers for the Jolpica-F1 API
│
├── next-env.d.ts                    # Next.js TypeScript declarations (auto-generated, do not edit)
├── next.config.js                   # Next.js configuration
├── tailwind.config.js               # Tailwind theme: pit/neon color palette, fonts, custom grid templates
├── postcss.config.js                # PostCSS config (Tailwind + Autoprefixer)
├── tsconfig.json                    # TypeScript configuration (path alias: @/* → ./src/*)
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```


## 3. Setup and Installation

### Prerequisites

- **Node.js** ≥ 18.17.0 (required by Next.js 14)
- **npm** (or yarn/pnpm, if you adapt the lockfile)

### Steps

1. **Clone the repository**

   ```bash
   cd f1-pitwall-dashboard
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up the folder structure** (if starting from these flat source files)

   Place each file into its corresponding path as shown in the [Project Directory](#2-project-directory) section above — e.g. `layout.tsx` and the standings `page.tsx` go in `src/app/`, `LiveClient.tsx` + its `page.tsx` go in `src/app/live/`, etc.

4. **Run the development server**

   ```bash
   npm run dev
   ```

   The app will be available at [http://localhost:3000](http://localhost:3000).




---

*Data sources: Jolpica-F1 (Ergast-compatible) & OpenF1 — this is an unofficial, non-commercial fan project and is not affiliated with Formula 1, FIA, or Liberty Media.*
