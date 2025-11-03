'use client';

import React, { useMemo } from 'react';
import type { TypingResult } from '@/types/database';

interface ActivityHeatmapProps {
  results: TypingResult[];
}

interface DayData {
  date: string;
  count: number;
  tests: TypingResult[];
}

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ results }) => {
  const heatmapData = useMemo(() => {
    // Get the last 12 months of data
    const today = new Date();
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - 12);
    
    // Create a map of dates to test counts
    const dateMap = new Map<string, DayData>();
    
    // Initialize all days in the range
    const currentDate = new Date(startDate);
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dateMap.set(dateStr, { date: dateStr, count: 0, tests: [] });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Fill in the actual test data
    results.forEach((result) => {
      const dateStr = new Date(result.created_at).toISOString().split('T')[0];
      const dayData = dateMap.get(dateStr);
      if (dayData) {
        dayData.count++;
        dayData.tests.push(result);
      }
    });
    
    return Array.from(dateMap.values());
  }, [results]);

  const weeks = useMemo(() => {
    const weeksArray: DayData[][] = [];
    let currentWeek: DayData[] = [];
    
    heatmapData.forEach((day, index) => {
      const date = new Date(day.date);
      const dayOfWeek = date.getDay();
      
      // Start a new week on Sunday (0)
      if (index === 0) {
        // Fill in empty days at the start
        for (let i = 0; i < dayOfWeek; i++) {
          currentWeek.push({ date: '', count: 0, tests: [] });
        }
      }
      
      currentWeek.push(day);
      
      // End of week (Saturday = 6)
      if (dayOfWeek === 6) {
        weeksArray.push(currentWeek);
        currentWeek = [];
      }
    });
    
    // Add remaining days
    if (currentWeek.length > 0) {
      // Fill in empty days at the end
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', count: 0, tests: [] });
      }
      weeksArray.push(currentWeek);
    }
    
    return weeksArray;
  }, [heatmapData]);

  const getColorIntensity = (count: number) => {
    if (count === 0) return 'bg-zinc-800/50';
    if (count === 1) return 'bg-cyan-900/60';
    if (count === 2) return 'bg-cyan-700/70';
    if (count === 3) return 'bg-cyan-600/80';
    if (count >= 4) return 'bg-cyan-500';
    return 'bg-zinc-800/50';
  };

  const months = useMemo(() => {
    const monthsArray: { name: string; startWeek: number }[] = [];
    let currentMonth = -1;
    
    weeks.forEach((week, weekIndex) => {
      week.forEach((day) => {
        if (day.date) {
          const date = new Date(day.date);
          const month = date.getMonth();
          
          if (month !== currentMonth) {
            currentMonth = month;
            monthsArray.push({
              name: date.toLocaleDateString('en-US', { month: 'short' }).toLowerCase(),
              startWeek: weekIndex,
            });
          }
        }
      });
    });
    
    return monthsArray;
  }, [weeks]);

  const totalTests = results.length;
  const maxStreak = useMemo(() => {
    let currentStreak = 0;
    let maxStreak = 0;
    
    heatmapData.forEach((day) => {
      if (day.count > 0) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });
    
    return maxStreak;
  }, [heatmapData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6 text-sm">
          <div className="text-zinc-400">
            <span className="text-zinc-200 font-semibold">{totalTests}</span> tests in the last year
          </div>
          <div className="text-zinc-400">
            <span className="text-zinc-200 font-semibold">{maxStreak}</span> day streak
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-zinc-800/50"></div>
            <div className="w-3 h-3 rounded-sm bg-cyan-900/60"></div>
            <div className="w-3 h-3 rounded-sm bg-cyan-700/70"></div>
            <div className="w-3 h-3 rounded-sm bg-cyan-600/80"></div>
            <div className="w-3 h-3 rounded-sm bg-cyan-500"></div>
          </div>
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="flex gap-[3px] mb-2 ml-8">
            {months.map((month, index) => (
              <div
                key={index}
                className="text-xs text-zinc-500"
                style={{ 
                  marginLeft: index === 0 ? '0' : `${(month.startWeek - (months[index - 1]?.startWeek || 0)) * 13 - 20}px`,
                  minWidth: '30px'
                }}
              >
                {month.name}
              </div>
            ))}
          </div>

          <div className="flex gap-[3px]">
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] justify-around text-xs text-zinc-500 pr-2">
              <div style={{ height: '10px' }}>mon</div>
              <div style={{ height: '10px' }}></div>
              <div style={{ height: '10px' }}>wed</div>
              <div style={{ height: '10px' }}></div>
              <div style={{ height: '10px' }}>fri</div>
              <div style={{ height: '10px' }}></div>
            </div>

            {/* Heatmap grid */}
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-[3px]">
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={`w-[10px] h-[10px] rounded-sm transition-all duration-200 hover:ring-1 hover:ring-cyan-400 ${
                      day.date ? getColorIntensity(day.count) : 'bg-transparent'
                    } ${day.count > 0 ? 'cursor-pointer' : ''}`}
                    title={
                      day.date && day.count > 0
                        ? `${day.count} test${day.count > 1 ? 's' : ''} on ${new Date(day.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}`
                        : day.date
                        ? `No tests on ${new Date(day.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}`
                        : ''
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityHeatmap;
