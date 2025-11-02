# WordRush - Typing Test Application

Try it here: https://word-rush-six.vercel.app/

![image](https://github.com/user-attachments/assets/59f66a7d-0c06-4141-8018-f027a726cdc7)

![image](https://github.com/user-attachments/assets/b0a8e8a7-7695-4364-95ab-07fe4184a75f)

![image](https://github.com/user-attachments/assets/abd41966-8758-45f1-9f62-2f45799a1fa3)

![image](https://github.com/user-attachments/assets/7f0b9ad8-66db-43e4-bb23-ff6bd1a2cc5f)

![image](https://github.com/user-attachments/assets/a2362b68-c2de-4f79-858c-b8b1aef18d10)

## Features

- 🎯 **Interactive Typing Test** - Test your typing speed with customizable duration (15s, 30s, 60s, 120s)
- 🎨 **Multiple Themes** - Light, Dark, Sepia, Neon, and Ocean themes
- 📊 **Real-time Stats** - Track WPM, accuracy, and errors as you type
- 🔐 **User Authentication** - Register and login with Supabase
- 👤 **User Accounts** - View your profile and account information
- 📈 **Statistics Dashboard** - (Coming soon) Track your progress over time

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier is fine)
- (Optional) DataGrip or any PostgreSQL client for database management

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
│   │   ├── login/            # Login page
│   │   ├── register/         # Registration page
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Home page
│   ├── components/
│   │   ├── Navigation.tsx    # Navigation bar
│   │   └── TypingTest.tsx    # Main typing test component
│   └── lib/
│       └── supabase/
│           ├── client.ts     # Supabase client (browser)
│           └── server.ts     # Supabase client (server)
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

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

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

## Future Features

- [ ] Save typing test results to database
- [ ] User statistics and progress tracking
- [ ] Global leaderboard
- [ ] Custom word lists
- [ ] Practice mode with specific word categories
- [ ] Social features (friends, challenges)
- [ ] Dark mode preference persistence
- [ ] Mobile app version

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
