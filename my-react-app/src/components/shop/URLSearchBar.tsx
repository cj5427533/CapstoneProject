import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface URLSearchBarProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading?: boolean;
  errorText?: string;
}

export function URLSearchBar({ value, onChange, onSubmit, isLoading, errorText }: URLSearchBarProps) {
  const errorId = errorText ? "url-error" : undefined;
  return (
    <form
      onSubmit={onSubmit}
      aria-label="쇼핑몰 URL 검색"
      className="mx-auto w-full max-w-[620px] space-y-2 sm:space-y-3"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex flex-1 items-center gap-3 px-0">
          <span aria-hidden="true" className="text-xl sm:text-2xl text-blue-500">
            🔍
          </span>
          <div className="flex-1">
            <label htmlFor="shop-url" className="sr-only">
              쇼핑몰 URL
            </label>
            <Input
              id="shop-url"
              type="url"
              value={value}
              onChange={onChange}
              placeholder="example.com 또는 https://example.com"
              required
              aria-invalid={!!errorText}
              aria-describedby={errorId}
              className="h-11 border border-blue-200 bg-white px-3 text-base text-slate-700 shadow-[0_12px_25px_-18px_rgba(37,99,235,0.35)] transition placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-0 sm:h-12 sm:text-lg"
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={isLoading}
          className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-700 px-6 text-base font-semibold shadow-md shadow-blue-500/25 transition hover:from-blue-500 hover:to-indigo-500 sm:h-12 sm:w-auto sm:px-7 sm:text-lg"
        >
          {isLoading ? "검색 중..." : "검색하기"}
        </Button>
      </div>
      {errorText && (
        <p id={errorId} className="text-sm text-destructive">
          ⚠️ {errorText}
        </p>
      )}
    </form>
  );
}

//