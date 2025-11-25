import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type Status = "safe" | "neutral" | "warning" | "danger";

export type StatusBadgeProps = {
  status: Status;
  label?: string;
} & React.ComponentProps<typeof Badge>;

const statusToLabel: Record<Status, string> = {
  safe: "안전",
  neutral: "보통",
  warning: "주의",
  danger: "매우 주의",
};

const statusClasses: Record<Status, string> = {
  safe: "bg-status-safe/15 text-status-safe border-status-safe/30",
  neutral: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-400/30",
  warning: "bg-status-warning/15 text-status-warning border-status-warning/30",
  danger: "bg-status-danger/15 text-status-danger border-status-danger/30",
};

export function StatusBadge({ status, label, className, ...props }: StatusBadgeProps) {
  return (
    <Badge
      className={cn("border", statusClasses[status], className)}
      aria-label={`상태: ${label ?? statusToLabel[status]}`}
      {...props}
    >
      <span className="inline-flex items-center gap-1.5">
        {/* 간단한 상태 점 아이콘 */}
        <span
          className={cn(
            "inline-block h-2.5 w-2.5 rounded-full",
            status === "safe" && "bg-status-safe",
            status === "neutral" && "bg-slate-400",
            status === "warning" && "bg-status-warning",
            status === "danger" && "bg-status-danger"
          )}
          aria-hidden="true"
        />
        <span>{label ?? statusToLabel[status]}</span>
      </span>
    </Badge>
  );
}
