"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { buildExpandedKeywordSet } from "@/lib/repo-query";
import {
  AskMode,
  AskResponse,
  GitHubHarvestResponse,
  GitHubRepo,
  ProfileData,
  RepoAnalysisResponse,
  RepoMatch,
  ResumeParseResponse,
} from "@/lib/rolequill-assistant";

type RolequillDashboardProps = {
  userName: string;
  userEmail: string;
  userImage?: string | null;
};

type ChatEntry = {
  id: string;
  role: "assistant" | "user";
  content: string;
  mode?: AskMode | null;
};

type ChatSession = {
  id: string;
  title: string;
  entries: ChatEntry[];
  createdAt: string;
  updatedAt: string;
};

type SavedState = {
  resumeText?: string;
  resumeFileName?: string;
  resumeFileDataUrl?: string;
  resumeMimeType?: string;
  jobDescription?: string;
  profile?: ProfileData;
};

function storageKey(email: string) {
  return `rolequill_dashboard_${email}`;
}

function writeSavedState(email: string, state: SavedState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(email), JSON.stringify(state));
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

function createEntryId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function summarizeChatTitle(entries: ChatEntry[]) {
  const source = entries.find((entry) => entry.role === "user")?.content ?? entries[0]?.content ?? "";
  const trimmed = source.replace(/\s+/g, " ").trim();
  if (!trimmed) return "New chat";
  return trimmed.length > 44 ? `${trimmed.slice(0, 44)}...` : trimmed;
}

function createChatSession(entries: ChatEntry[] = []): ChatSession {
  const now = new Date().toISOString();
  return {
    id: createEntryId(),
    title: summarizeChatTitle(entries),
    entries,
    createdAt: now,
    updatedAt: now,
  };
}

function deriveChatState() {
  const emptySession = createChatSession();
  return {
    chatSessions: [emptySession],
    activeChatId: emptySession.id,
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Rolequill could not read the uploaded file."));
    reader.readAsDataURL(file);
  });
}

function normalizeExternalUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isRepoRankingQuery(question: string) {
  const normalized = question.toLowerCase();
  const mentionsProjects = /(project|projects|repo|repos|repository|repositories)/.test(normalized);
  const rankingIntent = /(best|top|strongest|relevant|fit|suitable|shortlist|rank)/.test(normalized);
  return mentionsProjects && rankingIntent;
}

function formatRepoRankingAnswer(matches: RepoMatch[], repos: GitHubRepo[], target: string) {
  const repoMap = new Map(repos.map((repo) => [repo.id, repo]));
  const rows = matches
    .map((match, index) => {
      const repo = repoMap.get(match.repoId);
      if (!repo) return null;
      return {
        index: index + 1,
        repo,
        match,
      };
    })
    .filter(Boolean) as { index: number; repo: GitHubRepo; match: RepoMatch }[];

  if (!rows.length) {
    return `I couldn't find any strong project matches for: "${target}".`;
  }

  if (rows.length === 1) {
    const { repo, match } = rows[0];
    return [
      `The best project to mention is **${repo.fullName}**.`,
      ``,
      `Why this one:`,
      ...match.reasons.map((reason) => `- ${reason}`),
      ...(repo.description ? [``, `Project summary: ${repo.description}`] : []),
    ].join("\n");
  }

  return [
    `## Top Projects`,
    ``,
    `| # | Project | Why it fits |`,
    `|---|---|---|`,
    ...rows.map(
      ({ index, repo, match }) =>
        `| ${index} | ${repo.fullName} | ${match.reasons.join("; ")} |`
    ),
  ].join("\n");
}

function ProfileInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const normalizedUrl = normalizeExternalUrl(value);

  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">{label}</span>
      <div className="relative">
        <input
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 pr-12 text-sm text-stone-100 placeholder-stone-500 outline-none transition focus:border-amber-300/60 focus:bg-white/10"
        />
        <button
          type="button"
          onClick={() => window.open(normalizedUrl, "_blank", "noopener,noreferrer")}
          disabled={!value.trim()}
          className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-stone-950/70 text-stone-300 transition hover:border-amber-300/60 hover:text-white disabled:cursor-not-allowed disabled:text-stone-600"
        >
          ↗
        </button>
      </div>
    </label>
  );
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" className="h-4 w-4" aria-hidden="true">
      <path d="M10 8 5 12l5 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 12h8a5 5 0 1 1 0 10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <rect x="9" y="9" width="10" height="10" rx="2" />
      <path d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
    </svg>
  );
}

