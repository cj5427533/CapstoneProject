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
  
  // 붙여넣기 버튼 클릭 처리
  const handlePasteClick = async () => {
    try {
      // 클립보드에서 텍스트 가져오기
      const pastedText = await navigator.clipboard.readText();
      
      if (pastedText) {
        // 붙여넣은 텍스트 정리 (앞뒤 공백 제거)
        const cleanedText = pastedText.trim();
        
        // onChange 이벤트를 시뮬레이션하여 기존 로직을 통해 처리
        const syntheticEvent = {
          target: { value: cleanedText },
        } as React.ChangeEvent<HTMLInputElement>;
        
        onChange(syntheticEvent);
      }
    } catch (err) {
      // 클립보드 접근 실패 시 (권한 없음 등) 무시
      console.error('클립보드 읽기 실패:', err);
    }
  };
  
  // 붙여넣기 이벤트 처리 (키보드 단축키)
  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    // 클립보드에서 텍스트 가져오기
    const pastedText = e.clipboardData.getData('text');
    
    if (pastedText) {
      // 붙여넣은 텍스트 정리 (앞뒤 공백 제거)
      const cleanedText = pastedText.trim();
      
      // onChange 이벤트를 시뮬레이션하여 기존 로직을 통해 처리
      const syntheticEvent = {
        target: { value: cleanedText },
      } as React.ChangeEvent<HTMLInputElement>;
      
      onChange(syntheticEvent);
    }
  };
  
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
          <div className="relative flex-1">
            <label htmlFor="shop-url" className="sr-only">
              쇼핑몰 URL
            </label>
            <Input
              id="shop-url"
              type="text"
              value={value}
              onChange={onChange}
              onPaste={handlePaste}
              placeholder="example.com 또는 https://example.com"
              required
              aria-invalid={!!errorText}
              aria-describedby={errorId}
              className="h-11 border border-blue-200 bg-white px-3 pr-10 text-base text-slate-700 shadow-[0_12px_25px_-18px_rgba(37,99,235,0.35)] transition placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-0 sm:h-12 sm:text-lg"
            />
            <button
              type="button"
              onClick={handlePasteClick}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center h-7 w-7 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-1"
              aria-label="붙여넣기"
              title="붙여넣기"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
            </button>
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