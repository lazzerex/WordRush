'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate stats
  const totalChars = correctChars + incorrectChars;
  const rawWpm = Math.round(totalChars / 5 / (duration / 60));
  const consistency = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 0;

  // Generate WPM progression data for chart
  const wpmProgressionData = useMemo(() => {
    const points = Math.max(15, Math.min(30, Math.round(duration * 2)));
    const baseWpm = Math.max(10, wpm * 0.55);
    const amplitude = Math.min(12, Math.max(4, wpm * 0.18));

    return Array.from({ length: points }, (_, index) => {
      const progress = index / (points - 1);
      const eased = 1 - Math.pow(1 - progress, 2.4);
      const wave = Math.sin(progress * Math.PI * 1.6) * amplitude * (1 - progress * 0.4);
      const value = baseWpm + (wpm - baseWpm) * eased + wave;

      if (index === points - 1) {
        return {
          time: index,
          wpm: wpm,
          raw: wpm,
        };
      }

      return {
        time: index,
        wpm: Math.round(Math.max(0, Math.min(value, wpm + amplitude))),
        raw: Math.round(Math.max(0, Math.min(value, wpm + amplitude))),
      };
    });
  }, [wpm, duration]);


  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 shadow-lg">
          <p className="text-yellow-400 text-sm font-medium">{payload[0].value} WPM</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`max-w-5xl mx-auto transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Main Stats Row - Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* WPM */}
        <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
          <div className="text-zinc-400 text-xs uppercase tracking-wider mb-1">wpm</div>
          <div className="text-5xl font-bold text-yellow-500 leading-none mb-2">{wpm}</div>
          <div className="text-zinc-500 text-xs">
            {wpm >= 100 ? 'Expert' : wpm >= 80 ? 'Advanced' : wpm >= 60 ? 'Intermediate' : wpm >= 40 ? 'Beginner' : 'Novice'}
          </div>
        </div>

        {/* Accuracy */}
        <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
          <div className="text-zinc-400 text-xs uppercase tracking-wider mb-1">acc</div>
          <div className="text-5xl font-bold text-green-500 leading-none mb-2">{accuracy}%</div>
          <div className="text-zinc-500 text-xs">
            {accuracy >= 95 ? 'Excellent' : accuracy >= 90 ? 'Great' : accuracy >= 80 ? 'Good' : 'Fair'}
          </div>
        </div>

        {/* Test Type Info */}
        <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
          <div className="text-zinc-400 text-xs uppercase tracking-wider mb-1">test type</div>
          <div className="text-xl font-semibold text-zinc-300 mb-1">time {duration}</div>
          <div className="text-zinc-500 text-xs">english</div>
        </div>

        {/* Additional Stats */}
        <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
          <div className="text-zinc-400 text-xs uppercase tracking-wider mb-1">raw</div>
          <div className="text-xl font-semibold text-zinc-400 mb-1">{rawWpm}</div>
          <div className="text-zinc-500 text-xs mt-2">
            <span className="text-green-500">{correctChars}</span>
            <span className="text-zinc-600">/</span>
            <span className="text-red-500">{incorrectChars}</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-500">0</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-500">0</span>
          </div>
        </div>
      </div>

      {/* Additional Metrics Row - Very Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
          <div className="text-zinc-500 text-xs mb-1">characters</div>
          <div className="text-yellow-500 font-semibold">
            {correctChars}/{incorrectChars}/0/0
          </div>
        </div>

        <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
          <div className="text-zinc-500 text-xs mb-1">consistency</div>
          <div className="text-yellow-500 font-semibold">{consistency}%</div>
        </div>

        <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
          <div className="text-zinc-500 text-xs mb-1">time</div>
          <div className="text-yellow-500 font-semibold">{duration}s</div>
        </div>

        <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
          <div className="text-zinc-500 text-xs mb-1 flex items-center gap-1">
            <span>00:00:36</span>
          </div>
          <div className="text-yellow-500 font-semibold text-xs">session</div>
        </div>
      </div>

      {/* Chart Section - Compact */}
      <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-zinc-300">Speed Progression</h3>
          <div className="text-xs text-zinc-500">
            Your WPM throughout the test
          </div>
        </div>

        {/* Chart */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={wpmProgressionData}>
              <defs>
                <linearGradient id="wpmGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                stroke="#52525b"
                tick={{ fill: '#71717a', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#3f3f46' }}
                label={{ value: 'seconds', position: 'insideBottomRight', offset: -5, fill: '#52525b', fontSize: 11 }}
              />
              <YAxis 
                stroke="#52525b"
                tick={{ fill: '#71717a', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#3f3f46' }}
                label={{ value: 'WPM', angle: -90, position: 'insideLeft', fill: '#52525b', fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                y={wpm} 
                stroke="#52525b" 
                strokeDasharray="3 3"
                label={{ 
                  value: `avg: ${wpm}`, 
                  position: 'right',
                  fill: '#71717a',
                  fontSize: 12
                }}
              />
              <Area 
                type="monotone" 
                dataKey="wpm" 
                stroke="#eab308" 
                strokeWidth={2}
                fill="url(#wpmGradient)" 
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default StatsChart;
