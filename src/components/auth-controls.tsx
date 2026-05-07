"use client";

import { signIn, signOut } from "next-auth/react";

type GitHubSignInButtonProps = {
  disabled?: boolean;
};

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.65 7.65 0 0 1 8 4.79c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 8.25 19.5 12l-3.75 3.75" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h10.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 4.5h-3A1.5 1.5 0 0 0 6 6v12a1.5 1.5 0 0 0 1.5 1.5h3" />
    </svg>
  );
}

export function GitHubSignInButton({ disabled = false }: GitHubSignInButtonProps) {
  return (
    <button
      type="button"
      onClick={() => signIn("github")}
      disabled={disabled}
      className="inline-flex h-[38px] w-[120px] items-center justify-center gap-2 rounded-full bg-stone-950 px-3 text-[10px] font-bold text-stone-50 shadow-[0_12px_30px_rgba(28,25,23,0.12)] transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-500"
    >
      <GitHubIcon />
      <span className="whitespace-nowrap">GitHub</span>
    </button>
  );
}

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut()}
      className="inline-flex h-[38px] w-[120px] items-center justify-center gap-2 rounded-full bg-stone-950 px-3 text-[10px] font-bold text-stone-50 shadow-[0_14px_32px_rgba(28,25,23,0.16)] transition hover:bg-stone-800"
    >
      <SignOutIcon />
      <span className="whitespace-nowrap">Sign out</span>
    </button>
  );
}
