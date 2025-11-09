'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';
import { Users, Plus, Search, Clock, Trophy, Zap } from 'lucide-react';

type TabType = 'find-match' | 'create-room';

export default function MultiplayerPage() {
  const [activeTab, setActiveTab] = useState<TabType>('find-match');
  const [comingSoonVisible, setComingSoonVisible] = useState(false);

  const handleCreateRoom = () => {
    setComingSoonVisible(true);
    setTimeout(() => {
      setComingSoonVisible(false);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-zinc-900 wr-bg-primary wr-text-primary">
      <Navigation />
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 animate-fadeIn">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-blue-500/20 rounded-2xl mb-4 border border-yellow-500/20">
              <Users className="w-10 h-10 text-yellow-500" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-3">Multiplayer</h1>
            <p className="text-lg text-zinc-400">
              Challenge your friends or find worthy opponents
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-3 mb-8 p-2 bg-zinc-800/50 rounded-xl border border-zinc-700/50 animate-slideIn">
            <button
              onClick={() => setActiveTab('find-match')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-medium transition-all duration-300 ${
                activeTab === 'find-match'
                  ? 'bg-yellow-500 text-zinc-900 shadow-lg shadow-yellow-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
              }`}
            >
              <Search className="w-5 h-5" />
              <span>Find Match</span>
            </button>
            <button
              onClick={() => setActiveTab('create-room')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-medium transition-all duration-300 ${
                activeTab === 'create-room'
                  ? 'bg-yellow-500 text-zinc-900 shadow-lg shadow-yellow-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
              }`}
            >
              <Plus className="w-5 h-5" />
              <span>Create Room</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="bg-zinc-800/30 rounded-2xl border border-zinc-700/50 p-8 min-h-[500px] relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />

            {/* Find Match Tab */}
            {activeTab === 'find-match' && (
              <div className="relative z-10 animate-fadeIn">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500/10 rounded-xl mb-4">
                    <Search className="w-8 h-8 text-yellow-500" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">Find a Match</h2>
                  <p className="text-zinc-400">
                    Get matched with players of similar ELO rating
                  </p>
                </div>

                {/* Main Match Card */}
                <div className="mb-8">
                  <div className="group p-8 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 rounded-2xl border-2 border-yellow-500/30 hover:border-yellow-500/50 transition-all cursor-pointer hover:shadow-lg hover:shadow-yellow-500/10">
                    <div className="flex items-center gap-6">
                      <div className="p-4 bg-yellow-500/20 rounded-xl group-hover:bg-yellow-500/30 transition-colors group-hover:scale-110 duration-300">
                        <Zap className="w-10 h-10 text-yellow-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-3xl font-bold text-white mb-2">Ranked Match</h3>
                        <p className="text-zinc-400 mb-3">
                          30 seconds • ELO-based matchmaking
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="px-3 py-1 bg-yellow-500/10 rounded-full text-yellow-500 font-medium">
                            Competitive
                          </div>
                          <div className="px-3 py-1 bg-zinc-700/50 rounded-full text-zinc-400">
                            +/- 15 ELO
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <button className="px-8 py-4 bg-yellow-500 text-zinc-900 rounded-xl font-bold text-lg hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/30 hover:scale-105">
                          Find Match
                        </button>
                        <span className="text-xs text-zinc-500">Click to queue</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Player Stats */}
                <div className="grid grid-cols-4 gap-4 p-6 bg-zinc-900/50 rounded-xl border border-zinc-700/30">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-500 mb-1">--</div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wide">ELO Rating</div>
                  </div>
                  <div className="text-center border-x border-zinc-700/50">
                    <div className="text-2xl font-bold text-green-500 mb-1">--</div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wide">Wins</div>
                  </div>
                  <div className="text-center border-r border-zinc-700/50">
                    <div className="text-2xl font-bold text-red-500 mb-1">--</div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wide">Losses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-1">--%</div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wide">Win Rate</div>
                  </div>
                </div>

                {/* ELO Info */}
                <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Trophy className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-1">ELO Rating System</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Your skill rating adjusts based on match performance. Win against higher-rated players to gain more ELO. Starting rating is 1000.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Create Room Tab */}
            {activeTab === 'create-room' && (
              <div className="relative z-10 animate-fadeIn">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/10 rounded-xl mb-4">
                    <Plus className="w-8 h-8 text-blue-500" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">Create a Room</h2>
                  <p className="text-zinc-400">
                    Set up a private room and invite your friends
                  </p>
                </div>

                {/* Room Settings Preview */}
                <div className="space-y-6 mb-8">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                      Room Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter room name..."
                      className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500/50 transition-colors"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                      Duration
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {[15, 30, 60, 120].map((duration) => (
                        <button
                          key={duration}
                          disabled
                          className="px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-zinc-400 font-medium hover:border-zinc-600/50 transition-colors"
                        >
                          {duration}s
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                      Max Players
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {[2, 4, 6, 8].map((players) => (
                        <button
                          key={players}
                          disabled
                          className="px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-zinc-400 font-medium hover:border-zinc-600/50 transition-colors"
                        >
                          {players}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCreateRoom}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
                >
                  Create Room
                </button>

                {comingSoonVisible && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm rounded-2xl animate-fadeIn">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500/10 rounded-full mb-4">
                        <Clock className="w-8 h-8 text-yellow-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Coming Soon</h3>
                      <p className="text-zinc-400">
                        Room creation feature is under development
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Back Button */}
          <div className="mt-8 text-center">
            <a
              href="/"
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <span>←</span>
              <span>Back to Menu</span>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
