# WordRush 
<p align="center">
   <img width="255" height="255" alt="wordrush" src="https://github.com/user-attachments/assets/880b8bf3-0c84-44a4-8b87-84850fd6c236" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js%2015-black?style=flat&logo=next.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/React%2019-61DAFB?style=flat&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/Tailwind%20CSS%204-38B2AC?style=flat&logo=tailwind-css&logoColor=white"/>
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white"/>
  <img src="https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white"/>
  <img src="https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white"/>
</p>
<p align="center">
  <img src="https://img.shields.io/github/stars/lazzerex/WordRush?style=flat&logo=github"/>
  <img src="https://img.shields.io/github/forks/lazzerex/WordRush?style=flat&logo=github"/>
  <img src="https://img.shields.io/github/contributors/lazzerex/WordRush?style=flat"/>
  <img src="https://img.shields.io/github/issues-pr-raw/lazzerex/WordRush?label=pull%20requests&style=flat&color=yellow"/>
  <img src="https://img.shields.io/github/issues/lazzerex/WordRush?label=issues&style=flat&color=red"/>
  <img src="https://img.shields.io/badge/Live%20Demo-online-brightgreen?style=flat&logo=vercel"/>
  <img src="https://img.shields.io/badge/Real--time-enabled-blue?style=flat&logo=supabase"/>
</p>

<p align="center">
  <strong>A modern, feature-rich typing test application with real-time leaderboards, gamification, and multiplayer duels</strong>
</p>

