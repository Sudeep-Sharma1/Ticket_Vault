import React, { useState, useEffect } from 'react';
import { Timer, AlertTriangle } from 'lucide-react';

interface HoldTimerProps {
  expiresAt: string | Date;
  onExpire?: () => void;
  className?: string;
}

export const HoldTimer: React.FC<HoldTimerProps> = ({ expiresAt, onExpire, className = '' }) => {
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number; totalSeconds: number }>({
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
  });

  const [initialDuration, setInitialDuration] = useState<number>(600); // 10 mins default

  useEffect(() => {
    const target = new Date(expiresAt).getTime();
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((target - now) / 1000));
    setInitialDuration(remaining > 0 ? remaining : 600);

    const interval = setInterval(() => {
      const currentNow = Date.now();
      const diff = Math.max(0, Math.floor((target - currentNow) / 1000));

      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;

      setTimeLeft({ minutes, seconds, totalSeconds: diff });

      if (diff <= 0) {
        clearInterval(interval);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const percentage = Math.min(100, Math.max(0, (timeLeft.totalSeconds / initialDuration) * 100));
  const isUrgent = timeLeft.totalSeconds < 120 && timeLeft.totalSeconds > 0;
  const isExpired = timeLeft.totalSeconds === 0;

  return (
    <div
      className={`glass-panel p-4 rounded-xl border ${
        isExpired
          ? 'border-red-500/50 bg-red-950/20'
          : isUrgent
          ? 'border-amber-500/50 bg-amber-950/20 animate-pulse'
          : 'border-indigo-500/30'
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
          {isUrgent ? (
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          ) : (
            <Timer className="w-4 h-4 text-indigo-400" />
          )}
          <span>{isExpired ? 'Hold Session Expired' : 'Seats Held For You'}</span>
        </div>
        <div className="font-mono text-lg font-bold tracking-wider">
          <span
            className={
              isExpired
                ? 'text-red-400'
                : isUrgent
                ? 'text-amber-400'
                : 'text-indigo-400'
            }
          >
            {String(timeLeft.minutes).padStart(2, '0')}:
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear rounded-full ${
            isExpired
              ? 'bg-red-500'
              : isUrgent
              ? 'bg-amber-500'
              : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-xs text-slate-400 mt-2">
        {isExpired
          ? 'Your reservation timed out. Seats have been automatically released.'
          : 'Complete checkout before the timer reaches zero to prevent auto-release.'}
      </p>
    </div>
  );
};
