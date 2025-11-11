import * as React from "react";
import { StatusBadge, Status } from "@/components/report/StatusBadge";
import { cn } from "@/lib/utils";

export type ReportHeaderProps = {
  domain: string;
  score: number;
  status: Status;
  lastUpdated?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export function ReportHeader({ domain, score: _score, status, lastUpdated, className, ...props }: ReportHeaderProps) {
  const [imgError, setImgError] = React.useState(false);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
  const formattedTime = lastUpdated ? new Date(lastUpdated).toLocaleString('ko-KR') : undefined;

  return (
    <div className={cn("rounded-lg border bg-card text-card-foreground shadow", className)} {...props}>
      <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="flex items-center gap-4 md:flex-1">
          <div className="relative h-12 w-12 overflow-hidden rounded-md border bg-background">
            {!imgError ? (
              <img
                src={faviconUrl}
                alt={`${domain} 파비콘`}
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <span className="text-lg" aria-hidden>
                  🌐
                </span>
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold leading-tight" aria-label="분석 대상 도메인">
              {domain}
            </h2>
            {formattedTime && (
              <p className="mt-1 text-sm text-muted-foreground" aria-label="분석 시각">
                분석 시각: {formattedTime}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="border-t px-6 py-4">
        <StatusBadge status={status} />
      </div>
    </div>
  );
}
