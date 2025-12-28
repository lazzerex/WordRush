'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { 
  Users, 
  FileText, 
  TrendingUp, 
  Activity, 
  Shield, 
  Clock,
  Search,
  Trash2,
  Edit,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalTests: number;
  totalCoinsDistributed: number;
  activeUsersToday: number;
  testsToday: number;
  averageWpm: number;
  topPlayers: Array<{
    id: string;
    username: string;
    email: string;
    totalTests: number;
    bestWpm: number;
    coins: number;
  }>;
}

interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
  coins: number;
  elo_rating: number;
  wins: number;
  losses: number;
  matches_played: number;
  is_admin: boolean;
}

interface Result {
  id: string;
  user_id: string;
  wpm: number;
  accuracy: number;
  duration: number;
  created_at: string;
  profiles: { username: string; email: string };
}

interface AuditLog {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: any;
  created_at: string;
  profiles: { username: string; email: string };
}

type Tab = 'overview' | 'users' | 'results' | 'logs';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'results') loadResults();
    if (activeTab === 'logs') loadLogs();
  }, [activeTab, currentPage, searchQuery]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/stats');
      
      if (response.status === 403) {
        router.push('/');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.error || 'Failed to load statistics');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch(
        `/api/admin/users?page=${currentPage}&pageSize=20&search=${searchQuery}`
      );
      const data = await response.json();
      if (data.success) {
        setUsers(data.data.users);
        setTotalPages(data.data.totalPages);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const loadResults = async () => {
    try {
      const response = await fetch(`/api/admin/results?page=${currentPage}&pageSize=50`);
      const data = await response.json();
      if (data.success) {
        setResults(data.data.results);
        setTotalPages(data.data.totalPages);
      }
    } catch (err) {
      console.error('Error loading results:', err);
    }
  };

  const loadLogs = async () => {
    try {
      const response = await fetch(`/api/admin/logs?page=${currentPage}&pageSize=50`);
      const data = await response.json();
      if (data.success) {
        setLogs(data.data.logs);
        setTotalPages(data.data.totalPages);
      }
    } catch (err) {
      console.error('Error loading logs:', err);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        loadUsers();
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  const deleteResult = async (resultId: string) => {
    if (!confirm('Are you sure you want to delete this result?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/results?resultId=${resultId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        loadResults();
      } else {
        alert(data.error || 'Failed to delete result');
      }
    } catch (err) {
      alert('Failed to delete result');
    }
  };

  const toggleAdminRole = async (userId: string, currentIsAdmin: boolean) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          updates: { is_admin: !currentIsAdmin },
        }),
      });
      const data = await response.json();
      if (data.success) {
        loadUsers();
      } else {
        alert(data.error || 'Failed to update user');
      }
    } catch (err) {
      alert('Failed to update user');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 text-zinc-100">
        <Navigation />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="h-12 w-12 rounded-full border-2 border-zinc-700 border-t-yellow-500 animate-spin mx-auto" />
            <p className="mt-4 text-zinc-400">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-900 text-zinc-100">
        <Navigation />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-xl text-red-400">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-yellow-400" />
            <h1 className="text-3xl font-bold text-zinc-50">Admin Dashboard</h1>
          </div>
          <p className="text-zinc-400">Manage users, monitor activity, and view system statistics</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-zinc-700/50">
          {[
            { id: 'overview' as Tab, label: 'Overview', icon: TrendingUp },
            { id: 'users' as Tab, label: 'Users', icon: Users },
            { id: 'results' as Tab, label: 'Results', icon: FileText },
            { id: 'logs' as Tab, label: 'Audit Logs', icon: Clock },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition border-b-2 ${
                activeTab === tab.id
                  ? 'border-yellow-500 text-yellow-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                title="Total Users"
                value={stats.totalUsers.toLocaleString()}
                icon={Users}
                color="blue"
              />
              <StatCard
                title="Total Tests"
                value={stats.totalTests.toLocaleString()}
                icon={FileText}
                color="green"
              />
              <StatCard
                title="Coins Distributed"
                value={stats.totalCoinsDistributed.toLocaleString()}
                icon={TrendingUp}
                color="yellow"
              />
              <StatCard
                title="Active Today"
                value={stats.activeUsersToday.toLocaleString()}
                icon={Activity}
                color="purple"
              />
              <StatCard
                title="Tests Today"
                value={stats.testsToday.toLocaleString()}
                icon={FileText}
                color="pink"
              />
              <StatCard
                title="Average WPM"
                value={`${stats.averageWpm} WPM`}
                icon={TrendingUp}
                color="cyan"
              />
            </div>

            {/* Top Players */}
            <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-3xl p-6">
              <h2 className="text-xl font-semibold mb-4">Top Players</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="text-left py-3 px-4 text-zinc-400 font-medium">Rank</th>
                      <th className="text-left py-3 px-4 text-zinc-400 font-medium">Username</th>
                      <th className="text-left py-3 px-4 text-zinc-400 font-medium">Tests</th>
                      <th className="text-left py-3 px-4 text-zinc-400 font-medium">Best WPM</th>
                      <th className="text-left py-3 px-4 text-zinc-400 font-medium">Coins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topPlayers.map((player, index) => (
                      <tr key={player.id} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                        <td className="py-3 px-4 text-yellow-400 font-semibold">#{index + 1}</td>
                        <td className="py-3 px-4">{player.username}</td>
                        <td className="py-3 px-4">{player.totalTests}</td>
                        <td className="py-3 px-4">{player.bestWpm} WPM</td>
                        <td className="py-3 px-4">{player.coins.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search users by username or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-3 bg-zinc-800/60 border border-zinc-700/50 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-yellow-500/50"
              />
            </div>

            {/* Users Table */}
            <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-700 bg-zinc-900/40">
                      <th className="text-left py-3 px-4 text-zinc-400 font-medium">Username</th>
                      <th className="text-left py-3 px-4 text-zinc-400 font-medium">Email</th>
                      <th className="text-left py-3 px-4 text-zinc-400 font-medium">Coins</th>
                      <th className="text-left py-3 px-4 text-zinc-400 font-medium">ELO</th>
                      <th className="text-left py-3 px-4 text-zinc-400 font-medium">Joined</th>
                      <th className="text-left py-3 px-4 text-zinc-400 font-medium">Admin</th>
                      <th className="text-right py-3 px-4 text-zinc-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                        <td className="py-3 px-4 font-medium">{user.username || 'N/A'}</td>
                        <td className="py-3 px-4 text-zinc-400 text-sm">{user.email}</td>
                        <td className="py-3 px-4">{user.coins.toLocaleString()}</td>
                        <td className="py-3 px-4">{user.elo_rating}</td>
                        <td className="py-3 px-4 text-sm text-zinc-400">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          {user.is_admin ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400">
                              <Shield className="w-3 h-3" />
                              Admin
                            </span>
                          ) : (
                            <span className="text-zinc-600 text-xs">User</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleAdminRole(user.id, user.is_admin)}
                              className="p-2 hover:bg-zinc-700/50 rounded-lg transition"
                              title={user.is_admin ? 'Remove admin' : 'Make admin'}
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteUser(user.id)}
                              className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-700 bg-zinc-900/40">
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium">User</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium">WPM</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium">Accuracy</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium">Duration</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium">Date</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(result => (
                    <tr key={result.id} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{result.profiles.username}</div>
                          <div className="text-xs text-zinc-500">{result.profiles.email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-yellow-400">{result.wpm}</td>
                      <td className="py-3 px-4">{result.accuracy}%</td>
                      <td className="py-3 px-4">{result.duration}s</td>
                      <td className="py-3 px-4 text-sm text-zinc-400">
                        {new Date(result.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end">
                          <button
                            onClick={() => deleteResult(result.id)}
                            className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition"
                            title="Delete result"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-700 bg-zinc-900/40">
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium">Admin</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium">Action</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium">Target</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{log.profiles.username}</div>
                          <div className="text-xs text-zinc-500">{log.profiles.email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-zinc-700/50 rounded text-sm">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-400">
                        {log.target_type ? `${log.target_type}` : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-400">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    green: 'border-green-500/30 bg-green-500/10 text-green-400',
    yellow: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
    purple: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
    pink: 'border-pink-500/30 bg-pink-500/10 text-pink-400',
    cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
  };

  return (
    <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-zinc-400 uppercase tracking-wider">{title}</p>
        <div className={`p-2 rounded-xl border ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-3xl font-bold text-zinc-50">{value}</p>
    </div>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }: any) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-700/50">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-4 py-2 bg-zinc-700/50 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
      >
        Previous
      </button>
      <span className="text-sm text-zinc-400">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-4 py-2 bg-zinc-700/50 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
      >
        Next
      </button>
    </div>
  );
}
