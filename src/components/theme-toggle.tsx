"use client";

import * as React from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-[38px] w-[120px] rounded-full border-2 border-stone-300 bg-white/40 shadow-inner" />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="group relative inline-flex h-[38px] w-[120px] items-center rounded-full border-2 border-stone-300 bg-white/40 p-0.5 shadow-inner transition-all hover:border-stone-400 dark:border-stone-700 dark:bg-stone-900/40"
      aria-label="Toggle theme"
    >
      {/* Track Icons */}
      <div className="flex w-full items-center justify-between px-5 text-stone-400">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`h-3.5 w-3.5 transition-colors ${!isDark ? "text-stone-950" : "text-stone-400"}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M3 12h2.25m.386-6.364 1.591-1.591M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" />
        </svg>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`h-3.5 w-3.5 transition-colors ${isDark ? "text-white" : "text-stone-400"}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
        </svg>
      </div>

      {/* Sliding Knob */}
      <div 
        className={`absolute h-[31px] w-[56px] rounded-full bg-stone-950 shadow-md transition-all duration-300 ease-in-out flex items-center justify-center dark:bg-stone-50 ${
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
  );
}
