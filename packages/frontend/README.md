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
- pnpm 9+ (monorepo uses pnpm workspaces)

### Setup

From repo root:

```bash
# Install all dependencies (frontend + backend)
pnpm install

# Or install frontend only
pnpm --filter llmark-frontend install
```

### Environment

Create `packages/frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8011/v1
NEXT_PUBLIC_USE_MOCK=false
```

### Run Development Server

```bash
# From repo root - run frontend only
pnpm dev:frontend

# Or from frontend directory
cd packages/frontend
pnpm dev
```

The app will be available at http://127.0.0.1:3011

### Build for Production

```bash
pnpm build:frontend
```

## Project Structure

```
packages/frontend/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Home (leaderboard)
│   ├── layout.tsx                # Root layout
│   ├── leaderboard/              # User contribution ranking
│   ├── providers/                # Provider catalog
│   ├── provider/[provider]/      # Provider detail
│   │   └── model/[model]/        # Provider-model detail
│   ├── models/                   # Model catalog
│   ├── model/[model]/            # Model detail
│   ├── me/                       # Personal center
│   └── auth/callback/            # OAuth callback
├── components/
│   ├── ui/                       # Base UI components
│   │   ├── CustomSelect.tsx
│   │   ├── SortableDataTable.tsx
│   │   ├── ProviderLogo.tsx
│   │   └── ModelLogo.tsx
│   ├── home/                     # Home page components
│   │   ├── FilterBar.tsx
│   │   ├── LeaderboardCard.tsx
│   │   ├── LeaderboardTable.tsx
│   │   ├── LeaderboardScroll.tsx
│   │   ├── BarChartLeaderboard.tsx
│   │   ├── StatsSummary.tsx
│   │   ├── HomePageContent.tsx
│   │   └── LoadingFallback.tsx
│   ├── me/                       # Personal center components
│   │   ├── ProfileHero.tsx
│   │   ├── ContributionHeatmap.tsx
│   │   ├── PerformanceHighlights.tsx
│   │   ├── ProfileCharts.tsx
│   │   ├── MyModelTable.tsx
│   │   ├── MeFiltersBar.tsx
│   │   └── EmptyState.tsx
│   ├── model/                    # Model-related components
│   │   ├── ModelPerformanceTable.tsx
│   │   ├── ModelsStatsSummary.tsx
│   │   └── ProviderComparisonChart.tsx
│   ├── provider/                 # Provider detail components
│   │   ├── ProviderModelsTable.tsx
│   │   ├── ProvidersStatsSummary.tsx
│   │   ├── SkeletonCard.tsx
│   │   └── SkeletonBar.tsx
│   ├── provider-model/           # Provider-model detail components
│   │   ├── ProviderModelDetailPage.tsx
│   │   └── TrendChart.tsx
│   ├── user-leaderboard/         # User ranking components
│   │   ├── UserLeaderboardTable.tsx
│   │   ├── CommunityStats.tsx
│   │   ├── HighlightsBar.tsx
│   │   ├── LevelDistributionBar.tsx
│   │   ├── LevelInfoModal.tsx
│   │   └── UserStatusPanel.tsx
│   ├── theme/                    # Theme components
│   │   ├── ThemeProvider.tsx
│   │   └── ThemeToggle.tsx
│   ├── Navbar.tsx                # Top navigation
│   └── ScrollRestoration.tsx
├── lib/
│   ├── api/                      # API clients by domain
│   │   ├── client.ts             # Fetch wrapper (fetchPublic, fetchWithSession)
│   │   ├── config.ts             # API config (USE_MOCK, getApiUrl)
│   │   ├── index.ts              # Re-exports
│   │   ├── leaderboard.ts
│   │   ├── providers.ts
│   │   ├── models.ts
│   │   └── users.ts
│   ├── types/                    # TypeScript types by domain
│   │   ├── index.ts              # Re-exports
│   │   ├── common.ts
│   │   ├── leaderboard.ts
│   │   ├── providers.ts
│   │   ├── models.ts
│   │   ├── users.ts
│   │   └── catalog.ts
│   ├── mocks/                    # Mock data for development
│   │   ├── performance.ts
│   │   ├── leaderboard.ts
│   │   └── users.ts
│   ├── utils.ts                  # Utility functions (formatNumber, getSpeedRating)
│   ├── auth.ts                   # Auth helpers
│   └── inputLength.ts            # Input length bucket labels
├── hooks/
│   └── useAuth.ts                # Authentication hook
├── constants/
│   └── brands.ts                 # Provider & model brand config
├── styles/
│   └── design-tokens.css         # CSS variables
├── types/
│   └── assets.d.ts               # Asset type declarations
└── public/                       # Static assets (logos, SVGs)
```

