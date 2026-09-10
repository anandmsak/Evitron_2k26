import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle } from 'lucide-react';

interface CountdownTimerProps {
  targetDateStr?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDateStr = '2026-10-08T09:00:00' }) => {
  const calculateTime = (): TimeRemaining => {
    // Target: 08 October 2026 09:00:00 IST
    const target = new Date(targetDateStr).getTime();
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, isExpired: false };
  };

  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(calculateTime);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTime());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDateStr]);

  if (timeLeft.isExpired) {
    return (
      <div className="bg-stone-900 text-white rounded-xl p-6 text-center border border-stone-800 shadow-md">
        <div className="flex items-center justify-center gap-2 text-emerald-400 font-semibold mb-1">
          <CheckCircle className="w-5 h-5" />
          <span>EVITRON 2K26 HAS COMMENCED!</span>
        </div>
        <p className="text-sm text-stone-400">Welcome participants to Mahendra Engineering College!</p>
      </div>
    );
  }

  const units = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Minutes', value: timeLeft.minutes },
    { label: 'Seconds', value: timeLeft.seconds },
  ];

  return (
    <div id="countdown-section" className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
      <div className="flex items-center justify-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-[#B22222]" />
        <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
          EVENT STARTS IN
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-lg mx-auto">
        {units.map((unit) => (
          <div
            key={unit.label}
            className="flex flex-col items-center justify-center p-3 bg-stone-50 border border-stone-200 rounded-lg"
          >
            <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-900 tabular-nums">
              {String(unit.value).padStart(2, '0')}
            </span>
            <span className="text-[11px] sm:text-xs font-semibold text-stone-500 uppercase tracking-wider mt-1">
              {unit.label}
            </span>
          </div>
        ))}
      </div>

      <div className="text-center mt-3 text-xs text-stone-500">
        Date: <span className="font-semibold text-stone-800">08 October 2026 (Thursday)</span> • 09:00 AM IST
      </div>
    </div>
  );
};
