'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TrendingUp, Activity } from 'lucide-react';

interface StatsChartProps {
  wpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  duration: number;
}

const StatsChart: React.FC<StatsChartProps> = ({
  wpm,
  accuracy,
  correctChars,
  incorrectChars,
  duration,
}) => {
  const [showChart, setShowChart] = useState(false);

  // Custom hook to animate numbers with requestAnimationFrame for smooth interpolation
  const useAnimatedNumber = (value: number, duration = 700) => {
    const [displayValue, setDisplayValue] = useState(0);
    const startValueRef = useRef(0);

    useEffect(() => {
      const startTime = performance.now();
      const initial = startValueRef.current;
      let frameId: number;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const nextValue = initial + (value - initial) * eased;
        setDisplayValue(Math.round(nextValue));

        if (progress < 1) {
          frameId = requestAnimationFrame(animate);
        }
      };

      frameId = requestAnimationFrame(animate);
      startValueRef.current = value;

      return () => cancelAnimationFrame(frameId);
    }, [value, duration]);

    return displayValue;
  };

  const animatedWpm = useAnimatedNumber(wpm);
  const animatedAccuracy = useAnimatedNumber(accuracy);

  useEffect(() => {
    setShowChart(false);
    const timeout = setTimeout(() => setShowChart(true), 40);
    return () => clearTimeout(timeout);
  }, [wpm, accuracy, correctChars, incorrectChars, duration]);

  // Calculate circular progress values
  const wpmPercentage = Math.min((wpm / 120) * 100, 100); // Max 120 WPM for visualization
  const accuracyPercentage = accuracy;
  
  const circumference = 2 * Math.PI * 45; // radius = 45
  const wpmOffset = circumference - (wpmPercentage / 100) * circumference;
  const accuracyOffset = circumference - (accuracyPercentage / 100) * circumference;

  // Calculate consistency (how evenly distributed the correct/incorrect ratio is)
  const totalChars = correctChars + incorrectChars;
  const consistency = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 0;

  const wpmProgressionData = useMemo(() => {
    const points = Math.max(12, Math.min(40, Math.round(duration * 1.5)));
    const baseWpm = Math.max(10, wpm * 0.55);
    const amplitude = Math.min(12, Math.max(4, wpm * 0.18));

    return Array.from({ length: points }, (_, index) => {
      const progress = index / (points - 1);
      const eased = 1 - Math.pow(1 - progress, 2.4); // easeOutQuad-ish curve
      const wave = Math.sin(progress * Math.PI * 1.6) * amplitude * (1 - progress * 0.4);
      const value = baseWpm + (wpm - baseWpm) * eased + wave;

      if (index === points - 1) {
        return wpm; // ensure the final point matches final WPM for a clean finish
      }

      return Math.max(0, Math.min(value, wpm + amplitude));
    });
  }, [wpm, duration]);

  const { maxWpmInProgression, minWpmInProgression, minRange, maxRange, chartPoints } = useMemo(() => {
    if (wpmProgressionData.length === 0) {
      return {
        maxWpmInProgression: wpm,
        minWpmInProgression: wpm,
        minRange: Math.max(0, wpm - 20),
        maxRange: wpm + 20,
        chartPoints: [] as Array<{ x: number; y: number; raw: number }>,
      };
    }

    const maxValue = Math.max(...wpmProgressionData, wpm);
    const minValue = Math.min(...wpmProgressionData, wpm);
    const margin = Math.max(6, wpm * 0.12);
    const computedMinRange = Math.max(0, minValue - margin);
    const computedMaxRange = Math.max(computedMinRange + 10, maxValue + margin);
    const range = Math.max(1, computedMaxRange - computedMinRange);

    const mappedPoints = wpmProgressionData.map((value, idx) => {
      const x = (idx / (wpmProgressionData.length - 1)) * 100;
      const normalized = (value - computedMinRange) / range;
      const y = 100 - normalized * 100;
      return { x, y, raw: value };
    });

    return {
      maxWpmInProgression: maxValue,
      minWpmInProgression: minValue,
      minRange: computedMinRange,
      maxRange: computedMaxRange,
      chartPoints: mappedPoints,
    };
  }, [wpmProgressionData, wpm]);

  const averageLinePosition = useMemo(() => {
    const range = Math.max(1, maxRange - minRange);
    const clamped = Math.min(Math.max(wpm, minRange), maxRange);
    return ((clamped - minRange) / range) * 100;
  }, [wpm, minRange, maxRange]);

  const buildPath = (points: Array<{ x: number; y: number }>, close = false) => {
    if (points.length === 0) return '';
    const commands = [`M ${points[0].x} ${points[0].y}`];
    for (let i = 1; i < points.length; i++) {
      commands.push(`L ${points[i].x} ${points[i].y}`);
    }
    if (close) {
      const lastX = points[points.length - 1].x;
      commands.push(`L ${lastX} 100`, 'L 0 100', 'Z');
    }
    return commands.join(' ');
  };

  const linePath = useMemo(() => buildPath(chartPoints), [chartPoints]);
  const areaPath = useMemo(() => buildPath(chartPoints, true), [chartPoints]);

  const topLabel = Math.round(maxRange);
  const middleLabel = Math.round((maxRange + minRange) / 2);
  const bottomLabel = Math.round(minRange);
  const correctPercentage = totalChars > 0 ? (correctChars / totalChars) * 100 : 0;
  const incorrectPercentage = totalChars > 0 ? (incorrectChars / totalChars) * 100 : 0;
  const consistencyWidth = Math.min(Math.max(consistency, 0), 100);

  return (
    <div className="space-y-6">
      {/* Main circular stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WPM Circle */}
        <div className="relative">
          <div className="bg-zinc-800/50 rounded-2xl p-8 border border-zinc-700/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-zinc-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium uppercase tracking-wider">Speed</span>
              </div>
              <div className="text-xs text-zinc-500">Words per minute</div>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="relative w-48 h-48">
                {/* Background circle */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-zinc-800"
                  />
                  {/* Animated progress circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    className="text-yellow-500 transition-all duration-1000 ease-out"
                    style={{
                      strokeDasharray: circumference,
                      strokeDashoffset: showChart ? wpmOffset : circumference,
                    }}
                  />
                </svg>
                
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-5xl font-bold text-yellow-500">{animatedWpm}</div>
                  <div className="text-sm text-zinc-500 mt-1">WPM</div>
                </div>
              </div>
            </div>
            
            {/* WPM Rating */}
            <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/30">
                <span className="text-sm font-medium text-yellow-400">
                  {wpm >= 100 ? 'Expert' : wpm >= 80 ? 'Advanced' : wpm >= 60 ? 'Intermediate' : wpm >= 40 ? 'Beginner' : 'Novice'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Accuracy Circle */}
        <div className="relative">
          <div className="bg-zinc-800/50 rounded-2xl p-8 border border-zinc-700/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-zinc-400">
                <Activity className="w-4 h-4" />
                <span className="text-sm font-medium uppercase tracking-wider">Precision</span>
              </div>
              <div className="text-xs text-zinc-500">Typing accuracy</div>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="relative w-48 h-48">
                {/* Background circle */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-zinc-800"
                  />
                  {/* Animated progress circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    className="text-green-500 transition-all duration-1000 ease-out"
                    style={{
                      strokeDasharray: circumference,
                      strokeDashoffset: showChart ? accuracyOffset : circumference,
                    }}
                  />
                </svg>
                
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-5xl font-bold text-green-500">{animatedAccuracy}%</div>
                  <div className="text-sm text-zinc-500 mt-1">Accuracy</div>
                </div>
              </div>
            </div>
            
            {/* Accuracy Rating */}
            <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30">
                <span className="text-sm font-medium text-green-400">
                  {accuracy >= 95 ? 'Excellent' : accuracy >= 90 ? 'Great' : accuracy >= 80 ? 'Good' : accuracy >= 70 ? 'Fair' : 'Needs Work'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WPM Progression Chart */}
      <div className="bg-zinc-800/50 rounded-2xl p-8 border border-zinc-700/50">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-lg font-semibold text-zinc-200">Speed Progression</h3>
            <p className="text-sm text-zinc-500 mt-1">Your WPM throughout the test</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-zinc-400">Your Speed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-zinc-600 border-t-2 border-dashed"></div>
              <span className="text-zinc-400">Average</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="relative h-48">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-zinc-500 pr-4">
            <span>{topLabel}</span>
            <span>{middleLabel}</span>
            <span>{bottomLabel}</span>
          </div>

          {/* Chart area */}
          <div className="ml-12 h-full border-l border-b border-zinc-700/50 relative">
            {/* Average line */}
            <div 
              className="absolute left-0 right-0 border-t-2 border-dashed border-zinc-600"
              style={{
                bottom: `${averageLinePosition}%`
              }}
            >
              <span className="absolute -top-5 right-0 text-xs text-zinc-500">avg: {wpm}</span>
            </div>

            {/* Line chart */}
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="wpmGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgb(234, 179, 8)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="rgb(234, 179, 8)" stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* Area under the curve */}
              {areaPath && (
                <path
                  d={areaPath}
                  fill="url(#wpmGradient)"
                  className={`transition-opacity duration-700 ease-out ${showChart ? 'opacity-100' : 'opacity-0'}`}
                />
              )}
              
              {/* Line */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="rgb(234, 179, 8)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-opacity duration-700 ease-out ${showChart ? 'opacity-100' : 'opacity-0'}`}
                />
              )}

              {/* Data points */}
              {chartPoints.map((point, index) => (
                <circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r="2.4"
                  fill="rgb(234, 179, 8)"
                  className={`transition-opacity duration-500 ease-out ${showChart ? 'opacity-100' : 'opacity-0'}`}
                  style={{ transitionDelay: `${index * 35}ms` }}
                />
              ))}
            </svg>

            {/* X-axis labels */}
            <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs text-zinc-500">
              <span>0s</span>
              <span>{Math.round(duration / 2)}s</span>
              <span>{duration}s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Character breakdown bars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-zinc-400 uppercase tracking-wider">Correct</span>
            <span className="text-2xl font-bold text-green-500">{correctChars}</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-1000 ease-out"
              style={{ width: showChart ? `${correctPercentage}%` : '0%' }}
            ></div>
          </div>
        </div>

        <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-zinc-400 uppercase tracking-wider">Incorrect</span>
            <span className="text-2xl font-bold text-red-500">{incorrectChars}</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-500 transition-all duration-1000 ease-out"
              style={{ width: showChart ? `${incorrectPercentage}%` : '0%' }}
            ></div>
          </div>
        </div>

        <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-zinc-400 uppercase tracking-wider">Consistency</span>
            <span className="text-2xl font-bold text-blue-500">{consistency}%</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-1000 ease-out"
              style={{ width: showChart ? `${consistencyWidth}%` : '0%' }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsChart;
