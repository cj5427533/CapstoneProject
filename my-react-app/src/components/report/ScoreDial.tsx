import * as React from "react";
import { cn } from "@/lib/utils";

export type ScoreDialProps = {
  score: number;
  status: "safe" | "neutral" | "warning" | "danger";
};

export function ScoreDial({ score, status }: ScoreDialProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    const start = performance.now();
    const duration = 600; // 600ms
    const startVal = 0;
    const endVal = clamped;
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const val = Math.round(startVal + (endVal - startVal) * eased);
      setDisplay(val);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clamped]);

  const size = 160; // base 160px (w-40 h-40)
  const stroke = 10;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const progress = circumference * (display / 100);

  const statusClass =
    status === "safe"
      ? "text-status-safe"
      : status === "warning"
      ? "text-status-warning"
      : status === "danger"
      ? "text-status-danger"
      : "text-slate-400"; // neutral -> slate

  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        "w-40 h-40 md:w-48 md:h-48"
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={display}
      aria-label="신뢰도 점수"
    >
      <svg
        className="block"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          strokeWidth={stroke}
          className="text-muted"
          stroke="currentColor"
          fill="none"
          opacity={0.25}
        />
        {/* progress */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          strokeWidth={stroke}
          className={cn(statusClass, "transition-all")}
          stroke="currentColor"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference - progress}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-bold md:text-4xl">{display}</div>
        <div className="text-xs text-muted-foreground">/ 100</div>
      </div>
    </div>
  );
}
