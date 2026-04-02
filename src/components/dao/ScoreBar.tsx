import { useEffect, useState } from "react";

interface ScoreBarProps {
  label: string;
  score: number;
  maxScore: number;
  colorClass: string;
  delay?: number;
}

export function ScoreBar({ label, score, maxScore, colorClass, delay = 0 }: ScoreBarProps) {
  const [displayed, setDisplayed] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStarted(true);
      let current = 0;
      const interval = setInterval(() => {
        current += 1;
        if (current >= score) {
          setDisplayed(score);
          clearInterval(interval);
        } else {
          setDisplayed(current);
        }
      }, 25);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [score, delay]);

  const pct = maxScore > 0 ? (displayed / maxScore) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold text-foreground">{displayed}/{maxScore}</span>
      </div>
      <div className="h-3 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: started ? `${pct}%` : "0%" }}
        />
      </div>
    </div>
  );
}
