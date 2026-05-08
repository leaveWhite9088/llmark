# LLMark Frontend

Next.js 14 + React 18 + TypeScript frontend for LLMark - LLM API performance monitoring platform.

## Overview

The frontend provides a web interface for:
- Viewing LLM API performance leaderboards
- Exploring provider and model details
- Comparing models across providers
- Viewing personal contribution statistics

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.9+
- **Styling**: TailwindCSS 3.4
- **UI Components**: Lucide React (icons)
- **Charts**: Recharts
- **Data Fetching**: SWR
- **Date Utils**: date-fns

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
cd frontend
npm install
```

### Environment

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8011/v1
```

### Run Development Server

```bash
npm run dev
```

Or use the PowerShell script from repo root:
```powershell
.\scripts\start-frontend.ps1
```

The app will be available at http://127.0.0.1:3011

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home (leaderboard)
│   ├── layout.tsx         # Root layout
│   ├── leaderboard/       # User contribution ranking
│   ├── providers/         # Provider list
│   ├── provider/[provider]/          # Provider detail
│   │   └── model/[model]/            # Provider-model detail
│   ├── models/            # Model list
│   ├── model/[model]/     # Model detail
│   ├── me/                # Personal center
│   └── auth/callback/     # OAuth callback
├── components/
│   ├── ui/                # Base UI components
│   │   ├── CustomSelect.tsx
│   │   ├── SortableDataTable.tsx
│   │   ├── ProviderLogo.tsx
│   │   └── ModelLogo.tsx
│   ├── home/              # Home page components
│   │   ├── FilterBar.tsx
│   │   ├── LeaderboardCard.tsx
│   │   ├── LeaderboardScroll.tsx
│   │   ├── BarChartLeaderboard.tsx
│   │   ├── HomePageContent.tsx
│   │   └── LoadingFallback.tsx
│   ├── me/                # Personal center components
│   │   ├── ProfileHero.tsx
│   │   ├── ContributionHeatmap.tsx
│   │   ├── ContributionSummaryCards.tsx
│   │   ├── ProfileCharts.tsx
│   │   ├── MyModelTable.tsx
│   │   ├── RankComparisonCard.tsx
│   │   ├── MeFiltersBar.tsx
│   │   └── EmptyState.tsx
│   ├── model/             # Model-related components
│   │   ├── ModelPerformanceTable.tsx
│   │   └── ProviderComparisonChart.tsx
│   ├── provider/          # Provider detail components
│   │   ├── SkeletonCard.tsx
│   │   └── SkeletonBar.tsx
│   ├── provider-model/    # Provider-model detail components
│   │   ├── ProviderModelDetailPage.tsx
│   │   └── TrendChart.tsx
│   ├── user-leaderboard/  # User ranking components
│   │   ├── UserLeaderboardTable.tsx
│   │   ├── CommunityStats.tsx
│   │   ├── HighlightsBar.tsx
│   │   ├── MyRankButton.tsx
│   │   └── LevelInfoModal.tsx
│   ├── Navbar.tsx         # Top navigation
│   └── ScrollRestoration.tsx
├── lib/
│   ├── api/               # API clients by domain
│   │   ├── client.ts      # Fetch wrapper
│   │   ├── leaderboard.ts
│   │   ├── providers.ts
│   │   ├── models.ts
│   │   └── users.ts
│   ├── types/             # TypeScript types by domain
│   │   ├── common.ts
│   │   ├── leaderboard.ts
│   │   ├── providers.ts
│   │   ├── models.ts
│   │   ├── users.ts
│   │   └── catalog.ts
│   ├── utils.ts           # Utility functions
│   ├── auth.ts            # Auth helpers
│   └── inputLength.ts     # Input length labels
├── hooks/
│   └── useAuth.ts         # Authentication hook
├── constants/
│   └── brands.ts          # Provider brand config
├── styles/
│   └── design-tokens.css  # CSS variables
├── types/
│   └── assets.d.ts        # Asset type declarations
└── public/                # Static assets
```

## Pages & Routes

| Route | Description | Key APIs |
|-------|-------------|----------|
| `/` | Home - Performance leaderboard | `/v1/leaderboard`, `/v1/meta/filters` |
| `/leaderboard` | User contribution ranking | `/v1/users/leaderboard` |
| `/providers` | Provider catalog | `/v1/providers` |
| `/provider/[provider]` | Provider detail | `/v1/provider/{p}/overview`, `models`, `stats` |
| `/provider/[provider]/model/[model]` | Provider-model detail | `/v1/detail`, `/v1/meta/filters` |
| `/models` | Model catalog | `/v1/models` |
| `/model/[model]` | Model detail | `/v1/model/{m}/overview`, `entries`, `provider-comparison` |
| `/me` | Personal center | `/v1/me/overview`, `profile`, `contribution-heatmap`, `/v1/auth/me` |

## Data Behavior

- **Leaderboard Data**: Reads backend aggregated data from the last `24h`
- **Filter Options**: Loaded dynamically from `GET /v1/meta/filters`
- **Filter Caching**: Metadata cached in `localStorage` for 15 minutes
- **Manual Refresh**: Updates both leaderboard data and filter metadata

## Filter Dimensions

Current frontend supports filtering by:

- `region` - Country code (CN, US, SG, etc.)
- `provider` - Provider name
- `model search` - Text search
- `input_length_bucket` - Input token length category

Display labels for input length buckets:
- `short` → "短文本" (0 ~ 4K tokens)
- `medium` → "中文本" (4K ~ 16K tokens)
- `long` → "长文本" (> 16K tokens)

## API Integration

API clients are organized by domain in `lib/api/`:

```typescript
// Example usage
import { fetchLeaderboard, fetchFilterOptions } from '@/lib/api';

