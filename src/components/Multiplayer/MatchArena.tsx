import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trophy, TrendingDown, Handshake } from 'lucide-react';
import type {
  MultiplayerMatch,
  MultiplayerMatchPlayer,
} from '@/types/database';
import type { QueuePhase } from '@/hooks/useMultiplayerMatch';
import { calculateStats } from '@/components/TypingTest/helpers';
import type { PlayerUpdatePayload } from '@/services/multiplayerService';

interface MatchArenaProps {
  match: MultiplayerMatch;
  me: MultiplayerMatchPlayer;
  opponent: MultiplayerMatchPlayer | null;
  words: string[];
  phase: QueuePhase;
  onUpdate: (updates: PlayerUpdatePayload) => Promise<void>;
  onFinishedLocally: () => Promise<void>;
  onBackToLobby: () => void;
  error?: string | null;
}

const UPDATE_THROTTLE_MS = 400;
const BADGE_BASE = 'px-3 py-1 rounded-full text-xs font-semibold';
const BADGE_STYLES = {
  positive: `${BADGE_BASE} bg-green-500/20 text-green-400`,
  warning: `${BADGE_BASE} bg-yellow-500/20 text-yellow-400`,
  info: `${BADGE_BASE} bg-blue-500/20 text-blue-400`,
  idle: `${BADGE_BASE} bg-zinc-700/50 text-zinc-400`,
} as const;

