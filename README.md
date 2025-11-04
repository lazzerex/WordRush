# WordRush - Typing Test Application

Try it here: https://word-rush-six.vercel.app/


<img width="1682" height="830" alt="image" src="https://github.com/user-attachments/assets/3310fa52-f359-43f2-b470-f2641b5e93b6" />



## Features

- ⌨️ **Typing Test** - Multiple duration options (15s, 30s, 60s, 120s)
- 👤 **User Accounts** - View your profile and account information
- 🏆 **Global Leaderboard** - Compete with other users and see top scores
- 🔒 **Secure Score Validation** - Server-side validation prevents score manipulation
- 📈 **Statistics Dashboard** - Track your progress over time
- 💰 **WRCoins System** - Earn coins by completing typing tests
- 🛍️ **Theme Shop** - Purchase themes with your earned coins
- 🎨 **Customization** - Apply purchased themes across the entire UI with persistent palettes
- ⚡ **Live Sync** - Navigation coin balance updates instantly after tests and purchases

## 🎮 Gamification Features (NEW!)

### WRCoins System
Earn virtual currency by completing typing tests:
- **15 seconds** → 150 WRCoins
- **30 seconds** → 300 WRCoins
- **60 seconds** → 600 WRCoins
- **120 seconds** → 1200 WRCoins

### Theme Shop
Purchase beautiful themes using your earned coins:
- **Default Dark** (FREE) - Classic dark theme
- **Midnight Blue** (500) - Cool blue theme
- **Forest Green** (500) - Nature-inspired
- **Sunset Orange** (750) - Warm energetic
- **Rose Pink** (750) - Elegant modern
- **Cyberpunk** (1000) - High-contrast neon
- **Light Mode** (1000) - Clean bright theme

### Customization
- Apply purchased themes instantly
- Themes persist across sessions
- Visual theme previews before purchase

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- A Supabase account (free tier is fine)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/lazzerex/WordRush.git
cd WordRush
```

2. Install dependencies:
```bash
npm install
```

3. Set up Supabase:
   - Create a new project in the Supabase dashboard (free tier is fine)
   - Enable email/password authentication
   - From **Project Settings → API**, copy your project URL, anon key, and service role key

4. Configure environment variables:
```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local and add your Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# Required on the server for secure RPC calls (never expose this to the browser)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

5. **Apply the database migrations** (IMPORTANT):
   - In the Supabase SQL Editor, run `database/migrations/gamification-system.sql`
   - Then run `database/migrations/20241104_fix-gamification-rls.sql`
   - These scripts create the WRCoins tables, policies, and secure RPC helpers

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
typing-test/
├── src/
│   ├── app/
│   │   ├── account/          # Account dashboard (auth required)
│   │   ├── api/submit-result/ # Secure score submission API route
│   │   ├── customize/        # Theme management UI
│   │   ├── leaderboard/      # Global leaderboard page
│   │   ├── login/            # Login form
│   │   ├── register/         # Registration form
│   │   ├── results/          # Historical results view
│   │   ├── shop/             # Theme shop
│   │   ├── layout.tsx        # Root layout with theme initializer
│   │   └── page.tsx          # Home page (typing test)
│   ├── components/
│   │   ├── Navigation.tsx    # Top navigation + live coin badge
│   │   ├── ThemeInitializer.tsx # Applies active theme on load
│   │   └── TypingTest/       # Typing test UI, timer, results, etc.
│   ├── lib/
│   │   ├── leaderboard.ts    # Leaderboard helpers
│   │   ├── theme.ts          # CSS variable helpers + persistence
│   │   ├── typingResults.ts  # User stats utilities
│   │   ├── ui-events.ts      # Cross-component event bus (coins/themes)
│   │   └── supabase/
│   │       ├── client.ts     # Supabase browser client
│   │       ├── server.ts     # Supabase server client
│   │       └── admin.ts      # Supabase service-role client
│   └── types/
│       ├── database.ts       # Typed Supabase responses
│       └── leaderboard.ts    # Leaderboard DTOs
├── database/
│   └── migrations/           # SQL migrations for security + gamification
│       ├── gamification-system.sql
│       └── 20241104_fix-gamification-rls.sql
├── public/                   # Static assets
├── scripts/
│   └── test-security.js      # Score-validation regression script
├── middleware.ts             # Auth/session middleware
└── README.md
```

## Authentication Flow

1. **Registration**: Users can create an account with email and password
2. **Login**: Authenticated users can access their account page
3. **Protected Routes**: Account page requires authentication
4. **Session Management**: Automatic session refresh via middleware

## Database Management with DataGrip

Recommended reading before tinkering with the database:
- [Supabase: Connect with external clients](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Managing users via the admin API](https://supabase.com/docs/guides/auth/admin/manage-users)
- [SQL Editor essentials](https://supabase.com/docs/guides/database/sql-editor)

## Security Implementation

### Score Validation System

WordRush implements a **multi-layer security system** to prevent score manipulation and ensure fair competition on the leaderboard.

#### How It Works

**Before**: Scores were calculated on the client and submitted directly to the database  
**After**: Server validates every submission with keystroke tracking 

```
User Types → Track Keystrokes → API Validates → Server Recalculates → Database
```

#### Security Layers

1. **Authentication** - Users must be logged in via Supabase Auth
2. **Keystroke Tracking** - Every keystroke recorded with timestamp
3. **Timing Validation** - Test duration verified (5s minimum tolerance, scales with duration)
4. **Server-Side Recalculation** - WPM/accuracy recalculated from raw data (client values ignored)
5. **Sanity Checks** - WPM ≤ 300, accuracy 0-100%, valid durations only
6. **Row Level Security** - Database blocks direct client inserts

#### Setup Security (Required for Production)

1. **Apply Database Migrations**:
   ```sql
   -- In the Supabase SQL Editor, run the contents of:
   -- database/migrations/gamification-system.sql
   -- database/migrations/20241104_fix-gamification-rls.sql
   ```

2. **Verify Security**:
   ```bash
   # Test locally
   npm run dev
   node scripts/test-security.js
   ```

3. **Test Exploitation Prevention**:
   ```javascript
   // This should FAIL with RLS error:
   const { createClient } = await import('@/lib/supabase/client');
   const supabase = createClient();
   await supabase.from('typing_results').insert([{
     user_id: 'fake', wpm: 999, accuracy: 100,
     correct_chars: 99999, incorrect_chars: 0,
     duration: 30, theme: 'fake'
   }]);
   // Expected: "new row violates row-level security policy" 
   ```

#### What's Protected

✅ Console manipulation blocked  
✅ Direct database access prevented  
✅ Fake scores rejected  
✅ Timing manipulation detected  
✅ Impossible WPM (>300) rejected  
✅ Results immutable after creation

#### Key Files

- `src/app/api/submit-result/route.ts` - Secure API endpoint
- `src/components/TypingTest.tsx` - Keystroke tracking
- `database/migrations/gamification-system.sql` - Core tables, functions, policies
- `database/migrations/20241104_fix-gamification-rls.sql` - Trigger + policy fixes for RLS
- `scripts/test-security.js` - Security test suite

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `node scripts/test-security.js` - Test security measures

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Update Supabase Authentication settings:
   - Add your Vercel URL to Site URL
   - Add redirect URLs for production
5. **Apply database security & gamification migrations**:
   - Go to Supabase SQL Editor
   - Run `database/migrations/gamification-system.sql`
   - Run `database/migrations/20241104_fix-gamification-rls.sql`
   - These enable Row Level Security, coins, and theming triggers

### Security Note

⚠️ **Important**: Before deploying to production, run the migrations from `database/migrations/gamification-system.sql` and `database/migrations/20241104_fix-gamification-rls.sql` in your Supabase project to enable Row Level Security and the gamification system.

**Quick Setup**:
1. Go to Supabase SQL Editor
2. Run both SQL files from `database/migrations/`
3. Verify RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'typing_results';`
4. Test that direct inserts fail (expected behavior)

