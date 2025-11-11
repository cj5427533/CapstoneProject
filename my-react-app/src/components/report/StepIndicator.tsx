import * as React from "react";

export function StepIndicator({ currentStep, totalSteps = 3 }: { currentStep: number; totalSteps?: number }) {
  const percent = Math.max(0, Math.min(100, Math.round((currentStep - 1) / (totalSteps - 1) * 100)));
  return (
    <div className="flex flex-col gap-3" role="progressbar" aria-valuemin={1} aria-valuemax={totalSteps} aria-valuenow={currentStep}>
      <div className="flex items-center justify-center gap-3">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
          const isActive = step === currentStep;
          const isDone = step < currentStep;
          return (
            <div key={step} className="flex items-center gap-3">
              <div
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm",
                  isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-status-safe text-white" : "bg-muted text-muted-foreground",
                ].join(" ")}
                aria-label={`단계 ${step}`}
              >
                {step}
              </div>
              {step < totalSteps && <div className="hidden sm:block h-0.5 w-10 bg-muted" aria-hidden />}
            </div>
          );
        })}
      </div>
      <div className="h-1 w-full rounded-full bg-muted">
        <div className="h-1 rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
