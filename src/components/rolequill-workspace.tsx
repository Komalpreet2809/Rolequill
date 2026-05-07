"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useState } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AskMode, AskResponse, ProfileData, ResumeParseResponse } from "@/lib/rolequill-assistant";

type RolequillWorkspaceProps = {
  userName: string;
  userEmail: string;
  userImage?: string | null;
};

type ChatSession = {
  id: string;
  title: string;
  createdAt: number;
  entries: ChatEntry[];
  resumeText: string;
  resumeFileName: string;
  resumeFileDataUrl: string;
  resumeMimeType: string;
  jobDescription: string;
};

type SavedState = {
  sessions?: ChatSession[];
  currentSessionId?: string | null;
  resumeText?: string;
  resumeFileName?: string;
  resumeFileDataUrl?: string;
  resumeMimeType?: string;
  profile?: ProfileData;
  jobDescription?: string;
};

type ChatEntry = {
  id: string;
  role: "assistant" | "user";
  content: string;
  mode?: AskMode | null;
};


function statusLabel(mode: AskMode | null, model: string | null) {
  if (mode === "groq") return model ? `Groq live / ${model}` : "Groq live";
  if (mode === "mock") return "Fallback answer";
  return "Ready";
}

function statusStyle(mode: AskMode | null) {
  if (mode === "groq") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (mode === "mock") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-stone-200 bg-white text-stone-700";
}

function storageKey(email: string) {
  return `rolequill_${email}`;
}

function readSavedState(email: string): SavedState | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(storageKey(email));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SavedState;
  } catch {
    return null;
  }
}

function normalizeExternalUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5h5v5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14 19 5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z" />
      <circle cx="12" cy="12" r="3.25" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 13 6 6 6-6" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function TickIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7a3.37 3.37 0 0 0-.94 2.58V22" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  );
}

function PortfolioIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function ProfileInput({
  label,
  placeholder,
  value,
  onChange,
  icon: Icon,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ComponentType;
}) {
  const normalizedUrl = normalizeExternalUrl(value);
  const canOpen = Boolean(value.trim());

  return (
    <label className="group block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-stone-400 transition-colors group-hover:text-stone-300">{label}</span>
      <div className="relative">
        <div className={`absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 transition-all duration-300 ${
          label.toLowerCase().includes("linkedin") ? "group-hover:text-[#0077b5] group-hover:scale-110" :
          label.toLowerCase().includes("github") ? "group-hover:text-[#fafafa] group-hover:scale-110" :
          label.toLowerCase().includes("twitter") ? "group-hover:text-[#1da1f2] group-hover:scale-110" :
          label.toLowerCase().includes("portfolio") ? "group-hover:text-amber-400 group-hover:scale-110" :
          "group-hover:text-white"
        }`}>
          <Icon />
        </div>
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-white/10 bg-white/6 px-10 py-3 pr-20 text-sm text-stone-100 placeholder-stone-500 outline-none transition focus:border-stone-400 focus:bg-white/10 dark:border-stone-800 dark:bg-stone-950/40 dark:focus:border-stone-700"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {canOpen && (
            <button
              type="button"
              onClick={() => onChange("")}
              title="Clear link"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-stone-500 transition hover:bg-white/10 hover:text-stone-300"
            >
              <XIcon />
            </button>
          )}
          <button
            type="button"
            onClick={() => window.open(normalizedUrl, "_blank", "noopener,noreferrer")}
            disabled={!canOpen}
            title={canOpen ? `Open ${label}` : `Add ${label} first`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-stone-950/70 text-stone-300 transition hover:border-amber-300/60 hover:text-white disabled:cursor-not-allowed disabled:border-white/5 disabled:text-stone-600"
          >
            <ExternalLinkIcon />
          </button>
        </div>
      </div>
    </label>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Rolequill could not read the uploaded file."));
    reader.readAsDataURL(file);
  });
}