export function RolequillDashboard({ userName, userEmail, userImage }: RolequillDashboardProps) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [savedState] = useState<SavedState | null>(() => readSavedState(userEmail));
  const [initialChatState] = useState(() => deriveChatState());
  const [resumeText, setResumeText] = useState(savedState?.resumeText ?? "");
  const [resumeFileName, setResumeFileName] = useState(savedState?.resumeFileName ?? "");
  const [resumeFileDataUrl, setResumeFileDataUrl] = useState(savedState?.resumeFileDataUrl ?? "");
  const [resumeMimeType, setResumeMimeType] = useState(savedState?.resumeMimeType ?? "");
  const [jobDescription, setJobDescription] = useState(savedState?.jobDescription ?? "");
  const [portfolioUrl, setPortfolioUrl] = useState(savedState?.profile?.portfolioUrl ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(savedState?.profile?.linkedinUrl ?? "");
  const [githubUrl, setGithubUrl] = useState(savedState?.profile?.githubUrl ?? "");
  const [twitterUrl, setTwitterUrl] = useState(savedState?.profile?.twitterUrl ?? "");
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(initialChatState.chatSessions);
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChatState.activeChatId);
  const [question, setQuestion] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const [jobDescriptionMessage, setJobDescriptionMessage] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<{ id: string; status: "copied" | "error" } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewMessageOpen, setPreviewMessageOpen] = useState(false);
  const [githubAccount, setGithubAccount] = useState<GitHubHarvestResponse["account"] | null>(null);
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [repoMatches, setRepoMatches] = useState<RepoMatch[]>([]);
  const [repoTalkingPoints, setRepoTalkingPoints] = useState<Record<string, string[]>>({});
  const [githubFetchedAt, setGithubFetchedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [analysisError] = useState<string | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);
  const [isSyncingRepos, setIsSyncingRepos] = useState(false);

  useEffect(() => {
    if (!mounted) return;

    const state: SavedState = {
      resumeText,
      resumeFileName,
      resumeFileDataUrl,
      resumeMimeType,
      jobDescription,
      profile: { portfolioUrl, linkedinUrl, githubUrl, twitterUrl },
    };

    writeSavedState(userEmail, state);
  }, [
    mounted,
    userEmail,
    resumeText,
    resumeFileName,
    resumeFileDataUrl,
    resumeMimeType,
    jobDescription,
    portfolioUrl,
    linkedinUrl,
    githubUrl,
    twitterUrl,
  ]);

  const profile: ProfileData = { portfolioUrl, linkedinUrl, githubUrl, twitterUrl };
  const hasResume = Boolean(resumeText.trim() && resumeFileName);
  const hasJobDescription = Boolean(jobDescription.trim());
  const canOpenResumeFile = Boolean(resumeFileDataUrl && resumeFileName);
  const isPdfResume = resumeMimeType === "application/pdf" || resumeFileName.toLowerCase().endsWith(".pdf");
  const activeChat = chatSessions.find((session) => session.id === activeChatId) ?? chatSessions[0] ?? null;
  const chatEntries = activeChat?.entries ?? [];
  const rankedRepos = useMemo(() => {
    const scoreMap = new Map(repoMatches.map((match) => [match.repoId, match]));
    return githubRepos
      .map((repo) => ({ repo, match: scoreMap.get(repo.id) }))
      .sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0));
  }, [githubRepos, repoMatches]);

  function buildChatGitHubContext(prompt: string, history: ChatEntry[]) {
    const searchText = [...history.slice(-6).map((entry) => entry.content), prompt].join("\n");
    const tokens = buildExpandedKeywordSet(searchText);

    const repoSummaryLines = githubRepos.map((repo) => {
      const parts = [
        repo.fullName,
        repo.description || "No description",
        repo.topics.length ? `Topics: ${repo.topics.slice(0, 6).join(", ")}` : "",
      ].filter(Boolean);

      return `- ${parts.join(" | ")}`;
    });

    const relevantRepos = [...githubRepos]
      .map((repo) => {
        const exactNameHit =
          searchText.toLowerCase().includes(repo.name.toLowerCase()) ||
          searchText.toLowerCase().includes(repo.fullName.toLowerCase());
        const readmeText = repo.readme.toLowerCase();
        const supportText = [
          repo.name,
          repo.fullName,
          repo.description,
          repo.topics.join(" "),
          Object.keys(repo.languages).join(" "),
        ]
          .join(" ")
          .toLowerCase();

        let readmeHits = 0;
        let supportHits = 0;
        for (const token of tokens) {
          if (readmeText.includes(token)) readmeHits += 1;
          if (supportText.includes(token)) supportHits += 1;
        }

        return {
          repo,
          score: (exactNameHit ? 100 : 0) + readmeHits * 4 + supportHits,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((entry) => entry.repo);

    const focusedDetails = relevantRepos
      .map((repo) => {
        const match = repoMatches.find((entry) => entry.repoId === repo.id);
        const compactReadme = repo.readme.replace(/\s+/g, " ").trim().slice(0, 1000);
        return [
          `Repository: ${repo.fullName}`,
          compactReadme ? `README excerpt: ${compactReadme}` : "",
          repo.description ? `Description: ${repo.description}` : "",
          repo.topics.length ? `Topics: ${repo.topics.join(", ")}` : "",
          Object.keys(repo.languages).length ? `Languages: ${Object.keys(repo.languages).join(", ")}` : "",
          match ? `Ranking reasons: ${match.reasons.join(" | ")}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n---\n\n");

    return [
      "All Synced GitHub Repositories:",
      repoSummaryLines.join("\n"),
      "",
      "README-First Repository Details:",
      focusedDetails || "No repo details available.",
    ].join("\n");
  }

  async function handleResumeUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("resume", file);

    setIsUploading(true);
    setUploadError(null);

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
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Rolequill could not parse the resume.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  async function handleSyncGitHub() {
    setIsSyncingRepos(true);
    setSyncError(null);

    try {
      const response = await fetch("/api/github/repos", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "GitHub sync failed.");
      const result = data as GitHubHarvestResponse;
      setGithubAccount(result.account);
      setGithubRepos(result.repos);
      setGithubFetchedAt(result.fetchedAt);
      setRepoMatches([]);
      setRepoTalkingPoints({});
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "GitHub sync failed.");
    } finally {
      setIsSyncingRepos(false);
    }
  }

  async function runRepoRankingFromPrompt(prompt: string) {
    const response = await fetch("/api/github/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: prompt, jobDescription, repos: githubRepos }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Repo analysis failed.");
    return data as RepoAnalysisResponse;
  }

  function handleRemoveRepo(repoId: number) {
    setGithubRepos((current) => current.filter((repo) => repo.id !== repoId));
    setRepoMatches((current) => current.filter((match) => match.repoId !== repoId));
    setRepoTalkingPoints((current) => {
      const next = { ...current };
      delete next[String(repoId)];
      return next;
    });
  }

  function updateChatEntries(sessionId: string, updater: (entries: ChatEntry[]) => ChatEntry[]) {
    setChatSessions((current) => {
      const target = current.find((session) => session.id === sessionId);
      if (!target) return current;

      const nextEntries = updater(target.entries);
      const updatedSession: ChatSession = {
        ...target,
        entries: nextEntries,
        title: summarizeChatTitle(nextEntries),
        updatedAt: new Date().toISOString(),
      };

      return [updatedSession, ...current.filter((session) => session.id !== sessionId)];
    });
  }

  function handleSelectChat(sessionId: string) {
    setActiveChatId(sessionId);
    setQuestion("");
    setAskError(null);
    setMessage(null);
    setCopyFeedback(null);
  }

  function handleNewChat() {
    const nextSession = createChatSession();
    setChatSessions((current) => [nextSession, ...current]);
    setActiveChatId(nextSession.id);
    setQuestion("");
    setAskError(null);
    setMessage(null);
    setCopyFeedback(null);
  }

  function handleDeleteChat(sessionId: string) {
    setChatSessions((current) => {
      const remaining = current.filter((session) => session.id !== sessionId);
      const nextSessions = remaining.length ? remaining : [createChatSession()];
      const nextActiveId =
        activeChatId === sessionId
          ? nextSessions[0].id
          : nextSessions.some((session) => session.id === activeChatId)
            ? activeChatId
            : nextSessions[0].id;

      setActiveChatId(nextActiveId);
      setQuestion("");
      setAskError(null);
      setMessage(null);
      setCopyFeedback(null);

      return nextSessions;
    });
  }

  async function handleAsk() {
    const prompt = question.trim();
    if (!prompt || !activeChat) return;

    const sessionId = activeChat.id;
    const recentHistory = chatEntries.slice(-8).map((entry) => ({
      role: entry.role,
      content: entry.content,
    }));
    const githubContext = buildChatGitHubContext(prompt, chatEntries);
    updateChatEntries(sessionId, (current) => [...current, { id: createEntryId(), role: "user", content: prompt }]);
    setQuestion("");
    setAskError(null);
    setMessage(null);
    setIsAsking(true);

    try {
      if (githubRepos.length && isRepoRankingQuery(prompt)) {
        const result = await runRepoRankingFromPrompt(prompt);
        setRepoMatches(result.matches);
        setAnalysisMessage(result.message ?? null);
        updateChatEntries(sessionId, (current) => [
          ...current,
          {
            id: createEntryId(),
            role: "assistant",
            content: formatRepoRankingAnswer(result.matches, githubRepos, prompt),
            mode: result.mode,
          },
        ]);
        return;
      }

      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription, question: prompt, profile, githubContext, chatHistory: recentHistory }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Rolequill could not answer the question.");
      const result = data as AskResponse;
      setMessage(result.message ?? null);
      updateChatEntries(sessionId, (current) => [
        ...current,
        { id: createEntryId(), role: "assistant", content: result.answer, mode: result.mode },
      ]);
    } catch (error) {
      const failure = error instanceof Error ? error.message : "Rolequill could not answer the question.";
      setAskError(failure);
      updateChatEntries(sessionId, (current) => [
        ...current,
        { id: createEntryId(), role: "assistant", content: failure, mode: "mock" },
      ]);
    } finally {
      setIsAsking(false);
    }
  }

  function handleUndoTurn(entryId: string) {
    if (!activeChat) return;

    const entry = chatEntries.find((item) => item.id === entryId);
    if (!entry || entry.role !== "user") return;

    setQuestion(entry.content);
    setAskError(null);
    setMessage(null);
    updateChatEntries(activeChat.id, (current) => {
      const startIndex = current.findIndex((item) => item.id === entryId);
      if (startIndex === -1 || current[startIndex].role !== "user") return current;

      let endIndex = current.length;
      for (let index = startIndex + 1; index < current.length; index += 1) {
        if (current[index].role === "user") {
          endIndex = index;
          break;
        }
      }

      return [...current.slice(0, startIndex), ...current.slice(endIndex)];
    });
  }

  async function handleCopyEntry(entryId: string, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopyFeedback({ id: entryId, status: "copied" });
      window.setTimeout(() => setCopyFeedback((current) => (current?.id === entryId ? null : current)), 1800);
    } catch {
      setCopyFeedback({ id: entryId, status: "error" });
    }
  }

  function handleSaveJobDescription() {
    const trimmedJobDescription = jobDescription.trim();

    if (!trimmedJobDescription) {
      setJobDescriptionMessage("Paste a job description before continuing.");
      return;
    }

    writeSavedState(userEmail, {
      resumeText,
      resumeFileName,
      resumeFileDataUrl,
      resumeMimeType,
      jobDescription: trimmedJobDescription,
      profile: { portfolioUrl, linkedinUrl, githubUrl, twitterUrl },
    });
    setJobDescription(trimmedJobDescription);
    setJobDescriptionMessage("Job description saved locally. Continuing to chat.");
    document.getElementById("chat")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!mounted) return null;

  return (
    <>
      <section id="context" className="mx-auto flex min-h-screen w-full max-w-7xl snap-start items-stretch px-6 py-16 sm:px-10 lg:px-12">
        <div className="grid w-full gap-8 lg:grid-cols-[0.96fr_1.04fr]">
          <div className="flex flex-col gap-6">
            <aside className="space-y-6 rounded-[2.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,16,14,0.96)_0%,rgba(28,25,23,0.98)_100%)] p-6 text-stone-100 shadow-[0_28px_80px_rgba(28,25,23,0.2)]">
              <div className="flex items-center gap-4 rounded-[1.8rem] border border-white/10 bg-black/20 p-5">
                {userImage ? <Image src={userImage} alt={userName} width={72} height={72} unoptimized className="h-18 w-18 rounded-full object-cover" /> : <div className="flex h-18 w-18 items-center justify-center rounded-full bg-stone-800 text-2xl font-semibold text-stone-100">{userName.slice(0, 1).toUpperCase()}</div>}
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-stone-500">Signed in as</p>
                  <p className="mt-1 truncate text-xl font-semibold text-white">{userName}</p>
                  <p className="truncate text-sm text-stone-400">{userEmail}</p>
                </div>
              </div>

              <div className="rounded-[1.8rem] border border-white/10 bg-white/6 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-400">Profile links</p>
                <div className="mt-4 grid gap-3">
                  <ProfileInput label="Portfolio" value={portfolioUrl} placeholder="https://yoursite.com" onChange={setPortfolioUrl} />
                  <ProfileInput label="LinkedIn" value={linkedinUrl} placeholder="https://linkedin.com/in/username" onChange={setLinkedinUrl} />
                  <ProfileInput label="GitHub" value={githubUrl} placeholder="https://github.com/username" onChange={setGithubUrl} />
                  <ProfileInput label="Twitter / X" value={twitterUrl} placeholder="https://x.com/username" onChange={setTwitterUrl} />
                </div>
              </div>

              <div className="rounded-[1.8rem] border border-white/10 bg-white/6 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-400">Resume</p>
                    <h3 className="mt-2 font-serif text-3xl leading-none tracking-[-0.04em] text-white">{hasResume ? resumeFileName : "Upload your resume"}</h3>
                  </div>
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-stone-200">
                    {isUploading ? "Uploading..." : hasResume ? "Replace" : "Choose"}
                    <input type="file" accept=".pdf,.txt,.md,.rtf" onChange={handleResumeUpload} disabled={isUploading} className="hidden" />
                  </label>
                </div>
                {hasResume ? (
                  <button type="button" onClick={() => (canOpenResumeFile ? setIsPreviewOpen(true) : setPreviewMessageOpen(true))} className="mt-4 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-white">
                    Preview resume
                  </button>
                ) : null}
                {uploadError ? <p className="mt-4 rounded-2xl border border-red-200/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{uploadError}</p> : null}
              </div>
            </aside>

            <section className="flex-1 rounded-[2.4rem] border border-white/70 bg-white/76 p-7 shadow-[0_28px_80px_rgba(120,53,15,0.12)] backdrop-blur sm:p-8">
              <div className="flex flex-col gap-5">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-stone-500">GitHub scanner</p>
                  <h2 className="mt-4 font-serif text-4xl leading-none tracking-[-0.05em] text-stone-950 sm:text-5xl">Rank your repositories.</h2>
                  <p className="mt-4 max-w-xl text-base leading-8 text-stone-700">This now uses the real GitHub API from your OAuth session instead of scraping GitHub HTML.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={handleSyncGitHub} disabled={isSyncingRepos} className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50 transition hover:bg-stone-800 disabled:bg-stone-400">{isSyncingRepos ? "Syncing..." : githubRepos.length ? "Resync GitHub" : "Sync GitHub"}</button>
                </div>
              </div>

              <div className="mt-6 grid items-stretch gap-4 sm:grid-cols-3">
                <div className="flex h-full flex-col rounded-[1.7rem] border border-stone-200 bg-stone-50/80 p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Repos synced</p><p className="mt-3 text-3xl font-semibold text-stone-950">{githubRepos.length || "0"}</p></div>
                <div className="flex h-full flex-col rounded-[1.7rem] border border-stone-200 bg-stone-50/80 p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Account</p><p className="mt-3 break-words text-base font-semibold leading-7 text-stone-950 sm:text-lg">{githubAccount?.login ?? "Not synced"}</p></div>
                <div className="flex h-full flex-col rounded-[1.7rem] border border-stone-200 bg-stone-50/80 p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Last sync</p><p className="mt-3 break-words text-sm font-medium leading-6 text-stone-700">{githubFetchedAt ? new Date(githubFetchedAt).toLocaleString() : "Not yet"}</p></div>
              </div>

              {syncError ? <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{syncError}</p> : null}
              {analysisError ? <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{analysisError}</p> : null}
              {analysisMessage ? <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{analysisMessage}</p> : null}
              <div className="mt-8 rounded-[1.8rem] border border-stone-200 bg-stone-50/80 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Repository results</p>
                <p className="mt-3 text-sm leading-7 text-stone-700">Project cards stay on the right. Sync here, rank here, then review the shortlist in the next panel.</p>
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-8">
            <section className="rounded-[2.4rem] border border-white/70 bg-white/76 p-7 shadow-[0_28px_80px_rgba(120,53,15,0.12)] backdrop-blur sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-stone-500">Job description</p>
              <h2 className="mt-4 font-serif text-5xl leading-none tracking-[-0.05em] text-stone-950">Paste the role brief.</h2>
              <textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} rows={10} placeholder="Paste the full JD here. This is what the GitHub scanner will rank your projects against." className="mt-6 w-full rounded-[2rem] border border-stone-200 bg-stone-50/80 px-5 py-5 text-sm leading-7 text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white" />
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-7 text-stone-600">Save the pasted JD to this browser, then jump straight to chat.</p>
                <button
                  type="button"
                  onClick={handleSaveJobDescription}
                  disabled={!hasJobDescription}
                  className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50 transition hover:bg-stone-800 disabled:bg-stone-400"
                >
                  Save and continue
                </button>
              </div>
              {jobDescriptionMessage ? <p className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">{jobDescriptionMessage}</p> : null}
            </section>

            <section className="flex flex-1 flex-col rounded-[2.4rem] border border-white/70 bg-white/76 p-7 shadow-[0_28px_80px_rgba(120,53,15,0.12)] backdrop-blur sm:p-8">
              <div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-stone-500">Repository matches</p>
                  <h3 className="mt-4 font-serif text-4xl leading-none tracking-[-0.05em] text-stone-950 sm:text-5xl">Review the shortlist.</h3>
                </div>
              </div>

              <div className="mt-8 flex-1">
                {rankedRepos.length ? (
                  <div className="max-h-[42rem] overflow-y-auto pr-2">
                    <div className="space-y-4">
                      {rankedRepos.map(({ repo, match }) => (
                        <article key={repo.id} className="rounded-[2rem] border border-stone-200 bg-white p-5 text-stone-900 transition">
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="flex items-start justify-between gap-4">
                              {match ? <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-600">Matched</span> : <span />}
                              <button
                                type="button"
                                onClick={() => handleRemoveRepo(repo.id)}
                                aria-label={`Remove ${repo.fullName}`}
                                title={`Remove ${repo.fullName}`}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-stone-500 transition hover:border-stone-400 hover:bg-white hover:text-stone-900"
                              >
                                <XIcon />
                              </button>
                            </div>
                            <h3 className="font-serif text-3xl leading-none tracking-[-0.04em]"><a href={repo.url} target="_blank" rel="noreferrer" className="hover:underline">{repo.fullName}</a></h3>
                            {repo.description ? <p className="mt-3 text-sm leading-7 text-stone-700">{repo.description}</p> : null}
                            {match ? (
                              <div className="mt-4 max-h-28 overflow-y-auto pr-2 text-stone-700">
                                <ul className="space-y-2 text-sm leading-7">
                                  {match.reasons.map((reason) => <li key={reason}>- {reason}</li>)}
                                </ul>
                              </div>
                            ) : null}
                            {(repoTalkingPoints[String(repo.id)] ?? []).length ? (
                              <div className="mt-4 max-h-40 overflow-y-auto rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4 pr-3 text-sm leading-7 text-stone-700">
                                <ul className="space-y-2">
                                  {repoTalkingPoints[String(repo.id)].map((point) => <li key={point}>- {point}</li>)}
                                </ul>
                              </div>
                            ) : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  !githubRepos.length ? (
                    <div className="h-full rounded-[2rem] border border-dashed border-stone-300 bg-stone-50/70 p-6 text-stone-700">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Before sync</p>
                      <h4 className="mt-3 font-serif text-3xl leading-none tracking-[-0.04em] text-stone-950">Your repo shortlist will appear here.</h4>
                      <p className="mt-4 max-w-xl text-sm leading-7">After you sync GitHub, this panel fills with repositories pulled from your account. Chat will answer from the repos that remain here.</p>
                      <div className="mt-6 grid items-stretch gap-4 lg:grid-cols-3">
                        <div className="flex h-full flex-col rounded-[1.6rem] border border-stone-200 bg-white p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">1</p>
                          <p className="mt-3 text-sm font-semibold text-stone-950">Sync all repos</p>
                          <p className="mt-2 text-sm leading-6 text-stone-600">Rolequill pulls repo metadata, languages, and README content from GitHub.</p>
                        </div>
                        <div className="flex h-full flex-col rounded-[1.6rem] border border-stone-200 bg-white p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">2</p>
                          <p className="mt-3 text-sm font-semibold text-stone-950">Trim the list</p>
                          <p className="mt-2 text-sm leading-6 text-stone-600">Remove any repositories you do not want included before asking questions.</p>
                        </div>
                        <div className="flex h-full flex-col rounded-[1.6rem] border border-stone-200 bg-white p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">3</p>
                          <p className="mt-3 text-sm font-semibold text-stone-950">Ask from all remaining repos</p>
                          <p className="mt-2 text-sm leading-6 text-stone-600">Use chat for prompts like &quot;best 3 ML projects&quot; or &quot;which repo fits this JD best?&quot;</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-[2rem] border border-dashed border-stone-300 bg-stone-50/70 px-6 py-10 text-center text-sm leading-7 text-stone-600">Your repos are synced. Ask in chat for the best projects, or mention the job profile to rank them against the JD.</div>
                  )
                )}
              </div>
            </section>
          </div>
        </div>
      </section>

      <section id="chat" className="mx-auto flex min-h-screen w-full max-w-7xl snap-start items-start px-6 py-16 sm:px-10 lg:px-12">
        <div className="w-full overflow-hidden rounded-[2.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,16,14,0.98)_0%,rgba(30,27,24,0.98)_100%)] p-4 text-stone-100 shadow-[0_32px_90px_rgba(28,25,23,0.24)] sm:p-6">
          <div className="grid w-full items-stretch gap-6 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
            <div className="rounded-[2rem] border border-white/10 bg-white/6 p-6">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold uppercase tracking-[0.32em] text-stone-400">Chat section</p>
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="inline-flex h-6 items-center rounded-full border border-white/10 bg-white/8 px-2 text-[8px] font-semibold tracking-[0.02em] text-stone-100 transition hover:border-white/20 hover:bg-white/12"
                >
                  New chat
                </button>
              </div>
              <h2 className="mt-4 font-serif text-5xl leading-none tracking-[-0.05em] text-white">Ask with evidence.</h2>
              {message ? <p className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-4 text-sm leading-7 text-stone-300">{message}</p> : null}
              <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Chat history</p>
                  <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-300">{chatSessions.length}</span>
                </div>
                <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
                  {chatSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`rounded-[1.2rem] border px-3 py-3 transition ${
                        session.id === activeChatId
                          ? "border-white/20 bg-white/12 text-white"
                          : "border-white/8 bg-black/10 text-stone-300 hover:border-white/14 hover:bg-white/8"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button type="button" onClick={() => handleSelectChat(session.id)} className="min-w-0 flex-1 text-left">
                          <p className="truncate text-sm font-semibold">{session.title}</p>
                          <p className={`mt-1 text-xs ${session.id === activeChatId ? "text-stone-300" : "text-stone-500"}`}>
                            {session.entries.length ? `${session.entries.length} messages` : "Empty chat"}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteChat(session.id)}
                          aria-label="Delete chat"
                          title="Delete chat"
                          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${
                            session.id === activeChatId
                              ? "border-white/15 bg-black/20 text-stone-200 hover:border-white/25"
                              : "border-white/10 bg-black/20 text-stone-400 hover:border-white/20 hover:text-stone-200"
                          }`}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="min-w-0 overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,241,231,0.98)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <div className="max-h-[34rem] min-h-[28rem] overflow-y-auto px-6 py-8">
                {chatEntries.length ? (
                  <div className="space-y-6">
                    {chatEntries.map((entry) => (
                      <div key={entry.id} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`${entry.role === "user" ? "max-w-[86%]" : "w-full"} space-y-2`}>
                          <div className={`rounded-[1.8rem] px-5 py-4 ${entry.role === "user" ? "bg-stone-950 text-stone-50" : "border border-stone-200 bg-white text-stone-700"}`}>
                            {entry.role === "assistant" ? (
                              <div className="prose prose-stone max-w-none text-sm leading-7">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.content}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap text-sm leading-7">{entry.content}</p>
                            )}
                          </div>
                          <div className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
                            {entry.role === "user" ? (
                              <button
                                type="button"
                                onClick={() => handleUndoTurn(entry.id)}
                                disabled={isAsking}
                                aria-label="Reuse prompt"
                                title="Reuse prompt"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 transition hover:border-stone-500 hover:bg-stone-50 disabled:opacity-50"
                              >
                                <UndoIcon />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void handleCopyEntry(entry.id, entry.content)}
                                aria-label={copyFeedback?.id === entry.id ? (copyFeedback.status === "copied" ? "Copied" : "Copy failed") : "Copy message"}
                                title={copyFeedback?.id === entry.id ? (copyFeedback.status === "copied" ? "Copied" : "Copy failed") : "Copy message"}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-stone-600 transition hover:border-stone-400 hover:bg-white"
                              >
                                {copyFeedback?.id === entry.id ? (
                                  copyFeedback.status === "copied" ? <CheckIcon /> : <XIcon />
                                ) : (
                                  <CopyIcon />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-[22rem] flex-col items-center justify-center text-center">
                    <div className="flex h-20 w-20 items-center justify-center p-1">
                      <Image src="/logo.png" alt="Rolequill Logo" width={80} height={80} className="h-full w-full object-contain mix-blend-multiply" />
                    </div>
                    <h3 className="mt-6 font-serif text-5xl leading-none tracking-[-0.05em] text-stone-900">Rolequill chat</h3>
                    <p className="mt-4 max-w-md text-sm leading-7 text-stone-600">Sync GitHub, rank your repos, then ask from a stronger evidence base.</p>
                  </div>
                )}

                {isAsking ? <div className="mt-6 flex justify-start"><div className="w-full rounded-[1.8rem] border border-stone-200 bg-white px-5 py-4 text-sm leading-7 text-stone-500">Rolequill is drafting your answer...</div></div> : null}
              </div>

              <div className="border-t border-stone-200 bg-[#f4ede2] px-4 py-4 sm:px-5">
                {askError ? <p className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{askError}</p> : null}
                <div className="rounded-[2rem] border border-stone-700/80 bg-[#211d18] p-3 shadow-[0_20px_40px_rgba(28,25,23,0.2)]">
                  <div className="flex items-end gap-3">
                    <label className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-stone-700 text-stone-300"><input type="file" accept=".pdf,.txt,.md,.rtf" onChange={handleResumeUpload} disabled={isUploading} className="hidden" />+</label>
                    <div className="flex-1">
                      <textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void handleAsk(); } }} rows={3} placeholder="Ask chat, or try: 5 best projects for a full stack role" className="min-h-[4.5rem] w-full resize-none bg-transparent px-1 py-1 text-sm leading-7 text-stone-50 outline-none placeholder:text-stone-500" />
                    </div>
                    <button type="button" onClick={() => void handleAsk()} disabled={isAsking || !question.trim() || (!githubRepos.length && (!hasResume || !hasJobDescription))} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-50 text-stone-950 disabled:bg-stone-500 disabled:text-stone-200">↗</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isPreviewOpen && canOpenResumeFile ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 p-4 backdrop-blur-sm"><div className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] border border-stone-300 bg-white shadow-[0_24px_80px_rgba(28,25,23,0.28)]"><button type="button" onClick={() => setIsPreviewOpen(false)} className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700">X</button><div className="border-b border-stone-200 px-6 py-5"><p className="text-xs uppercase tracking-[0.24em] text-stone-500">Resume preview</p><p className="mt-2 text-base font-semibold text-stone-900">{resumeFileName}</p></div><div className="bg-stone-100 p-4">{isPdfResume ? <iframe src={resumeFileDataUrl} title="Saved resume preview" className="h-[75vh] w-full rounded-[1.25rem] bg-white" /> : <div className="flex h-[55vh] items-center justify-center rounded-[1.25rem] bg-white px-8 text-center text-sm leading-7 text-stone-600">This file format cannot be previewed inline in every browser.</div>}</div></div></div> : null}
      {previewMessageOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-[2rem] border border-stone-300 bg-white p-6 shadow-[0_24px_80px_rgba(28,25,23,0.28)]"><p className="text-xs uppercase tracking-[0.24em] text-stone-500">Preview unavailable</p><h3 className="mt-3 text-2xl font-semibold text-stone-950">This saved resume needs one refresh.</h3><p className="mt-4 text-sm leading-7 text-stone-700">Click Replace once to save the original file too, then the preview dialog will work.</p><div className="mt-6 flex justify-end"><button type="button" onClick={() => setPreviewMessageOpen(false)} className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50">Close</button></div></div></div> : null}
    </>
  );
}