export function MatchArena({
  match,
  me,
  opponent,
  words,
  phase,
  onUpdate,
  onFinishedLocally,
  onBackToLobby,
  error,
}: MatchArenaProps) {
  const duration = match.duration ?? 30;
  const [currentInput, setCurrentInput] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [correctChars, setCorrectChars] = useState(0);
  const [incorrectChars, setIncorrectChars] = useState(0);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isReady, setIsReady] = useState(me.is_ready);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [hasFinished, setHasFinished] = useState(me.is_finished);
  const [extendedWords, setExtendedWords] = useState<string[]>(words);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestStatsRef = useRef({ wpm: 0, accuracy: 100, progress: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  const isHost = me.is_host;
  const opponentHasFinished = opponent?.is_finished ?? false;
  const myTurn = isHost ? !hasFinished : opponentHasFinished && !hasFinished;
  const opponentInRun = opponent ? !opponent.is_finished && (opponent.progress ?? 0) > 0 : false;
  const opponentReady = opponent?.is_ready ?? false;
  const canType = myTurn && isActive && !hasFinished && phase !== 'completed';

  const totalWords = words.length;

  useEffect(() => {
    setCurrentInput('');
    setCurrentWordIndex(0);
    setCorrectChars(0);
    setIncorrectChars(0);
    setTimeLeft(duration);
    setIsReady(me.is_ready);
    setCountdown(null);
    setIsActive(false);
    setHasFinished(me.is_finished);
    setExtendedWords(words);
    latestStatsRef.current = { wpm: me.wpm ?? 0, accuracy: me.accuracy ?? 100, progress: me.progress ?? 0 };
  }, [match.id, duration, words]);

  useEffect(() => {
    setIsReady(me.is_ready);
  }, [me.is_ready]);

  useEffect(() => {
    setHasFinished(me.is_finished);
    if (me.is_finished) {
      setIsActive(false);
      setCountdown(null);
      setTimeLeft(0);
    }
  }, [me.is_finished]);

  // Countdown from 3 to 0 when it's our turn and we're ready
  useEffect(() => {
    if (!myTurn) {
      if (countdown !== null) {
        setCountdown(null);
      }
      return;
    }

    if (!isReady || isActive || hasFinished || countdown !== null) {
      return;
    }

    setCountdown(3);
  }, [myTurn, isReady, isActive, hasFinished, countdown]);

  // Handle countdown timer
  useEffect(() => {
    if (countdown === null || countdown < 0) {
      return;
    }

    if (countdown === 0) {
      setCountdown(null);
      setIsActive(true);
      if (inputRef.current) {
        inputRef.current.focus();
      }
      return;
    }

    countdownTimerRef.current = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [countdown]);

  // Extend word pool dynamically to prevent running out
  useEffect(() => {
    if (currentWordIndex + 50 >= extendedWords.length && words.length > 0) {
      setExtendedWords(prev => {
        const newWords = [...prev];
        // Add more words by cycling through the original word list
        for (let i = 0; i < 100; i++) {
          newWords.push(words[Math.floor(Math.random() * words.length)]);
        }
        return newWords;
      });
    }
  }, [currentWordIndex, extendedWords.length, words]);

  // Display a fixed window of upcoming words (no scrolling to prevent jumpiness)
  const wordsForDisplay = useMemo(() => {
    if (extendedWords.length === 0) {
      return [];
    }
    // Show current word + next 100 words for a stable display
    return extendedWords.slice(currentWordIndex, currentWordIndex + 100);
  }, [extendedWords, currentWordIndex]);
  
  const previewWords = wordsForDisplay;

  const progress = totalWords > 0 ? Math.min(currentWordIndex / totalWords, 1) : 0;
  const stats = calculateStats(correctChars, incorrectChars, duration, timeLeft);

  useEffect(() => {
    latestStatsRef.current = { wpm: stats.wpm, accuracy: stats.accuracy, progress };

    if (hasFinished || !isActive) {
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        await onUpdate({
          wpm: latestStatsRef.current.wpm,
          accuracy: latestStatsRef.current.accuracy,
          progress: latestStatsRef.current.progress,
        });
      } catch (err) {
        console.error('Failed to push multiplayer progress', err);
      }
    }, UPDATE_THROTTLE_MS);

    return () => clearTimeout(timeout);
  }, [stats.wpm, stats.accuracy, progress, onUpdate, hasFinished, isActive]);

  const handleReady = async () => {
    if (isReady || !myTurn || hasFinished) {
      return;
    }
    setIsReady(true);
    try {
      await onUpdate({ is_ready: true });
    } catch (err) {
      console.error('Failed to mark ready', err);
    }
  };

  const handleInputChange = (value: string) => {
    if (phase === 'completed' || !isActive || countdown !== null || !myTurn) {
      return;
    }

    if (hasFinished) {
      return;
    }

    if (value.endsWith(' ')) {
      const typedWord = value.trim();
      const expectedWord = words[currentWordIndex] ?? '';
      const isCorrect = typedWord === expectedWord;

      if (isCorrect) {
        setCorrectChars((prev) => prev + expectedWord.length + 1);
      } else {
        const overlap = Math.min(typedWord.length, expectedWord.length);
        setCorrectChars((prev) => prev + overlap);
        setIncorrectChars((prev) => prev + Math.abs(typedWord.length - expectedWord.length) + 1);
      }

      setCurrentWordIndex((prev) => prev + 1);
      setCurrentInput('');
    } else {
      setCurrentInput(value);
    }
  };

  const handleFinish = useCallback(async () => {
    if (hasFinished) {
      return;
    }
    setHasFinished(true);
    setIsActive(false);
    setTimeLeft(0);
    setCurrentWordIndex(totalWords);
    setCountdown(null);
    setIsReady(false);
    setCurrentInput('');

    const finalStats = calculateStats(correctChars, incorrectChars, duration, 0);

    try {
      await onUpdate({
        wpm: finalStats.wpm,
        accuracy: finalStats.accuracy,
        progress: 1,
        is_finished: true,
        is_ready: false,
      });
    } catch (err) {
      console.error('Failed to submit final stats', err);
    }

    if (!opponent || opponentHasFinished) {
      await onFinishedLocally();
    }
  }, [hasFinished, correctChars, incorrectChars, duration, onUpdate, onFinishedLocally, opponent, opponentHasFinished, totalWords]);

  // Main game timer
  useEffect(() => {
    if (hasFinished || phase === 'completed') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (!isActive) {
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current as NodeJS.Timeout);
          timerRef.current = null;
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive, hasFinished, phase, handleFinish]);

  const meStats = {
    wpm: me.wpm ?? latestStatsRef.current.wpm,
    accuracy: me.accuracy ?? latestStatsRef.current.accuracy,
    progress: me.progress ?? latestStatsRef.current.progress,
    result: me.result,
  };

  const opponentStats = {
    wpm: opponent?.wpm ?? 0,
    accuracy: opponent?.accuracy ?? 0,
    progress: opponent?.progress ?? 0,
    result: opponent?.result,
  };

  // Current word is always at index 0 since we're showing from currentWordIndex
  const myPreviewCurrentIndex = 0;
  const myCompletedWords = 0; // No completed words shown (they're already typed)
  const opponentProgress = Math.floor(((opponentStats.progress ?? 0) * totalWords) + 1e-6);
  const opponentCompletedWords = Math.max(0, opponentProgress - currentWordIndex);
  const myDisplayName = me.display_name ?? 'You';
  const opponentDisplayName = opponent?.display_name ?? (opponent ? `Player ${opponent.user_id.slice(0, 8)}` : 'Waiting for opponent');
  const opponentCopyName = opponent?.display_name ?? 'your opponent';

  let myStatus: { label: string; variant: keyof typeof BADGE_STYLES };
  if (phase === 'completed' || hasFinished) {
    myStatus = { label: 'Completed', variant: 'positive' };
  } else if (!myTurn) {
    myStatus = { label: isHost ? 'Awaiting opponent' : 'Waiting for turn', variant: 'idle' };
  } else if (isActive) {
    myStatus = { label: 'Typing', variant: 'warning' };
  } else if (isReady) {
    myStatus = { label: 'Ready', variant: 'info' };
  } else {
    myStatus = { label: 'Your turn', variant: 'idle' };
  }

  let opponentStatus: { label: string; variant: keyof typeof BADGE_STYLES };
  if (!opponent) {
    opponentStatus = { label: 'Matching...', variant: 'idle' };
  } else if (phase === 'completed' || opponent.is_finished) {
    opponentStatus = { label: 'Completed', variant: 'positive' };
  } else if (opponentInRun) {
    opponentStatus = { label: 'Typing', variant: 'warning' };
  } else if (opponentReady) {
    opponentStatus = { label: 'Ready', variant: 'info' };
  } else if (isHost && !hasFinished) {
    opponentStatus = { label: 'Up next', variant: 'idle' };
  } else if (!isHost && !opponentHasFinished) {
    opponentStatus = { label: 'Playing', variant: 'warning' };
  } else {
    opponentStatus = { label: 'Waiting', variant: 'idle' };
  }

  const showCountdown = countdown !== null && countdown >= 0;
  const inputDisabled = !canType;
  const inputPlaceholder = !myTurn
    ? 'Waiting for your turn...'
    : hasFinished || phase === 'completed'
      ? 'Run complete'
      : !isReady
        ? 'Click Ready Up to begin'
        : !isActive
          ? 'Countdown in progress...'
          : 'Type here...';
  const turnHint = (() => {
    if (phase === 'completed') {
      return null;
    }
    if (hasFinished) {
      return opponentHasFinished ? 'Run complete. Awaiting results.' : `Run complete. Waiting for ${opponentCopyName}'s run.`;
    }
    if (!myTurn) {
      return isHost
        ? `Waiting for ${opponentCopyName} to play their run.`
        : `${opponentCopyName.charAt(0).toUpperCase()}${opponentCopyName.slice(1)} is setting the pace. You will go next.`;
    }
    if (!isReady) {
      return 'Click Ready Up when you are prepared to start your run.';
    }
    if (!isActive) {
      return 'Get set! Your run starts as soon as the countdown hits zero.';
    }
    return null;
  })();

  const headerHint = phase === 'completed'
    ? 'Match complete. Review the results below.'
    : isHost
      ? hasFinished
        ? `Your run is logged. Waiting for ${opponentCopyName} to respond.`
        : 'You set the pace first. Finish your run to set the benchmark.'
      : opponentHasFinished
        ? 'Your run now determines the outcome.'
        : `${opponentCopyName.charAt(0).toUpperCase()}${opponentCopyName.slice(1)} plays first. Stay ready to begin after they finish.`;

  return (
    <div className="pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Ranked Match</h1>
            <p className="text-sm text-zinc-400">Duration: {duration}s • Match ID: {match.id.slice(0, 8)}</p>
            <p className="text-sm text-zinc-300 mt-1">You vs. {opponentDisplayName}</p>
            <p className="text-xs text-zinc-500 mt-1">{headerHint}</p>
          </div>
          <button
            onClick={onBackToLobby}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-white"
          >
            Leave Match
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/40 rounded-lg text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Countdown Overlay */}
        {showCountdown && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-9xl font-bold text-yellow-500 animate-pulse">
                {countdown}
              </div>
              <p className="text-xl text-zinc-300 mt-4">Your run starts in...</p>
            </div>
          </div>
        )}

        {/* Main Split View */}
        <div className="grid grid-cols-2 gap-6">
          {/* Opponent Side */}
          <div className="space-y-4">
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">{opponentDisplayName}</h2>
                  {opponent && (
                    <p className="text-xs text-zinc-500">Opponent</p>
                  )}
                </div>
                <span className={BADGE_STYLES[opponentStatus.variant]}>
                  {opponentStatus.label}
                </span>
              </div>
              <StatGrid wpm={opponentStats.wpm} accuracy={opponentStats.accuracy} progress={opponentStats.progress} result={opponentStats.result} />
            </div>

            <div className="bg-zinc-800/30 border border-zinc-700/40 rounded-xl p-4 h-64 overflow-auto">
              <h3 className="text-xs uppercase tracking-wide text-zinc-500 mb-3">Opponent Progress</h3>
              <WordPreview
                words={words.slice(0, 100)}
                completedWordCount={opponentProgress}
                showAllWords={true}
              />
            </div>
          </div>

          {/* Your Side */}
          <div className="space-y-4">
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">You</h2>
                  <p className="text-xs text-zinc-500">{myDisplayName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={BADGE_STYLES[myStatus.variant]}>{myStatus.label}</span>
                  {myTurn && !hasFinished && !isReady && (
                    <button
                      onClick={handleReady}
                      disabled={!myTurn || countdown !== null || isActive}
                      className="px-4 py-2 bg-yellow-500 text-zinc-900 rounded-lg font-semibold text-sm hover:bg-yellow-400 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Ready Up
                    </button>
                  )}
                </div>
              </div>
              <StatGrid wpm={meStats.wpm} accuracy={meStats.accuracy} progress={meStats.progress} result={meStats.result} />
            </div>

            <div className="bg-zinc-800/30 border border-zinc-700/40 rounded-xl p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-wide text-zinc-500">Your Test</h3>
                <span className="text-sm font-semibold text-white">{timeLeft}s</span>
              </div>
              <div
                className="mb-3 h-2 bg-zinc-700 rounded-full overflow-hidden"
                title={`Progress ${(meStats.progress * 100).toFixed(0)}%`}
              >
                <div
                  className="h-full bg-yellow-500 transition-all duration-300"
                  style={{ width: `${Math.min(meStats.progress * 100, 100)}%` }}
                />
              </div>
              {turnHint && (
                <div className="mb-3 px-3 py-2 bg-zinc-800/60 border border-zinc-700/60 rounded-lg text-xs text-zinc-300">
                  {turnHint}
                </div>
              )}
              <div
                className="h-40 overflow-y-auto border border-zinc-700/40 rounded-lg p-3 bg-zinc-900 mb-3"
                onClick={() => inputRef.current?.focus()}
              >
                <WordPreview
                  words={previewWords}
                  completedWordCount={myCompletedWords}
                  currentIndex={myPreviewCurrentIndex}
                  currentInput={myPreviewCurrentIndex !== undefined ? currentInput : undefined}
                  showAllWords={false}
                />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={currentInput}
                onChange={(event) => handleInputChange(event.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 focus:outline-none focus:border-yellow-500 text-white disabled:opacity-50"
                placeholder={inputPlaceholder}
                disabled={inputDisabled}
                autoFocus
              />
            </div>
          </div>
        </div>

        {/* Match Result */}
        {phase === 'completed' && (me.result || opponent?.result) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/90 backdrop-blur-md animate-fadeIn">
            <div className="max-w-4xl w-full mx-4 p-10 bg-zinc-800/60 border border-zinc-700/50 rounded-3xl shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)] backdrop-blur-md animate-scaleIn">
              <div className="text-center mb-10">
                <h3 className="text-4xl font-bold text-zinc-50 mb-6">Match Complete!</h3>
                {me.result === 'win' && (
                  <ResultBanner
                    tone="positive"
                    title="Victory!"
                    icon={<Trophy className="w-16 h-16" />}
                  />
                )}
                {me.result === 'loss' && (
                  <ResultBanner
                    tone="negative"
                    title="Better luck next time!"
                    icon={<TrendingDown className="w-16 h-16" />}
                  />
                )}
                {me.result === 'draw' && (
                  <ResultBanner
                    tone="warning"
                    title="It's a draw!"
                    icon={<Handshake className="w-16 h-16" />}
                  />
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* You */}
                <div className={`p-8 rounded-2xl transition-all backdrop-blur-sm ${
                  me.result === 'win' 
                    ? 'bg-green-500/10 border-2 border-green-500/40 shadow-[0_15px_40px_-20px_rgba(34,197,94,0.4)]' 
                    : me.result === 'loss' 
                    ? 'bg-red-500/5 border border-red-500/30' 
                    : 'bg-yellow-500/10 border border-yellow-500/30'
                }`}>
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">You ({myDisplayName})</p>
                  <p className="text-6xl font-bold text-zinc-50 mb-2">{Math.round(meStats.wpm)}</p>
                  <p className="text-sm text-zinc-400 mb-6">WPM</p>
                  <div className="space-y-3 border-t border-zinc-700/50 pt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Accuracy</span>
                      <span className="text-zinc-50 font-semibold">{Math.round(meStats.accuracy)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Progress</span>
                      <span className="text-zinc-50 font-semibold">{Math.round(meStats.progress * 100)}%</span>
                    </div>
                  </div>
                  <div className={`mt-6 px-4 py-2.5 rounded-xl text-center text-xs font-bold uppercase tracking-[0.3em] ${
                    me.result === 'win' 
                      ? 'bg-green-500/90 text-white' 
                      : me.result === 'loss'
                      ? 'bg-red-500/90 text-white'
                      : 'bg-yellow-500/90 text-zinc-900'
                  }`}>
                    {me.result || 'pending'}
                  </div>
                </div>

                {/* Opponent */}
                <div className={`p-8 rounded-2xl transition-all backdrop-blur-sm ${
                  opponent?.result === 'win' 
                    ? 'bg-green-500/10 border-2 border-green-500/40 shadow-[0_15px_40px_-20px_rgba(34,197,94,0.4)]' 
                    : opponent?.result === 'loss' 
                    ? 'bg-red-500/5 border border-red-500/30' 
                    : 'bg-yellow-500/10 border border-yellow-500/30'
                }`}>
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">{opponentDisplayName}</p>
                  <p className="text-6xl font-bold text-zinc-50 mb-2">{Math.round(opponentStats.wpm)}</p>
                  <p className="text-sm text-zinc-400 mb-6">WPM</p>
                  <div className="space-y-3 border-t border-zinc-700/50 pt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Accuracy</span>
                      <span className="text-zinc-50 font-semibold">{Math.round(opponentStats.accuracy)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Progress</span>
                      <span className="text-zinc-50 font-semibold">{Math.round(opponentStats.progress * 100)}%</span>
                    </div>
                  </div>
                  <div className={`mt-6 px-4 py-2.5 rounded-xl text-center text-xs font-bold uppercase tracking-[0.3em] ${
                    opponent?.result === 'win' 
                      ? 'bg-green-500/90 text-white' 
                      : opponent?.result === 'loss'
                      ? 'bg-red-500/90 text-white'
                      : 'bg-yellow-500/90 text-zinc-900'
                  }`}>
                    {opponent?.result || 'pending'}
                  </div>
                </div>
              </div>

              <button
                onClick={onBackToLobby}
                className="w-full px-6 py-3.5 bg-yellow-500/90 hover:bg-yellow-400 text-zinc-900 rounded-2xl font-bold text-base transition-smooth hover:scale-105"
              >
                Return to Lobby
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatGridProps {
  wpm: number;
  accuracy: number;
  progress: number;
  result?: string | null;
}

interface ResultBannerProps {
  tone: 'positive' | 'negative' | 'warning';
  title: string;
  icon: React.ReactNode;
}

function ResultBanner({ tone, title, icon }: ResultBannerProps) {
  const toneColors: Record<ResultBannerProps['tone'], string> = {
    positive: 'text-green-400',
    negative: 'text-red-400',
    warning: 'text-yellow-400',
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${toneColors[tone]}`}>
      <div className="drop-shadow-lg">
        {icon}
      </div>
      <p className="text-2xl font-semibold">
        {title}
      </p>
    </div>
  );
}

function StatGrid({ wpm, accuracy, progress, result }: StatGridProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-zinc-400">WPM</span>
        <span className="text-white font-semibold">{Math.round(wpm || 0)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-zinc-400">Accuracy</span>
        <span className="text-white font-semibold">{Math.round(accuracy || 0)}%</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-zinc-400">Progress</span>
        <span className="text-white font-semibold">{Math.round(progress * 100)}%</span>
      </div>
      {result && (
        <div className="text-xs uppercase tracking-wide text-yellow-400">{result}</div>
      )}
    </div>
  );
}

interface WordPreviewProps {
  words: string[];
  completedWordCount: number;
  currentIndex?: number;
  currentInput?: string;
  showAllWords?: boolean;
}

function WordPreview({ words, completedWordCount, currentIndex, currentInput, showAllWords = true }: WordPreviewProps) {
  if (!words.length) {
    return <div className="text-sm text-zinc-500">Waiting for word sequence…</div>;
  }

  const clampedCompleted = Math.max(0, Math.min(words.length, Math.floor(completedWordCount)));

  return (
    <div className="flex flex-wrap gap-2 text-base leading-relaxed">
      {words.map((word, index) => {
        const completed = index < clampedCompleted;
        const isCurrent = currentIndex === index;
        
        // If showAllWords is false (your board), hide completed words
        // If showAllWords is true (opponent board), show all words
        if (!showAllWords && completed && !isCurrent) {
          return null;
        }
        
        return (
          <span
            key={`${word}-${index}`}
            className={`px-1 rounded transition-colors ${completed ? 'bg-green-500/20 text-green-400' : isCurrent ? 'bg-yellow-500/20 text-yellow-400' : 'text-zinc-300'}`}
          >
            {isCurrent && currentInput !== undefined ? (
              <>
                <span className="text-white">{currentInput}</span>
                <span className="opacity-40">{word.slice(currentInput.length)}</span>
              </>
            ) : (
              word
            )}
          </span>
        );
      })}
    </div>
  );
}