function createEntryId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function RolequillWorkspace({ userName, userEmail, userImage }: RolequillWorkspaceProps) {
  const [mounted, setMounted] = useState(false);
  const [savedState] = useState<SavedState | null>(() => readSavedState(userEmail));
  const [resumeText, setResumeText] = useState(savedState?.resumeText ?? "");
  const [resumeFileName, setResumeFileName] = useState(savedState?.resumeFileName ?? "");
  const [resumeFileDataUrl, setResumeFileDataUrl] = useState(savedState?.resumeFileDataUrl ?? "");
  const [resumeMimeType, setResumeMimeType] = useState(savedState?.resumeMimeType ?? "");
  const [jobDescription, setJobDescription] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const [chatEntries, setChatEntries] = useState<ChatEntry[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>(savedState?.sessions ?? []);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(savedState?.currentSessionId ?? null);
  const [showHistory, setShowHistory] = useState(false);

  const [mode, setMode] = useState<AskMode | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewMessageOpen, setPreviewMessageOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [lastCopiedId, setLastCopiedId] = useState<string | null>(null);

  const [portfolioUrl, setPortfolioUrl] = useState(savedState?.profile?.portfolioUrl ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(savedState?.profile?.linkedinUrl ?? "");
  const [githubUrl, setGithubUrl] = useState(savedState?.profile?.githubUrl ?? "");
  const [twitterUrl, setTwitterUrl] = useState(savedState?.profile?.twitterUrl ?? "");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      const state: SavedState = {
        resumeText,
        resumeFileName,
        resumeFileDataUrl,
        resumeMimeType,
        profile: { portfolioUrl, linkedinUrl, githubUrl, twitterUrl },
        sessions,
        currentSessionId,
      };
      localStorage.setItem(storageKey(userEmail), JSON.stringify(state));
    } catch (e) {
      console.warn("Rolequill: Failed to save state to localStorage (likely size limit)", e);
    }
  }, [
    mounted,
    userEmail,
    resumeText,
    resumeFileName,
    resumeFileDataUrl,
    resumeMimeType,
    portfolioUrl,
    linkedinUrl,
    githubUrl,
    twitterUrl,
    sessions,
    currentSessionId,
  ]);

  const profile: ProfileData = { portfolioUrl, linkedinUrl, githubUrl, twitterUrl };
  const hasResume = Boolean(resumeText.trim() && resumeFileName);
  const canOpenResumeFile = Boolean(resumeFileDataUrl && resumeFileName);
  const isPdfResume = resumeMimeType === "application/pdf" || resumeFileName.toLowerCase().endsWith(".pdf");
  const hasJobDescription = Boolean(jobDescription.trim());
  const filledLinkCount = [portfolioUrl, linkedinUrl, githubUrl, twitterUrl].filter((value) => value.trim()).length;
  const contextReadyCount = [hasResume, hasJobDescription].filter(Boolean).length + filledLinkCount;

  async function handleResumeUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("resume", file);

    setIsUploading(true);
    setUploadError(null);
    setMessage(null);

    try {
      const fileDataUrl = await readFileAsDataUrl(file);
      const response = await fetch("/api/resume/parse", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Rolequill could not parse the resume.");
      const parsed = data as ResumeParseResponse;
      setResumeText(parsed.text);
      setResumeFileName(parsed.fileName);
      setResumeFileDataUrl(fileDataUrl);
      setResumeMimeType(file.type || "application/octet-stream");
      setPreviewMessageOpen(false);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Rolequill could not parse the resume.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  async function handleAsk() {
    const prompt = question.trim();
    if (!prompt) return;

    const userEntry: ChatEntry = {
      id: createEntryId(),
      role: "user",
      content: prompt,
    };

    setChatEntries((current) => [...current, userEntry]);
    setIsAsking(true);
    setAskError(null);
    setMessage(null);
    setCopyState("idle");
    setQuestion("");

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription, question: prompt, profile }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Rolequill could not answer the question.");

      const result = data as AskResponse;
      setAnswer(result.answer);
      setMode(result.mode);
      setModel(result.model);
      setMessage(result.message ?? null);
      setChatEntries((current) => [
        ...current,
        {
          id: createEntryId(),
          role: "assistant",
          content: result.answer,
          mode: result.mode,
        },
      ]);
    } catch (error) {
      const failure = error instanceof Error ? error.message : "Rolequill could not answer the question.";
      setAskError(failure);
      setChatEntries((current) => [
        ...current,
        {
          id: createEntryId(),
          role: "assistant",
          content: failure,
          mode: "mock",
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  }

  function handleEditMessage(id: string, text: string) {
    setQuestion(text);
    const index = chatEntries.findIndex((e) => e.id === id);
    if (index !== -1) {
      setChatEntries((current) => current.slice(0, index));
    }
  }

  function handleNewSession() {
    // Auto-save current session if it has entries before clearing
    if (chatEntries.length > 0) {
      const newSession: ChatSession = {
        id: currentSessionId || createEntryId(),
        title: jobDescription.slice(0, 40) || "New Session",
        createdAt: Date.now(),
        entries: chatEntries,
        resumeText,
        resumeFileName,
        resumeFileDataUrl,
        resumeMimeType,
        jobDescription,
      };

      setSessions((current) => {
        const filtered = current.filter((s) => s.id !== newSession.id);
        return [newSession, ...filtered];
      });
    }

    // Clear current chat state but KEEP resume
    setJobDescription("");
    setChatEntries([]);
    setAnswer("");
    setMode(null);
    setMessage(null);
    setCurrentSessionId(null);
  }

  function handleLoadSession(session: ChatSession) {
    // Save current before switching
    if (chatEntries.length > 0) {
      const active: ChatSession = {
        id: currentSessionId || createEntryId(),
        title: jobDescription.slice(0, 40) || "Session",
        createdAt: Date.now(),
        entries: chatEntries,
        resumeText,
        resumeFileName,
        resumeFileDataUrl,
        resumeMimeType,
        jobDescription,
      };
      setSessions((current) => {
        const filtered = current.filter((s) => s.id !== active.id);
        return [active, ...filtered];
      });
    }

    setResumeText(session.resumeText);
    setResumeFileName(session.resumeFileName);
    setResumeFileDataUrl(session.resumeFileDataUrl);
    setResumeMimeType(session.resumeMimeType);
    setJobDescription(session.jobDescription);
    setChatEntries(session.entries);
    setCurrentSessionId(session.id);
    setAnswer(session.entries.findLast((e) => e.role === "assistant")?.content ?? "");
    setMode(null);
    setMessage(null);
  }

  function handleDeleteSession(id: string, event: React.MouseEvent) {
    event.stopPropagation();
    setSessions((current) => current.filter((s) => s.id !== id));
    if (currentSessionId === id) {
      handleNewSession();
    }
  }

  function handlePreviewOpen() {
    if (canOpenResumeFile) {
      setIsPreviewOpen(true);
      return;
    }
    setPreviewMessageOpen(true);
  }

  if (!mounted) return null;

  return (
    <>
      <section id="context" className="mx-auto flex min-h-screen w-full max-w-7xl snap-start items-start px-6 py-12 sm:px-10 lg:px-12">
        <div className="grid w-full gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="space-y-6 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(18,16,14,0.96)_0%,rgba(28,25,23,0.98)_100%)] p-5 text-stone-100 shadow-[0_28px_80px_rgba(28,25,23,0.2)] sm:p-6 dark:border-stone-800/50 dark:bg-[linear-gradient(180deg,#1c1917_0%,#0c0a09_100%)]">


              <div className="flex items-center gap-5 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
              {userImage ? (
                <Image src={userImage} alt={userName} width={80} height={80} unoptimized className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-stone-800 text-2xl font-semibold text-stone-200">
                  {userName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-stone-500">Signed in as</p>
                <p className="mt-1 truncate text-xl font-bold text-white">{userName}</p>
                <p className="mt-0.5 truncate text-base text-stone-400">{userEmail}</p>
              </div>
            </div>

             <div className="rounded-2xl border border-white/10 bg-white/6 p-4 space-y-3 sm:p-5">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.05em] text-stone-400">Profile links</p>
                <p className="mt-1 text-xs leading-6 text-stone-300">Factor these into the AI's response.</p>
              </div>
              <div className="grid gap-2">
                <ProfileInput label="Portfolio" placeholder="https://yoursite.com" value={portfolioUrl} onChange={setPortfolioUrl} icon={PortfolioIcon} />
                <ProfileInput label="LinkedIn" placeholder="https://linkedin.com/in/username" value={linkedinUrl} onChange={setLinkedinUrl} icon={LinkedInIcon} />
                <ProfileInput label="GitHub" placeholder="https://github.com/username" value={githubUrl} onChange={setGithubUrl} icon={GitHubIcon} />
                <ProfileInput label="Twitter / X" placeholder="https://x.com/username" value={twitterUrl} onChange={setTwitterUrl} icon={TwitterIcon} />
              </div>
            </div>
          </aside>

          <div className="space-y-8">


            {hasResume ? (
              <section className="overflow-hidden rounded-[2.4rem] border border-emerald-200/80 bg-[linear-gradient(135deg,#f6fff8_0%,#edf9f1_58%,#fbfffd_100%)] shadow-[0_24px_70px_rgba(16,185,129,0.08)] dark:border-emerald-900/30 dark:bg-[linear-gradient(135deg,#064e3b_0%,#022c22_100%)]">
                <div className="border-b border-emerald-100 px-6 py-5 sm:px-7 dark:border-emerald-900/50">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.05em] text-emerald-700 dark:text-emerald-400">Resume saved</p>
                      <h3 className="mt-2 font-serif text-3xl leading-[1.1] tracking-[-0.04em] text-stone-950 dark:text-stone-50">{resumeFileName}</h3>
                      <p className="mt-2 text-[10px] leading-6 text-stone-500 dark:text-stone-400">Accepted formats: PDF, TXT, MD, RTF</p>
                      {!canOpenResumeFile && <p className="mt-2 text-sm leading-8 text-stone-700 dark:text-stone-300">Re-upload once to enable preview.</p>}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={handlePreviewOpen} className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-500" title={canOpenResumeFile ? "View resume" : "Re-upload once to enable file preview"}>
                        <EyeIcon /> View
                      </button>
                      <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50 transition hover:bg-stone-800">
                        {isUploading ? "Replacing..." : "Replace"}
                        <input type="file" accept=".pdf,.txt,.md,.rtf" onChange={handleResumeUpload} disabled={isUploading} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
                {uploadError && <p className="mx-7 my-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-8">{uploadError}</p>}
              </section>
            ) : (
              <section className="rounded-3xl border border-white/70 bg-white/76 p-6 shadow-[0_28px_80px_rgba(120,53,15,0.12)] backdrop-blur sm:p-7 dark:border-stone-800 dark:bg-stone-900/40">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.05em] text-stone-500 dark:text-stone-400">Resume</p>
                    <h3 className="mt-2 font-serif text-3xl leading-[1.1] tracking-[-0.05em] text-stone-950 dark:text-stone-50">Upload your resume</h3>
                    <p className="mt-2 text-[10px] leading-6 text-stone-500 dark:text-stone-400">Accepted formats: PDF, TXT, MD, RTF</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-stone-950 px-5 py-2.5 text-sm font-semibold text-stone-50 transition hover:bg-stone-800 dark:bg-stone-50 dark:text-stone-950 dark:hover:bg-stone-200">
                    {isUploading ? "Uploading..." : "Choose file"}
                    <input type="file" accept=".pdf,.txt,.md,.rtf" onChange={handleResumeUpload} disabled={isUploading} className="hidden" />
                  </label>
                </div>
                {uploadError && <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{uploadError}</p>}
              </section>
            )}

            <section className="rounded-3xl border border-white/70 bg-white/76 p-6 shadow-[0_28px_80px_rgba(120,53,15,0.12)] backdrop-blur sm:p-7 dark:border-stone-800 dark:bg-stone-900/40">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.05em] text-stone-500 dark:text-stone-400">Job description</p>
                  <h3 className="mt-2 font-serif text-3xl leading-[1.1] tracking-[-0.04em] text-stone-950 dark:text-stone-50">Paste the role brief.</h3>
                </div>
                <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
                  {hasJobDescription ? "JD loaded" : "Awaiting JD"}
                </span>
              </div>
              <label className="mt-4 block">
                  <textarea
                    value={jobDescription}
                    onChange={(event) => setJobDescription(event.target.value)}
                    rows={6}
                    placeholder="Paste the full JD here..."
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-4 text-sm leading-7 text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white dark:border-stone-800 dark:bg-stone-950/40 dark:text-stone-100 dark:focus:border-stone-600 dark:focus:bg-stone-900/60"
                  />
              </label>

                  <div className="mt-6 flex justify-end">
                    <a
                      href="#chat"
                      style={{ color: 'white' }}
                      className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(28,25,23,0.16)] transition hover:bg-stone-800"
                    >
                      Save and continue <ArrowDownIcon />
                    </a>
                  </div>
            </section>
          </div>
        </div>
      </section>

      <section id="chat" className="mx-auto flex h-[98vh] w-full max-w-7xl items-start px-6 py-2 sm:px-10 lg:px-4">
      <div className="mx-auto h-full w-full max-w-7xl">
        <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,241,231,0.98)_100%)] shadow-[0_32px_90px_rgba(120,53,15,0.12)] backdrop-blur dark:border-stone-800 dark:bg-[linear-gradient(180deg,rgba(28,25,23,0.95)_0%,rgba(12,10,9,1)_100%)]">
          <div className="border-b border-stone-200 px-6 py-4 dark:border-stone-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-bold uppercase tracking-[0.05em] text-stone-500">Conversation</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[8px] font-bold transition ${
                    showHistory 
                      ? "border-stone-900 bg-stone-900 text-white dark:border-stone-50 dark:bg-stone-50 dark:text-stone-950" 
                      : "border-stone-200 bg-white/60 text-stone-700 backdrop-blur hover:bg-white dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-300 dark:hover:bg-stone-800"
                  }`}
                >
                  History
                </button>
                <button
                  type="button"
                  onClick={handleNewSession}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white/60 px-2 py-0.5 text-[8px] font-bold text-stone-700 backdrop-blur transition hover:bg-white dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-2.5 w-2.5"><path d="M12 5v14M5 12h14" /></svg>
                  New session
                </button>
              </div>
            </div>
          </div>
          <div className="flex h-full flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              {showHistory && (
                <div className="w-full shrink-0 border-r border-stone-200 bg-stone-50/50 lg:w-72 dark:border-stone-800 dark:bg-stone-900/30">
                  <div className="p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-stone-500">Recent Sessions</p>
                    <div className="mt-4 space-y-2 overflow-y-auto max-h-[34rem]">
                      {sessions.length === 0 ? (
                        <p className="py-8 text-center text-xs italic text-stone-400">No saved sessions.</p>
                      ) : (
                        sessions.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => handleLoadSession(s)}
                            className={`group flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${currentSessionId === s.id ? "border-stone-900 bg-stone-900 text-white shadow-sm dark:border-stone-50 dark:bg-stone-50 dark:text-stone-950" : "border-stone-200 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-300 dark:hover:border-stone-700"}`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold leading-tight">{s.title}</p>
                              <p className={`mt-1 text-[10px] ${currentSessionId === s.id ? "text-stone-400" : "text-stone-500"}`}>{new Date(s.createdAt).toLocaleDateString()}</p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSession(s.id, e)}
                              className={`ml-2 flex h-6 w-6 items-center justify-center rounded-full transition ${currentSessionId === s.id ? "text-stone-500 hover:bg-stone-800 hover:text-white" : "text-stone-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"}`}
                            >
                              <XIcon />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

                <div className="flex flex-1 flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto px-4 pt-6 pb-2 sm:px-10 sm:pt-10 sm:pb-4">
                    {chatEntries.length ? (
                      <div className="space-y-6">
                        {chatEntries.map((entry) => (
                          <div key={entry.id} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"} animate-slide-in-bottom`}>
                            <div className={`group relative max-w-[86%] ${entry.role === "user" ? "rounded-2xl bg-stone-950 px-4 py-2 text-stone-50 shadow-[0_14px_30px_rgba(28,25,23,0.16)] dark:bg-stone-50 dark:text-stone-950" : "rounded-2xl border border-stone-200 bg-white px-4 py-2 text-stone-700 shadow-[0_12px_28px_rgba(120,53,15,0.06)] dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200"}`}>
                              <div className={`relative text-sm leading-6 ${entry.role === "user" ? "text-stone-50 dark:text-stone-950 pr-10" : "text-stone-700 dark:text-stone-300 pr-10"} prose prose-stone dark:prose-invert max-w-none`}>
                                <ReactMarkdown 
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    table: ({node, ...props}) => (
                                      <div className="my-6 overflow-x-auto rounded-xl border border-stone-200 bg-white/50 shadow-sm dark:border-stone-800 dark:bg-stone-900/50">
                                        <table className="w-full border-collapse text-left text-xs" {...props} />
                                      </div>
                                    ),
                                    thead: ({node, ...props}) => <thead className="bg-stone-50 dark:bg-stone-800/80" {...props} />,
                                    th: ({node, ...props}) => <th className="border-b border-stone-200 px-4 py-3 font-bold uppercase tracking-wider text-stone-950 dark:border-stone-700 dark:text-white" {...props} />,
                                    td: ({node, ...props}) => <td className="border-b border-stone-100 px-4 py-3 dark:border-stone-800/50" {...props} />,
                                    h1: ({node, ...props}) => <h1 className="mb-4 mt-6 text-xl font-bold text-stone-950 dark:text-white" {...props} />,
                                    h2: ({node, ...props}) => <h2 className="mb-3 mt-5 text-lg font-bold text-stone-900 dark:text-white" {...props} />,
                                    h3: ({node, ...props}) => <h3 className="mb-2 mt-4 text-base font-bold text-stone-800 dark:text-white" {...props} />,
                                    p: ({node, ...props}) => <p className="mb-4 last:mb-0" {...props} />,
                                    ul: ({node, ...props}) => <ul className="mb-4 ml-6 list-disc" {...props} />,
                                    ol: ({node, ...props}) => <ol className="mb-4 ml-6 list-decimal" {...props} />,
                                    li: ({node, ...props}) => <li className="mb-1" {...props} />,
                                    strong: ({node, ...props}) => <strong className="font-bold text-stone-950 dark:text-white" {...props} />,
                                    a: ({node, ...props}) => <a className="text-stone-900 underline decoration-stone-300 underline-offset-4 transition hover:decoration-stone-900 dark:text-white dark:decoration-stone-700 dark:hover:decoration-white" {...props} />,
                                  }}
                                >
                                  {entry.content}
                                </ReactMarkdown>
                                
                                {entry.role === "user" && (
                                  <button
                                    type="button"
                                    onClick={() => handleEditMessage(entry.id, entry.content)}
                                    title="Edit message"
                                    className="absolute top-1 right-1 z-20 flex h-7 w-7 items-center justify-center rounded-lg border border-stone-800/20 bg-stone-900/10 text-stone-900 opacity-0 transition hover:bg-stone-900/20 group-hover:opacity-100 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                                  >
                                    <EditIcon />
                                  </button>
                                )}
                                {entry.role === "assistant" && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyMessage(entry.id, entry.content)}
                                    title="Copy response"
                                    className={`absolute top-1 right-1 z-20 flex h-7 w-7 items-center justify-center rounded-lg border transition ${lastCopiedId === entry.id ? "border-emerald-200 bg-emerald-50 text-emerald-600 opacity-100" : "border-stone-200 bg-stone-50 text-stone-500 opacity-0 group-hover:opacity-100 hover:bg-stone-100 hover:text-stone-900 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-white"}`}
                                  >
                                    {lastCopiedId === entry.id ? <TickIcon /> : <CopyIcon />}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center text-center">
                        <div className="flex h-20 w-20 items-center justify-center text-stone-950 dark:invert">
                          <img src="/logo.png" alt="Rolequill Logo" className="h-full w-full object-contain" />
                        </div>
                        <h3 className="mt-6 font-serif text-6xl leading-[1.1] tracking-[-0.05em] text-stone-900 dark:text-stone-100">Rolequill chat</h3>
                        <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Ask anything based on your loaded context.</p>
                      </div>
                    )}
                    {isAsking && (
                      <div className="mt-6 flex justify-start animate-slide-in-bottom">
                        <div className="max-w-[86%] rounded-2xl border border-stone-200 bg-white px-5 py-4 text-sm font-bold leading-8 shadow-[0_12px_28px_rgba(120,53,15,0.06)] bg-gradient-to-r from-stone-500 via-stone-300 to-stone-500 bg-[length:200%_auto] text-transparent bg-clip-text animate-shimmer">
                          Drafting your response...
                        </div>
                      </div>
                    )}
                  </div>
  
                  <div className="px-4 py-3 sm:px-10 sm:pb-4">
                    <div className={`mx-auto max-w-5xl rounded-2xl border transition-all duration-500 bg-black ${
                      hasResume 
                        ? "border-stone-700/80 shadow-[0_24px_50px_rgba(28,25,23,0.3)]" 
                        : "border-stone-800/60 shadow-none pointer-events-none"
                    } p-2.5`}>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-stone-700 text-white transition hover:border-stone-500 hover:text-white">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M12 5v14M5 12h14" /></svg>
                        <input type="file" accept=".pdf,.txt,.md,.rtf" onChange={handleResumeUpload} disabled={isUploading} className="hidden" />
                      </label>
                      <div className="flex-1">
                        <textarea
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleAsk();
                            }
                          }}
                          rows={1}
                          placeholder={hasResume ? "Why are you fit for this role?" : "Upload your resume to start chatting..."}
                          className="min-h-[1.5rem] w-full resize-none bg-transparent px-1 py-2 text-sm leading-6 text-stone-50 outline-none placeholder:text-stone-500"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <button 
                          type="button" 
                          onClick={handleAsk} 
                          disabled={isAsking || !hasResume || !question.trim()} 
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-50 text-stone-950 transition-all hover:bg-white hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-500"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4"><path d="m7 17 9.5-9.5M8 7h9v9" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </section>

      {isPreviewOpen && canOpenResumeFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] border border-stone-300 bg-white shadow-[0_24px_80px_rgba(28,25,23,0.28)]">
            <button type="button" onClick={() => setIsPreviewOpen(false)} className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 transition hover:border-stone-500">X</button>
            <div className="border-b border-stone-200 px-6 py-5"><p className="text-xs uppercase tracking-[0.05em] text-stone-500">Resume preview</p></div>
            <div className="bg-stone-100 p-4">{isPdfResume ? <iframe src={resumeFileDataUrl} title="Saved resume preview" className="h-[75vh] w-full rounded-[1.25rem] bg-white" /> : <div className="flex h-[55vh] items-center justify-center rounded-[1.25rem] bg-white px-8 text-center text-sm leading-7 text-stone-600">No PDF preview available.</div>}</div>
          </div>
        </div>
      )}

      <div className="fixed bottom-8 right-2 [writing-mode:vertical-rl] rotate-180 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-950/60 z-10 dark:text-stone-50/40">
        Made with <span className="inline-block rotate-90">❤️</span> by <a href="https://komalpreet.me" target="_blank" rel="noopener noreferrer" className="hover:text-stone-900 transition dark:hover:text-white">Komal</a>
      </div>

      {previewMessageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] border border-stone-300 bg-white p-6 shadow-[0_24px_80px_rgba(28,25,23,0.28)]">
            <h3 className="text-2xl font-semibold text-stone-950">Refresh needed</h3>
            <p className="mt-4 text-sm leading-8 text-stone-700">Click Replace once to save the original file for preview.</p>
            <div className="mt-6 flex justify-end"><button type="button" onClick={() => setPreviewMessageOpen(false)} className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50">Close</button></div>
          </div>
        </div>
      )}
    </>
  );
}
