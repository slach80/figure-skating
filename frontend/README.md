# Line Creek FSC Frontend

A modern, production-grade Next.js 14 application for figure skating club management.

## Tech Stack

- **Next.js 14** with App Router
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **TanStack Query (v5)** for data fetching and caching
- **Zustand** for client-side state management
- **Axios** for HTTP requests with interceptors
- **Radix UI** primitives for accessible components
- **Lucide React** for icons

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with providers
│   ├── globals.css        # Global styles
│   └── (dashboard)/       # Dashboard route group
│       ├── layout.tsx     # Dashboard layout with sidebar
│       ├── dashboard/     # Dashboard page
│       ├── members/       # Members management
│       ├── schedule/      # Schedule management
│       └── payments/      # Payments management
├── lib/
│   ├── api.ts            # Axios instance with interceptors
│   └── providers.tsx     # React Query provider wrapper
├── hooks/
│   └── useSkaters.ts     # TanStack Query hooks for skater data
└── types/
    ├── skater.ts         # Skater and membership types
    └── competition.ts    # Competition history types
```

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
```

## API Integration

The frontend connects to the Django backend at `NEXT_PUBLIC_API_URL`. The API client (`src/lib/api.ts`) automatically:

- Attaches Bearer token from localStorage
- Handles 401 responses by clearing tokens and redirecting to login
- Sets appropriate Content-Type headers

## Data Fetching

Use the provided hooks in `src/hooks/useSkaters.ts`:

```typescript
import { useSkaters, useSkater, useSkaterCompetitionHistory } from '@/hooks/useSkaters'

// List members
const { data, isLoading, error } = useSkaters(page)

// Get single member
const { data: member } = useSkater(id)

// Get competition history
const { data: history } = useSkaterCompetitionHistory(id)
```

## Design Philosophy

The interface emphasizes clarity and elegance with a refined minimalist aesthetic:

- **Typography**: Playfair Display for headings, Inter for body
- **Color Palette**: Primary purple (#5B2C91), accent magenta (#D946EF), ice blue accents
- **Layout**: Responsive sidebar navigation with sticky top bar
- **Components**: Status badges, loading states, and error boundaries

## Docker Development

Build and run with Docker:

```bash
docker build -f Dockerfile.dev -t line-creek-frontend .
docker run -p 3000:3000 -v $(pwd):/app line-creek-frontend
```

## License

Proprietary - Line Creek FSC