const data = await fetchLeaderboard({ range: '24h', region: 'CN' });
```

### Data Fetching Pattern

```typescript
// Server Component
async function Page() {
  const data = await fetchLeaderboard();
  return <Component data={data} />;
}

// Client Component with SWR
'use client';
import useSWR from 'swr';

function Component() {
  const { data } = useSWR('/leaderboard', () => fetchLeaderboard());
  return <div>{data}</div>;
}
```

## Component Organization

### Decision Tree for Component Placement

```
Where is this component used?
│
├─► Only 1 page?
│   └─► Put in components/{page}/
│       Example: components/me/ProfileHero.tsx
│
├─► Used in 2+ pages?
│   └─► Put in components/{shared}/
│       Example: components/model/ModelCard.tsx
│
└─► Basic UI element?
    └─► Put in components/ui/
        Example: components/ui/Button.tsx
```

### Directory Reference

| Directory | Purpose | Examples |
|-----------|---------|----------|
| `components/ui/` | Global base components | CustomSelect, SortableDataTable, ProviderLogo |
| `components/home/` | Home page only | FilterBar, LeaderboardCard, BarChartLeaderboard |
| `components/me/` | Personal center | ProfileHero, ContributionHeatmap, MeFiltersBar |
| `components/model/` | Model-related (shared) | ModelPerformanceTable, ProviderComparisonChart |
| `components/provider/` | Provider detail | SkeletonCard, SkeletonBar |
| `components/provider-model/` | Provider-model detail | ProviderModelDetailPage, TrendChart |
| `components/user-leaderboard/` | User ranking | UserLeaderboardTable, CommunityStats, HighlightsBar |
| `components/` (root) | Global layout | Navbar, ScrollRestoration |

## Key Concepts

### Region Display

- Regions are displayed as raw country codes: `CN`, `US`, `SG`, `JP`, `DE`, `UNKNOWN`
- No grouping into regions like "ASIA" or "EU"
- Represents the egress country of the request, not physical user location

### Authentication

- Uses cookie-based session (`llmark_session`)
- `useAuth()` hook for accessing current user state
- GitHub OAuth flow via backend

### Design Tokens

Global design tokens are defined in `styles/design-tokens.css`:

```css
:root {
  --color-primary: ...;
  --color-background: ...;
  /* etc */
}
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3011 |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

## Documentation

For detailed architecture information, see [ARCHITECTURE.md](ARCHITECTURE.md).