**Live Demo:** [wordrush-io.vercel.app](https://wordrush-io.vercel.app/)

<img width="1897" height="871" alt="image" src="https://github.com/user-attachments/assets/d8700093-c28f-4b52-be3a-03a7a6c97cf5" />

<img width="1767" height="830" alt="image" src="https://github.com/user-attachments/assets/9ac4537f-616b-4e90-848e-deced8205752" />

<img width="1737" height="822" alt="image" src="https://github.com/user-attachments/assets/4bd8c4c3-3326-48dc-9037-93af64322410" />

<img width="1695" height="832" alt="image" src="https://github.com/user-attachments/assets/414c2a2d-6931-4edc-bcd0-7191a0d25740" />

<img width="1440" height="836" alt="image" src="https://github.com/user-attachments/assets/1b261163-8804-453f-a8d2-a0cdd64370e5" />


## Features

### Core Typing Experience
- **Multiple Durations** - Test your speed at 15s, 30s, 60s, or 120s
- **Real-time Stats** - Live WPM and accuracy tracking
- **Word Highlighting** - Clear visual feedback for correct/incorrect typing
- **Instant Reset** - Quick restart without page reload
- **Multi-language Support** - English and Vietnamese (Beta)

### Competitive Features
- **Global Leaderboard** - Compete with players worldwide
- **Live Updates** - Instant leaderboard refresh using Supabase Realtime
- **Multiplayer Duels** - Real-time simultaneous 1v1 matches with ELO ratings
- **Countdown System** - 3-second countdown when both players ready
- **Statistics Dashboard** - Track your progress over time with charts
- **Daily Streaks** - Maintain consecutive day activity tracking

### Gamification System
- **WRCoins** - Earn currency by completing tests (10 coins per second)
- **Theme Shop** - Purchase beautiful themes with earned coins
- **Customization** - 7+ themes including Cyberpunk, Sunset, and Light Mode
- **Active Users Counter** - See how many players are online

### Admin Management
- **Admin Dashboard** - Comprehensive system monitoring and user management
- **User Moderation** - Promote/demote admins, manage user accounts
- **Result Oversight** - Review and remove suspicious typing results
- **Audit Logging** - Complete trail of all admin actions for accountability
- **Statistics Panel** - Real-time metrics on users, tests, and activity

### Security & Performance
- **Secure Validation** - Advanced server-side score validation prevents cheating
- **Lenient Keystroke Validation** - Natural typing experience with pause support
- **Rate Limiting** - API protection against spam and abuse
- **Redis Caching** - 90% reduction in database queries
- **Optimized Performance** - Fast page loads with Next.js 15
- **Cache Consistency** - Automatic recovery from cache inconsistencies

## Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS 4.x |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth (Email/Password, OAuth) |
| **Real-time** | Supabase Realtime (PostgreSQL pub/sub) |
| **Caching** | Upstash Redis (sorted sets, hashes, rate limiting) |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Deployment** | Vercel |

### Architecture Highlights

- **Instant Real-time Updates**: PostgreSQL LISTEN/NOTIFY via Supabase Realtime
- **High-Performance Caching**: Redis sorted sets with pipeline batching (90% DB load reduction)
- **Intelligent Rate Limiting**: Sliding window algorithm protects against spam and abuse
- **Advanced Anti-Cheat**: Multi-layer keystroke validation with lenient natural typing support
- **Server-Side Validation**: Keystroke tracking and WPM recalculation prevent cheating
- **Row Level Security**: Database-level policies enforce data access controls
- **Cache Consistency**: Automatic detection and recovery from cache inconsistencies
- **Admin System**: Comprehensive management tools with audit logging

**Detailed Documentation:** See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/REDIS.md`](docs/REDIS.md), and [`docs/ADMIN_SYSTEM.md`](docs/ADMIN_SYSTEM.md) for in-depth technical details.

## Quick Start

### Prerequisites
- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Supabase Account** - [Sign up free](https://supabase.com/)
- **Upstash Account** (optional) - [Sign up free](https://upstash.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/lazzerex/WordRush.git
   cd WordRush
   npm install
   ```

2. **Set up Supabase:**
   - Create a new project at [supabase.com/dashboard](https://supabase.com/dashboard)
   - Go to **Project Settings → API** and copy your credentials
   - Enable Email authentication: **Authentication → Providers → Email**

3. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local`:
   ```bash
   # Required
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   
   # Optional (for caching, rate limiting, streaks)
   UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-redis-token
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000)

### Optional: Redis Setup

For enhanced performance and features:

1. Create free Redis database at [console.upstash.com](https://console.upstash.com)
2. Copy REST URL and token to `.env.local`
3. Restart dev server

**Without Redis:**
- ✅ Leaderboard works (slower, direct DB queries)
- ❌ No rate limiting
- ❌ No active users counter
- ❌ No daily streaks

## Project Structure

```
WordRush/
├── src/
│   ├── app/                  # Next.js App Router & pages
│   │   ├── api/              # API routes (active-users, leaderboard, multiplayer, redis-health, submit-result, user, etc.)
│   │   ├── account/          # User dashboard
│   │   ├── customize/        # Theme customization
│   │   ├── leaderboard/      # Global rankings
│   │   ├── multiplayer/      # Multiplayer mode
│   │   ├── shop/             # Theme shop
│   │   ├── results/          # Test results
│   │   ├── login/            # Login page
│   │   ├── register/         # Registration page
│   │   ├── home/             # Home page
│   │   ├── layout.tsx        # App layout
│   │   ├── globals.css       # Global styles
│   │   └── page.tsx          # Main typing test
│   ├── components/           # Shared React components
│   │   ├── TypingTest/       # Typing test UI (Dock, WordsDisplay, etc.)
│   │   ├── Multiplayer/      # Multiplayer UI components
│   │   ├── Navigation.tsx    # Top navigation bar
│   │   ├── StatsChart.tsx    # Progress charts
│   │   ├── ActivityHeatmap.tsx # User activity heatmap
│   │   └── ...               # Other UI components
│   ├── constants/            # Static config (testConfig, etc.)
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Core utilities (leaderboard, ratelimit, redis, session, theme, typingResults, wordPool, supabase)
│   ├── services/             # Business logic (leaderboardCacheService, multiplayerService, typingResultsService, wordPoolService)
│   ├── types/                # TypeScript types
│   └── utils/                # Utility functions
├── database/
│   └── migrations/           # SQL migrations (prod_db, test_db)
├── docs/                     # Documentation
│   ├── ARCHITECTURE.md       # System architecture
│   ├── ELO_SYSTEM.md         # ELO rating details
│   └── REDIS.md              # Redis features guide
├── public/                   # Static assets (favicon, images)
├── scripts/                  # Utility scripts (cache-manager, test-security.js)
├── README.md                 # Project overview
├── SECURITY_AUDIT_REPORT.md  # Security audit
├── SECURITY_TESTING_GUIDE.md # Security testing guide
└── ...
```

## Security Features

WordRush implements **enterprise-grade security** to ensure fair competition:

### Multi-Layer Protection

1. **Authentication Required** - Supabase Auth (email/password, OAuth)
2. **Keystroke Tracking** - Every keystroke timestamped and validated
3. **Lenient Timing Validation** - Server verifies test duration with generous tolerance for natural typing
4. **Smart Pause Detection** - Allows thinking breaks (up to 10s, max 3 per test)
5. **Server-Side Recalculation** - WPM/accuracy computed from raw keystrokes
6. **Sanity Checks** - WPM ≤ 480, accuracy 0-100%, valid durations only
7. **Row Level Security** - PostgreSQL RLS blocks direct client inserts
8. **Rate Limiting** - Sliding window algorithm prevents spam (20 submissions/min)
9. **Flexible Validation** - Supports slow typists (0.5 keystrokes/sec) to fast typists (40 keystrokes/sec)

### Data Flow

```
User Types → Keystrokes Tracked → API Validates → Server Recalculates → Database
                                        ↓
                                  Rate Limit Check
                                  Timing Verification
                                  Sanity Checks
```

### Protected Against

- Console manipulation  
- Direct database insertion  
- Timing manipulation  
- Impossible scores (>480 WPM)  
- Fake keystroke data  
- API spam/abuse  
- Robotic typing patterns

While maintaining natural typing experience with support for:
- Thinking pauses and breaks
- Varied typing speeds (slow to fast)
- Natural rhythm variations
- Correction delays  

### Testing Security

Run the security test suite:
```bash
node scripts/test-security.js
```

Expected output: RLS blocks all unauthorized insertions

## Deployment

### Vercel (Recommended)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Deploy to production"
   git push origin main
   ```

2. **Import to Vercel:**
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "New Project" and import your repository
   - Configure environment variables (see below)
   - Click "Deploy"

3. **Environment Variables:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
   UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-redis-token
   ```

4. **Update Supabase Auth URLs:**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: Add `https://your-app.vercel.app/auth/callback`

5. **Enable Realtime:**
   - Go to Supabase Dashboard → Database → Replication
   - Enable replication for `typing_results` and `multiplayer_match_players` tables

### Other Platforms

Compatible with any Next.js 15 hosting:
- **Netlify**: Add build command `npm run build`
- **Railway**: Auto-deploy from GitHub
- **AWS Amplify**: Use SSR configuration

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint checks |
| `node scripts/test-security.js` | Test security measures |

## Troubleshooting

### Common Issues

<details>
<summary><b>"new row violates row-level security policy"</b></summary>

This is expected! It means security is working correctly.
- Users cannot insert directly to the database
- All submissions must go through the secure API
- Run migrations if this blocks legitimate submissions
</details>

<details>
<summary><b>Scores not saving</b></summary>

1. Check browser console for errors
2. Verify user is authenticated (logged in)
3. Confirm migrations were run in Supabase
4. Check Supabase logs for detailed error messages
</details>

<details>
<summary><b>Rate limit error (429)</b></summary>

You've exceeded the rate limit:
- **Test submissions**: 20 per minute per user
- **Leaderboard API**: 30 per minute per IP
- Wait 60 seconds and try again
</details>

<details>
<summary><b>Leaderboard not updating</b></summary>

1. Check Redis connection (if enabled)
2. Verify Realtime is enabled in Supabase
3. Check browser console for WebSocket errors
4. Ensure `typing_results` table has replication enabled
</details>

<details>
<summary><b>Coins not awarded</b></summary>

1. Verify you're logged in
2. Check migrations were run (`gamification-system.sql`)
3. Verify `add_coins` function exists in Supabase
4. Check server logs for RPC errors
</details>

<details>
<summary><b>Theme not applying</b></summary>

1. Clear browser cache and refresh
2. Check you've purchased the theme
3. Verify `user_settings` and `user_themes` tables exist
4. Inspect CSS variables in browser DevTools
</details>

### Getting Help

If issues persist:
1. Review [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system details
2. Check Supabase logs for detailed error messages
3. Open an issue on GitHub with:
   - Error message
   - Browser console logs
   - Steps to reproduce

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture, data flow, and design decisions |
| [`docs/REDIS.md`](docs/REDIS.md) | Complete Redis features guide with examples |
| [`docs/ELO_SYSTEM.md`](docs/ELO_SYSTEM.md) | ELO rating system implementation |
| `database/migrations/` | SQL migration files for database setup |
| `scripts/test-security.js` | Security validation test suite |

### External Resources

- [Supabase Documentation](https://supabase.com/docs) - Database and auth reference
- [Next.js 15 Docs](https://nextjs.org/docs) - Framework documentation
- [Upstash Redis Docs](https://docs.upstash.com/redis) - Redis client reference
- [Tailwind CSS](https://tailwindcss.com/docs) - Styling reference

## Roadmap

### Completed
- Core typing test with multiple durations
- User authentication and accounts
- Global leaderboard with live updates
- Advanced server-side score validation with lenient keystroke checking
- WRCoins reward system
- Theme shop and customization
- Multiplayer simultaneous duels with countdown
- Real-time match synchronization
- Rate limiting and spam protection
- Daily streak tracking
- Statistics dashboard with charts
- Active users counter
- Cache consistency detection and recovery

### In Progress
- Achievement system
- Mobile responsive improvements
- Performance optimizations

### Planned
- Daily login rewards
- Custom word lists
- Practice mode with categories (code, quotes, common words)
- Social features (friends, challenges)
- Mobile app (React Native)
- Tournament mode (multi-player brackets)
- Leaderboard filtering (by country, time period)
- Profile customization (avatars, badges)
- Spectator mode for multiplayer matches

## Contributing

Contributions are welcome! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and test thoroughly
4. **Commit your changes**: `git commit -m 'Add amazing feature'`
5. **Push to the branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Development Guidelines

- Follow existing code style and conventions
- Write meaningful commit messages
- Update documentation for new features
- Test security implications of changes
- Ensure all TypeScript types are properly defined

## License

This project is open source and available under the [MIT License](LICENSE).

## Support & Community

- **Issues**: [GitHub Issues](https://github.com/lazzerex/WordRush/issues)
- **Discussions**: [GitHub Discussions](https://github.com/lazzerex/WordRush/discussions)
- **Live Demo**: [wordrush-io.vercel.app](https://wordrush-io.vercel.app/)

## Acknowledgments

Built with amazing open-source technologies:

- [Next.js](https://nextjs.org) - React framework
- [Supabase](https://supabase.com) - Backend infrastructure
- [Upstash](https://upstash.com) - Serverless Redis
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Lucide](https://lucide.dev) - Icons
- [Recharts](https://recharts.org) - Charts
- [Vercel](https://vercel.com) - Hosting

---

**Made with by [@lazzerex](https://github.com/lazzerex)**

*If you find this project helpful, consider giving it a star on GitHub!*
