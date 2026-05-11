"use client";

import * as React from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <>
        <div className="h-9 w-9 rounded-full bg-stone-950/90 shadow-[0_12px_24px_rgba(28,25,23,0.18)] sm:hidden" />
        <div className="hidden h-[38px] w-[120px] rounded-full border-2 border-stone-300 bg-white/40 shadow-inner sm:block" />
      </>
    );
  }

  const isDark = theme === "dark";

  return (
    <>
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full p-0 leading-none shadow-[0_12px_24px_rgba(28,25,23,0.18)] transition-all sm:hidden ${
          isDark ? "bg-white text-stone-950" : "bg-stone-950 text-white"
        }`}
        aria-label="Toggle theme"
        title="Toggle theme"
        type="button"
      >
        {isDark ? (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden="true">
            <path d="M14.77 4.73a1 1 0 0 0-1.1-1.64 9 9 0 1 0 7.26 7.26 1 1 0 0 0-1.64-1.1A7 7 0 1 1 14.77 4.73Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]" aria-hidden="true">
            <circle cx="12" cy="12" r="3.5" />
            <path strokeLinecap="round" d="M12 3.5v2.25M12 18.25v2.25M20.5 12h-2.25M5.75 12H3.5M18.01 5.99l-1.6 1.6M7.59 16.41l-1.6 1.6M18.01 18.01l-1.6-1.6M7.59 7.59l-1.6-1.6" />
          </svg>
        )}
      </button>

      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="group relative hidden h-[38px] w-[120px] items-center rounded-full border-2 border-stone-300 bg-white/40 p-0.5 shadow-inner transition-all hover:border-stone-400 dark:border-stone-700 dark:bg-stone-900/40 sm:inline-flex"
        aria-label="Toggle theme"
      >
        <div className="flex w-full items-center justify-between px-5 text-stone-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`h-3.5 w-3.5 transition-colors ${!isDark ? "text-stone-950" : "text-stone-400"}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M3 12h2.25m.386-6.364 1.591-1.591M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" />
          </svg>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`h-3.5 w-3.5 transition-colors ${isDark ? "text-white" : "text-stone-400"}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
          </svg>
        </div>

        <div
          className={`absolute flex h-[31px] w-[56px] items-center justify-center rounded-full bg-stone-950 shadow-md transition-all duration-300 ease-in-out dark:bg-stone-50 ${
            isDark ? "translate-x-[59px]" : "translate-x-0"
          }`}
        >
          {isDark ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4 text-stone-950">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M3 12h2.25m.386-6.364 1.591-1.591M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" />
            </svg>
          )}
        </div>
      </button>
    </>
  );
}
