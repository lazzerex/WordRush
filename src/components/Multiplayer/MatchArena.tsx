import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    latestStatsRef.current = { wpm: me.wpm ?? 0, accuracy: me.accuracy ?? 100, progress: me.progress ?? 0 };
  }, [match.id, duration]);

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
  const wordsForDisplay = useMemo(() => {
    if (totalWords === 0) {
      return [];
    }
    return words.slice(0, 120);
  }, [words, totalWords]);

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
      return opponentHasFinished ? 'Run complete. Awaiting results.' : "Run complete. Waiting for your opponent's run.";
    }
    if (!myTurn) {
      return isHost
        ? 'Waiting for your opponent to play their run.'
        : 'Your opponent is setting the pace. You will go next.';
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
        ? 'Your run is logged. Waiting for your opponent to respond.'
        : 'You set the pace first. Finish your run to set the benchmark.'
      : opponentHasFinished
        ? 'Your run now determines the outcome.'
        : 'Opponent plays first. Stay ready to begin after they finish.';

  return (
    <div className="pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Ranked Match</h1>
            <p className="text-sm text-zinc-400">Duration: {duration}s • Match ID: {match.id.slice(0, 8)}</p>
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
                <h2 className="text-lg font-bold text-white">Opponent</h2>
                <span className={BADGE_STYLES[opponentStatus.variant]}>
                  {opponentStatus.label}
                </span>
              </div>
              <StatGrid wpm={opponentStats.wpm} accuracy={opponentStats.accuracy} progress={opponentStats.progress} result={opponentStats.result} />
            </div>

            <div className="bg-zinc-800/30 border border-zinc-700/40 rounded-xl p-4 h-64 overflow-auto">
              <h3 className="text-xs uppercase tracking-wide text-zinc-500 mb-3">Opponent Progress</h3>
              <WordPreview words={wordsForDisplay.slice(0, 40)} progress={opponentStats.progress} />
            </div>
          </div>

          {/* Your Side */}
          <div className="space-y-4">
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">You</h2>
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
                <WordPreview words={wordsForDisplay.slice(0, 40)} progress={progress} currentIndex={currentWordIndex} currentInput={currentInput} />
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/90 backdrop-blur-sm">
            <div className="max-w-3xl w-full mx-4 p-8 bg-zinc-800 border border-zinc-700 rounded-2xl shadow-2xl">
              <div className="text-center mb-8">
                <h3 className="text-4xl font-bold text-white mb-2">Match Complete!</h3>
                {me.result === 'win' && (
                  <p className="text-2xl text-green-400 font-semibold animate-pulse">🎉 Victory!</p>
                )}
                {me.result === 'loss' && (
                  <p className="text-2xl text-red-400 font-semibold">💪 Better luck next time!</p>
                )}
                {me.result === 'draw' && (
                  <p className="text-2xl text-yellow-400 font-semibold">🤝 It's a Draw!</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-6 mb-8">
                {/* You */}
                <div className={`p-6 rounded-xl transition-all ${
                  me.result === 'win' 
                    ? 'bg-green-500/20 border-2 border-green-500/60 shadow-lg shadow-green-500/20' 
                    : me.result === 'loss' 
                    ? 'bg-red-500/10 border border-red-500/40' 
                    : 'bg-yellow-500/10 border border-yellow-500/40'
                }`}>
                  <p className="text-sm text-zinc-400 mb-2 uppercase tracking-wide">You</p>
                  <p className="text-5xl font-bold text-white mb-3">{Math.round(meStats.wpm)}</p>
                  <p className="text-sm text-zinc-400 mb-4">WPM</p>
                  <div className="flex justify-between text-sm border-t border-zinc-700/50 pt-3">
                    <span className="text-zinc-400">Accuracy</span>
                    <span className="text-white font-semibold">{Math.round(meStats.accuracy)}%</span>
                  </div>
                  <div className={`mt-4 px-3 py-2 rounded-lg text-center text-sm font-bold uppercase tracking-wider ${
                    me.result === 'win' 
                      ? 'bg-green-500 text-white' 
                      : me.result === 'loss'
                      ? 'bg-red-500 text-white'
                      : 'bg-yellow-500 text-zinc-900'
                  }`}>
                    {me.result || 'pending'}
                  </div>
                </div>

                {/* Opponent */}
                <div className={`p-6 rounded-xl transition-all ${
                  opponent?.result === 'win' 
                    ? 'bg-green-500/20 border-2 border-green-500/60 shadow-lg shadow-green-500/20' 
                    : opponent?.result === 'loss' 
                    ? 'bg-red-500/10 border border-red-500/40' 
                    : 'bg-yellow-500/10 border border-yellow-500/40'
                }`}>
                  <p className="text-sm text-zinc-400 mb-2 uppercase tracking-wide">Opponent</p>
                  <p className="text-5xl font-bold text-white mb-3">{Math.round(opponentStats.wpm)}</p>
                  <p className="text-sm text-zinc-400 mb-4">WPM</p>
                  <div className="flex justify-between text-sm border-t border-zinc-700/50 pt-3">
                    <span className="text-zinc-400">Accuracy</span>
                    <span className="text-white font-semibold">{Math.round(opponentStats.accuracy)}%</span>
                  </div>
                  <div className={`mt-4 px-3 py-2 rounded-lg text-center text-sm font-bold uppercase tracking-wider ${
                    opponent?.result === 'win' 
                      ? 'bg-green-500 text-white' 
                      : opponent?.result === 'loss'
                      ? 'bg-red-500 text-white'
                      : 'bg-yellow-500 text-zinc-900'
                  }`}>
                    {opponent?.result || 'pending'}
                  </div>
                </div>
              </div>

              <button
                onClick={onBackToLobby}
                className="w-full px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-zinc-900 rounded-xl font-bold text-lg transition-colors"
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
  progress: number;
  currentIndex?: number;
  currentInput?: string;
}

function WordPreview({ words, progress, currentIndex, currentInput }: WordPreviewProps) {
  if (!words.length) {
    return <div className="text-sm text-zinc-500">Waiting for word sequence…</div>;
  }

  return (
    <div className="flex flex-wrap gap-2 text-base leading-relaxed">
      {words.map((word, index) => {
        const completed = progress >= (index + 1) / words.length;
        const isCurrent = currentIndex === index;
        return (
          <span
            key={`${word}-${index}`}
            className={`px-1 rounded ${completed ? 'bg-green-500/20 text-green-400' : isCurrent ? 'bg-yellow-500/20 text-yellow-400' : 'text-zinc-300'}`}
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
