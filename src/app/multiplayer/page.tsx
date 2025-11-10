'use client';

import { useMemo, useState } from 'react';
import Navigation from '@/components/Navigation';
import { Users, Plus, Search, Clock, Trophy, Zap, Loader2, Sword } from 'lucide-react';
import { useMultiplayerMatch } from '@/hooks/useMultiplayerMatch';
import { MatchArena } from '@/components/Multiplayer/MatchArena';

type TabType = 'find-match' | 'create-room';

export default function MultiplayerPage() {
  const [activeTab, setActiveTab] = useState<TabType>('find-match');
  const [comingSoonVisible, setComingSoonVisible] = useState(false);
  const {
    phase,
    match,
    me,
    opponent,
    wordSequence,
    error,
    startQueue,
    cancelQueue,
    updatePlayer,
    finalizeMatch,
    resetMatch,
  } = useMultiplayerMatch();

  const handleCreateRoom = () => {
    setComingSoonVisible(true);
    setTimeout(() => {
      setComingSoonVisible(false);
    }, 2500);
  };

  const inMatch = useMemo(
    () => match && me && (phase === 'playing' || phase === 'completed'),
    [match, me, phase]
  );

  if (inMatch && match && me) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white">
        <Navigation />
        <MatchArena
          match={match}
          me={me}
          opponent={opponent ?? null}
          words={wordSequence}
          phase={phase}
          error={error}
          onUpdate={updatePlayer}
          onFinishedLocally={finalizeMatch}
          onBackToLobby={() => {
            resetMatch();
          }}
        />
      </div>
    );
  }

  const isQueueing = phase === 'queueing';
  const isQueued = phase === 'queued';

  return (
    <div className="min-h-screen bg-zinc-900 wr-bg-primary wr-text-primary">
      <Navigation />
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 animate-fadeIn">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-blue-500/20 rounded-2xl mb-4 border border-yellow-500/20">
              <Users className="w-10 h-10 text-yellow-500" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-3">Multiplayer</h1>
            <p className="text-lg text-zinc-400">
              Challenge your friends or find worthy opponents
            </p>
          </div>

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

          <div className="bg-zinc-800/30 rounded-2xl border border-zinc-700/50 p-8 min-h-[500px] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />

            {activeTab === 'find-match' && (
              <div className="relative z-10 animate-fadeIn">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500/10 rounded-xl mb-4">
                    <Sword className="w-8 h-8 text-yellow-500" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">Find a Match</h2>
                  <p className="text-zinc-400">Get matched with players of similar ELO rating</p>
                </div>

                <div className="mb-8">
                  <div className="p-8 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 rounded-2xl border-2 border-yellow-500/30">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      <div className="p-4 bg-yellow-500/20 rounded-xl">
                        <Zap className="w-10 h-10 text-yellow-500" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <h3 className="text-3xl font-bold text-white">Ranked Match</h3>
                        <p className="text-zinc-400">Two 30s runs • ELO-based matchmaking</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-3 py-1 bg-yellow-500/10 rounded-full text-yellow-500 font-medium">
                            Competitive
                          </span>
                          <span className="px-3 py-1 bg-zinc-700/50 rounded-full text-zinc-400">
                            Turn-based duel
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <button
                          onClick={startQueue}
                          disabled={isQueueing || isQueued}
                          className="px-8 py-4 bg-yellow-500 text-zinc-900 rounded-xl font-bold text-lg hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isQueueing ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="animate-spin" size={20} />
                              Matching...
                            </span>
                          ) : isQueued ? (
                            'Searching...'
                          ) : (
                            'Find Match'
                          )}
                        </button>
                        {isQueued && (
                          <button
                            onClick={cancelQueue}
                            className="text-xs text-zinc-400 hover:text-white"
                          >
                            Cancel
                          </button>
                        )}
                        <span className="text-xs text-zinc-500">Click to queue</span>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-sm text-red-300 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-4 gap-4 p-6 bg-zinc-900/50 rounded-xl border border-zinc-700/30">
                  <StatBlock label="ELO Rating" value="--" accent="text-yellow-500" />
                  <StatBlock label="Wins" value="--" accent="text-green-500" bordered />
                  <StatBlock label="Losses" value="--" accent="text-red-500" bordered />
                  <StatBlock label="Win Rate" value="--%" />
                </div>

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

            {activeTab === 'create-room' && (
              <div className="relative z-10 animate-fadeIn">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/10 rounded-xl mb-4">
                    <Plus className="w-8 h-8 text-blue-500" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">Create a Room</h2>
                  <p className="text-zinc-400">Set up a private room and invite your friends</p>
                </div>

                <div className="space-y-6 mb-8">
                  <DisabledField label="Room Name" placeholder="Enter room name..." />
                  <DisabledOptions label="Duration" options={[15, 30, 60, 120].map((value) => `${value}s`)} />
                  <DisabledOptions label="Max Players" options={[2, 4, 6, 8].map((value) => `${value}`)} />
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
                      <p className="text-zinc-400">Room creation feature is under development</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

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

interface StatBlockProps {
  label: string;
  value: string;
  accent?: string;
  bordered?: boolean;
}

function StatBlock({ label, value, accent, bordered }: StatBlockProps) {
  return (
    <div className={`text-center ${bordered ? 'border-x border-zinc-700/50' : ''}`}>
      <div className={`text-2xl font-bold mb-1 ${accent ?? 'text-white'}`}>{value}</div>
      <div className="text-xs text-zinc-500 uppercase tracking-wide">{label}</div>
    </div>
  );
}

interface DisabledFieldProps {
  label: string;
  placeholder: string;
}

function DisabledField({ label, placeholder }: DisabledFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-400 mb-2">{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-500 focus:outline-none"
        disabled
      />
    </div>
  );
}

interface DisabledOptionsProps {
  label: string;
  options: string[];
}

function DisabledOptions({ label, options }: DisabledOptionsProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-400 mb-2">{label}</label>
      <div className="grid grid-cols-4 gap-3">
        {options.map((option) => (
          <button
            key={option}
            disabled
            className="px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-zinc-400 font-medium"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