## Pages & Routes

| Route | Description | Key APIs |
|-------|-------------|----------|
| `/` | Home - Performance leaderboard | `/v1/leaderboard`, `/v1/meta/filters` |
| `/leaderboard` | User contribution ranking | `/v1/users/leaderboard` |
| `/providers` | Provider catalog | `/v1/providers` |
| `/provider/[provider]` | Provider detail | `/v1/provider/{p}/overview`, `/v1/provider/{p}/models` |
| `/provider/[provider]/model/[model]` | Provider-model detail | `/v1/detail`, `/v1/meta/filters` |
| `/models` | Model catalog | `/v1/models` |
| `/model/[model]` | Model detail | `/v1/model/{m}/entries`, `/v1/model/{m}/comparison` |
| `/me` | Personal center | `/v1/me/overview`, `/v1/me/profile`, `/v1/me/contribution-heatmap` |

## Key Utilities

### formatNumber

统一的数字格式化函数，位于 `lib/utils.ts`：

```typescript
import { formatNumber } from "@/lib/utils";

formatNumber(1500);    // "1.5k"
formatNumber(1500000); // "1.5M"
formatNumber(500);     // "500"
```

### getSpeedRating

速度评级函数，根据 TPS 返回评级标签和颜色：

```typescript
import { getSpeedRating } from "@/lib/utils";

getSpeedRating(200); // { label: "极快", color: "text-theme-accent-success" }
getSpeedRating(80);  // { label: "中", color: "text-theme-accent-warning" }
```

### getInputLengthBucketLabel

输入长度桶标签函数：

```typescript
import { getInputLengthBucketLabel } from "@/lib/inputLength";

getInputLengthBucketLabel("short");  // "短文本"
getInputLengthBucketLabel("medium"); // "中文本"
getInputLengthBucketLabel("long");   // "长文本"
```

## Mock Data

开发环境下可使用 mock 数据，设置环境变量：

```env
NEXT_PUBLIC_USE_MOCK=true
```

Mock 数据位于 `lib/mocks/` 目录：
- `performance.ts` - 性能数据 mock
- `leaderboard.ts` - 排行榜 mock
- `users.ts` - 用户数据 mock

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
│   └─► Put in components/{domain}/
│       Example: components/model/ModelPerformanceTable.tsx
│
└─► Basic UI element?
    └─► Put in components/ui/
        Example: components/ui/ProviderLogo.tsx
```

### Directory Reference

| Directory | Purpose | Examples |
|-----------|---------|----------|
| `components/ui/` | Global base components | CustomSelect, SortableDataTable, ProviderLogo, ModelLogo |
| `components/home/` | Home page only | FilterBar, LeaderboardCard, BarChartLeaderboard, StatsSummary |
| `components/me/` | Personal center | ProfileHero, ContributionHeatmap, PerformanceHighlights |
| `components/model/` | Model-related (shared) | ModelPerformanceTable, ModelsStatsSummary, ProviderComparisonChart |
| `components/provider/` | Provider detail | ProviderModelsTable, ProvidersStatsSummary, SkeletonCard |
| `components/provider-model/` | Provider-model detail | ProviderModelDetailPage, TrendChart |
| `components/user-leaderboard/` | User ranking | UserLeaderboardTable, CommunityStats, HighlightsBar |
| `components/theme/` | Theme management | ThemeProvider, ThemeToggle |
| `components/` (root) | Global layout | Navbar, ScrollRestoration |

## Filter Dimensions

Current frontend supports filtering by:

- `provider` - Provider name
- `model` - Model name (text search)
- `input_length_bucket` - Input token length category
- `range` - Time range (24h, 7d, 30d)

Display labels for input length buckets:
- `short` → "短文本" (0 ~ 4K tokens)
- `medium` → "中文本" (4K ~ 16K tokens)
- `long` → "长文本" (> 16K tokens)

## API Integration

API clients are organized by domain in `lib/api/`:

```typescript
import { fetchLeaderboard, fetchFilterOptions } from '@/lib/api';
import { fetchProviderOverview } from '@/lib/api/providers';
import { fetchModelsCatalog } from '@/lib/api/models';

// With SWR
'use client';
import useSWR from 'swr';

function Component() {
  const { data, isLoading } = useSWR(
    ['leaderboard', timeRange],
    () => fetchLeaderboard({ range: timeRange })
  );
  return <div>{data}</div>;
}
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server on port 3011 |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |

From repo root:

| Command | Description |
|---------|-------------|
| `pnpm dev:frontend` | Start frontend dev server |
| `pnpm build:frontend` | Build frontend for production |
