'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';

interface AccountClientProps {
  user: User;
}

export default function AccountClient({ user }: AccountClientProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Get username from metadata or use email
  const username = user.user_metadata?.username || user.email?.split('@')[0] || 'User';
  const email = user.email || '';
  const createdAt = new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-indigo-600 hover:text-indigo-700 transition">
            WordRush
          </Link>
          <button
            onClick={handleSignOut}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
          >
            {loading ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-12">
            <div className="flex items-center space-x-6">
              {/* Default Avatar */}
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
                <svg
                  className="w-12 h-12 text-indigo-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>

              {/* User Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">{username}</h1>
                <p className="text-indigo-100">{email}</p>
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="px-8 py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Information</h2>

            <div className="space-y-6">
              {/* User ID */}
              <div className="border-b border-gray-200 pb-4">
                <label className="block text-sm font-medium text-gray-500 mb-1">User ID</label>
                <p className="text-gray-900 font-mono text-sm bg-gray-50 px-3 py-2 rounded">
                  {user.id}
                </p>
              </div>

              {/* Email */}
              <div className="border-b border-gray-200 pb-4">
                <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                <p className="text-gray-900">{email}</p>
              </div>

              {/* Username */}
              <div className="border-b border-gray-200 pb-4">
                <label className="block text-sm font-medium text-gray-500 mb-1">Username</label>
                <p className="text-gray-900">{username}</p>
              </div>

              {/* Account Created */}
              <div className="border-b border-gray-200 pb-4">
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Account Created
                </label>
                <p className="text-gray-900">{createdAt}</p>
              </div>

              {/* Email Verified */}
              <div className="pb-4">
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Email Verified
                </label>
                <div className="flex items-center">
                  {user.email_confirmed_at ? (
                    <>
                      <svg
                        className="w-5 h-5 text-green-500 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-green-700 font-medium">Verified</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5 text-yellow-500 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-yellow-700 font-medium">Not Verified</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex gap-4">
              <Link
                href="/"
                className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition text-center"
              >
                Start Typing Test
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Section (Placeholder for future features) */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
              <div className="text-3xl font-bold text-blue-600 mb-2">0</div>
              <div className="text-gray-700 font-medium">Tests Completed</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl">
              <div className="text-3xl font-bold text-green-600 mb-2">0</div>
              <div className="text-gray-700 font-medium">Avg. WPM</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl">
              <div className="text-3xl font-bold text-purple-600 mb-2">0%</div>
              <div className="text-gray-700 font-medium">Avg. Accuracy</div>
            </div>
          </div>
          <p className="text-center text-gray-500 mt-6 italic">
            Start taking tests to see your statistics!
          </p>
        </div>
      </main>
    </div>
  );
}
