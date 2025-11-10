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
  const [isActive, setIsActive] = useState(false);
  const [hasFinished, setHasFinished] = useState(me.is_finished);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const latestStatsRef = useRef({ wpm: 0, accuracy: 100, progress: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  const totalWords = words.length;

  useEffect(() => {
    setCurrentInput('');
    setCurrentWordIndex(0);
    setCorrectChars(0);
    setIncorrectChars(0);
    setTimeLeft(duration);
    setIsActive(false);
    setHasFinished(me.is_finished);
    latestStatsRef.current = { wpm: me.wpm ?? 0, accuracy: me.accuracy ?? 100, progress: me.progress ?? 0 };
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [match.id, duration, me.is_finished]);

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
  }, [isActive, hasFinished, phase]);

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

    if (hasFinished) {
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
  }, [stats.wpm, stats.accuracy, progress, onUpdate, hasFinished]);

  const handleInputChange = (value: string) => {
    if (phase === 'completed') {
      return;
    }

    if (!isActive) {
      setIsActive(true);
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

    const finalStats = calculateStats(correctChars, incorrectChars, duration, 0);

    try {
      await onUpdate({
        wpm: finalStats.wpm,
        accuracy: finalStats.accuracy,
        progress: 1,
        is_finished: true,
      });
    } catch (err) {
      console.error('Failed to submit final stats', err);
    }

    await onFinishedLocally();
  }, [hasFinished, correctChars, incorrectChars, duration, onUpdate, onFinishedLocally]);

  useEffect(() => {
    if (me.is_finished && !hasFinished) {
      setHasFinished(true);
    }
  }, [me.is_finished, hasFinished]);

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

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <div className="max-w-6xl mx-auto py-16 px-4 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Ranked Match</h1>
            <p className="text-zinc-400">Duration: {duration}s • Match ID: {match.id.slice(0, 8)}</p>
          </div>
          <button
            onClick={onBackToLobby}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm"
          >
            Leave Match
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/40 rounded-lg text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 grid-rows-2 gap-4 min-h-[26rem]">
          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
            <h2 className="text-sm uppercase tracking-wide text-zinc-400 mb-2">Opponent Stats</h2>
            <StatGrid wpm={opponentStats.wpm} accuracy={opponentStats.accuracy} progress={opponentStats.progress} result={opponentStats.result} />
          </div>

          <div className="bg-zinc-800/30 border border-zinc-700/40 rounded-xl p-4 overflow-auto">
            <h2 className="text-sm uppercase tracking-wide text-zinc-400 mb-2">Opponent View</h2>
            <WordPreview words={wordsForDisplay} progress={opponentStats.progress} />
          </div>

          <div className="bg-zinc-800/30 border border-zinc-700/40 rounded-xl p-4">
            <h2 className="text-sm uppercase tracking-wide text-zinc-400 mb-2">Your Test</h2>
            <div
              className="mb-4 h-2 bg-zinc-700 rounded-full overflow-hidden"
              title={`Progress ${(meStats.progress * 100).toFixed(0)}%`}
            >
              <div
                className="h-full bg-yellow-500 transition-all duration-300"
                style={{ width: `${Math.min(meStats.progress * 100, 100)}%` }}
              />
            </div>
            <div
              className="h-48 overflow-y-auto border border-zinc-700/40 rounded-lg p-4 bg-zinc-900"
              onClick={() => inputRef.current?.focus()}
            >
              <WordPreview words={wordsForDisplay} progress={progress} currentIndex={currentWordIndex} currentInput={currentInput} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(event) => handleInputChange(event.target.value)}
              className="mt-4 w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 focus:outline-none focus:border-yellow-500"
              placeholder={isActive ? 'Keep typing…' : 'Start typing to begin'}
              disabled={hasFinished || phase === 'completed'}
              autoFocus
            />
            <div className="mt-3 flex items-center justify-between text-sm text-zinc-400">
              <span>Time left: {timeLeft}s</span>
              <button
                onClick={handleFinish}
                className="px-3 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-xs"
                disabled={hasFinished}
              >
                Finish Early
              </button>
            </div>
          </div>

          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
            <h2 className="text-sm uppercase tracking-wide text-zinc-400 mb-2">Your Stats</h2>
            <StatGrid wpm={meStats.wpm} accuracy={meStats.accuracy} progress={meStats.progress} result={meStats.result} />
          </div>
        </div>

        {phase === 'completed' && me.result && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/40 rounded-xl">
            <p className="text-sm">
              Match complete. Result: <span className="font-semibold text-yellow-400 uppercase">{me.result}</span>
            </p>
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
    <div className="flex flex-wrap gap-2 text-lg leading-relaxed">
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