## Troubleshooting

### Security Issues

**Error: "new row violates row-level security policy"**
- ✅ This is correct! It means security is working
- Users cannot insert directly to database
- All submissions go through the secure API

**Scores not saving**
- Check browser console for errors
- Verify user is authenticated
- Check Supabase logs for RLS errors
- Ensure migration was run successfully

**API returns 400 Bad Request**
- "Invalid timing" - Test duration mismatch
- "Insufficient keystroke data" - Not enough keystrokes for claimed WPM
- "WPM exceeds human capability" - Score > 300 WPM

### General Issues

For other issues, check:
1. Supabase connection is working
2. Environment variables are set correctly
3. User is logged in for protected features
4. Database tables exist and have correct structure

### Gamification Issues

**Coins not showing after test**
- Ensure you're logged in
- Confirm both migration SQL files have been executed
- Verify the `add_coins` function exists in Supabase (`SELECT routine_name FROM information_schema.routines WHERE routine_name = 'add_coins';`)
- Check server logs for RPC errors when `/api/submit-result` runs

**Can't purchase themes**
- Check you have sufficient coins
- Verify `user_themes` table exists
- Ensure RLS policies are set correctly

**Theme not applying**
- Clear browser cache and refresh
- Verify CSS variables are loading
- Check `user_settings` table exists

## 📚 Documentation & Resources

- `database/migrations/gamification-system.sql` – creates the WRCoins tables, functions, and default themes
- `database/migrations/20241104_fix-gamification-rls.sql` – updates triggers, RLS policies, and secure RPC helpers
- `scripts/test-security.js` – quick regression script that exercises the secure result submission flow
- [Supabase Docs – Auth Helpers](https://supabase.com/docs/guides/auth) – reference for managing users with the admin API
- [Supabase Docs – Row Level Security](https://supabase.com/docs/guides/auth/row-level-security) – background on the policies used here

## Future Features

- [x] Save typing test results to database
- [x] User statistics and progress tracking
- [x] Global leaderboard
- [x] Server-side score validation
- [x] WRCoins reward system
- [x] Theme shop and customization
- [ ] Daily login rewards
- [ ] Achievement system
- [ ] Custom word lists
- [ ] Practice mode with specific word categories
- [ ] Social features (friends, challenges)
- [ ] Mobile app version
- [ ] Rate limiting and anti-spam measures

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

If you encounter any issues or have questions, please:
1. Review the setup steps in this README (environment variables + migrations)
2. Inspect Supabase logs for API/migration errors
3. Open an issue on GitHub
4. Contact the maintainers

## Acknowledgments

- Built with [Next.js](https://nextjs.org)
- Authentication powered by [Supabase](https://supabase.com)
- Styled with [Tailwind CSS](https://tailwindcss.com)
- Icons by [Lucide](https://lucide.dev)

---

Made with ❤️ by the WordRush team
