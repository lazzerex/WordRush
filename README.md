# WordRush - Typing Test Application

Try it here: https://word-rush-six.vercel.app/


<img width="1682" height="830" alt="image" src="https://github.com/user-attachments/assets/3310fa52-f359-43f2-b470-f2641b5e93b6" />



## Features

-  **User Accounts** - View your profile and account information
- 🏆 **Global Leaderboard** - Compete with other users and see top scores
- 🔒 **Secure Score Validation** - Server-side validation prevents score manipulation
- 📈 **Statistics Dashboard** - (Coming soon) Track your progress over time

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel


- Node.js 18+ installed
- A Supabase account (free tier is fine)
```bash
git clone https://github.com/lazzerex/WordRush.git

2. Install dependencies:
3. Set up Supabase:
   - Follow the detailed guide in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
   - Create a new Supabase project
   - Get your project URL and anon key

4. Configure environment variables:
```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local and add your Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
typing-test/
├── src/
│   ├── app/
│   │   ├── account/          # User account page
│   │   ├── api/
│   │   │   └── submit-result/ # Secure score submission API
│   │   ├── leaderboard/      # Global leaderboard
│   │   ├── login/            # Login page
│   │   ├── register/         # Registration page
│   │   ├── results/          # Test results page
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Home page
│   ├── components/
│   │   ├── Navigation.tsx    # Navigation bar
│   │   └── TypingTest.tsx    # Main typing test component
│   ├── lib/
│   │   ├── leaderboard.ts    # Leaderboard functions
│   │   ├── typingResults.ts  # Results management
│   │   └── supabase/
│   │       ├── client.ts     # Supabase client (browser)
│   │       └── server.ts     # Supabase client (server)
│   └── types/
│       ├── database.ts       # Database types
│       └── leaderboard.ts    # Leaderboard types
├── database/
│   └── secure-typing-results.sql  # Security migration
├── scripts/
│   └── test-security.js      # Security test suite
├── middleware.ts             # Auth middleware
├── .env.local               # Environment variables (not in git)
└── SUPABASE_SETUP.md        # Supabase setup guide
```

## Authentication Flow

1. **Registration**: Users can create an account with email and password
2. **Login**: Authenticated users can access their account page
3. **Protected Routes**: Account page requires authentication
4. **Session Management**: Automatic session refresh via middleware

## Database Management with DataGrip

See the [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) file for detailed instructions on:
- Connecting DataGrip to your Supabase database
- Running SQL queries
- Viewing user data
- Managing authentication tables

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
3. **Timing Validation** - Test duration verified (±2 second tolerance)
4. **Server-Side Recalculation** - WPM/accuracy recalculated from raw data (client values ignored)
5. **Sanity Checks** - WPM ≤ 300, accuracy 0-100%, valid durations only
6. **Row Level Security** - Database blocks direct client inserts

#### Setup Security (Required for Production)

1. **Apply Database Migration**:
   ```sql
   -- In Supabase SQL Editor, run:
   -- database/secure-typing-results.sql
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
- `database/secure-typing-results.sql` - RLS policies
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
5. **Apply database security migration**:
   - Go to Supabase SQL Editor
   - Run the `database/secure-typing-results.sql` migration
   - This enables Row Level Security and prevents score manipulation

### Security Note

⚠️ **Important**: Before deploying to production, run the database migration from `database/secure-typing-results.sql` in your Supabase project to enable Row Level Security and prevent score manipulation.

**Quick Setup**:
1. Go to Supabase SQL Editor
2. Run `database/secure-typing-results.sql`
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

## Future Features

- [x] Save typing test results to database
- [x] User statistics and progress tracking
- [x] Global leaderboard
- [x] Server-side score validation
- [ ] Custom word lists
- [ ] Practice mode with specific word categories
- [ ] Social features (friends, challenges)
- [ ] Dark mode preference persistence
- [ ] Mobile app version
- [ ] Rate limiting and anti-spam measures

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

If you encounter any issues or have questions, please:
1. Check the [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) guide
2. Open an issue on GitHub
3. Contact the maintainers

## Acknowledgments

- Built with [Next.js](https://nextjs.org)
- Authentication powered by [Supabase](https://supabase.com)
- Styled with [Tailwind CSS](https://tailwindcss.com)

---

Made with ❤️ by the WordRush team
