"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useState } from "react";
import { AskMode, AskResponse, ProfileData, ResumeParseResponse } from "@/lib/rolequill-assistant";

type RolequillWorkspaceProps = {
  userName: string;
  userEmail: string;
  userImage?: string | null;
};

type SavedState = {
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

function ProfileInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const normalizedUrl = normalizeExternalUrl(value);
  const canOpen = Boolean(value.trim());

  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] uppercase tracking-[0.18em] text-stone-500">{label}</span>
      <div className="relative">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-stone-700 bg-stone-900/80 px-3 py-2.5 pr-12 text-sm text-stone-200 placeholder-stone-600 outline-none transition focus:border-stone-500"
        />
        <button
          type="button"
          onClick={() => window.open(normalizedUrl, "_blank", "noopener,noreferrer")}
          disabled={!canOpen}
          title={canOpen ? `Open ${label}` : `Add ${label} first`}
          className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-stone-700 bg-stone-950/80 text-stone-300 transition hover:border-stone-500 hover:text-stone-50 disabled:cursor-not-allowed disabled:border-stone-800 disabled:text-stone-700"
        >
          <ExternalLinkIcon />
        </button>
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
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeFileDataUrl, setResumeFileDataUrl] = useState("");
  const [resumeMimeType, setResumeMimeType] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const [chatEntries, setChatEntries] = useState<ChatEntry[]>([]);

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

  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(storageKey(userEmail));
    if (!raw) return;
    try {
      const saved: SavedState = JSON.parse(raw);
      if (saved.resumeText) setResumeText(saved.resumeText);
      if (saved.resumeFileName) setResumeFileName(saved.resumeFileName);
      if (saved.resumeFileDataUrl) setResumeFileDataUrl(saved.resumeFileDataUrl);
      if (saved.resumeMimeType) setResumeMimeType(saved.resumeMimeType);
      if (saved.jobDescription) setJobDescription(saved.jobDescription);
      if (saved.profile) {
        if (saved.profile.portfolioUrl) setPortfolioUrl(saved.profile.portfolioUrl);
        if (saved.profile.linkedinUrl) setLinkedinUrl(saved.profile.linkedinUrl);
        if (saved.profile.githubUrl) setGithubUrl(saved.profile.githubUrl);
        if (saved.profile.twitterUrl) setTwitterUrl(saved.profile.twitterUrl);
      }
    } catch {}
  }, [userEmail]);

  useEffect(() => {
    const state: SavedState = {
      resumeText,
      resumeFileName,
      resumeFileDataUrl,
      resumeMimeType,
      jobDescription,
      profile: { portfolioUrl, linkedinUrl, githubUrl, twitterUrl },
    };
    localStorage.setItem(storageKey(userEmail), JSON.stringify(state));
  }, [
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
  const canOpenResumeFile = Boolean(resumeFileDataUrl && resumeFileName);
  const isPdfResume = resumeMimeType === "application/pdf" || resumeFileName.toLowerCase().endsWith(".pdf");

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

  async function handleCopyAnswer() {
    if (!answer) return;
    try {
      await navigator.clipboard.writeText(answer);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("error");
    }
  }

  function handlePreviewOpen() {
    if (canOpenResumeFile) {
      setIsPreviewOpen(true);
      return;
    }
    setPreviewMessageOpen(true);
  }

  return (
    <>
      <section id="context" className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-16 sm:px-10 lg:px-12">
        <div className="grid w-full items-start gap-8 lg:grid-cols-[0.84fr_1.16fr]">
        <aside className="space-y-8 rounded-[2rem] border border-stone-300/70 bg-[#171412] p-6 text-stone-100 shadow-[0_24px_70px_rgba(28,25,23,0.16)] sm:p-8">
          <div className="flex items-center gap-3 px-2">
            <img src="/logo.png" alt="Rolequill Logo" className="h-10 w-10 object-contain invert mix-blend-screen" />
            <span className="text-sm font-bold uppercase tracking-[0.24em] text-stone-300">Rolequill</span>
          </div>
          <div className="flex items-center gap-4 rounded-[1.5rem] border border-stone-800 bg-stone-950/40 p-5 sm:p-6">
            {userImage ? (
              <Image
                src={userImage}
                alt={userName}
                width={56}
                height={56}
                unoptimized
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-800 text-lg font-semibold text-stone-200">
                {userName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.24em] text-stone-500">Session</p>
              <p className="mt-1 truncate text-base font-semibold text-stone-50">{userName}</p>
              <p className="truncate text-sm text-stone-400">{userEmail}</p>
            </div>
          </div>



          <div className="rounded-[1.5rem] border border-stone-800 bg-stone-950/40 p-5 space-y-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-stone-500">Profile links</p>
              </div>
            </div>
            <div className="grid gap-3">
              <ProfileInput
                label="Portfolio"
                placeholder="https://yoursite.com"
                value={portfolioUrl}
                onChange={setPortfolioUrl}
              />
              <ProfileInput
                label="LinkedIn"
                placeholder="https://linkedin.com/in/username"
                value={linkedinUrl}
                onChange={setLinkedinUrl}
              />
              <ProfileInput
                label="GitHub"
                placeholder="https://github.com/username"
                value={githubUrl}
                onChange={setGithubUrl}
              />
              <ProfileInput
                label="Twitter / X"
                placeholder="https://x.com/username"
                value={twitterUrl}
                onChange={setTwitterUrl}
              />
            </div>
          </div>


        </aside>

        <div className="space-y-8">
          {hasResume ? (
            <section className="rounded-[2rem] border border-emerald-200/80 bg-[linear-gradient(135deg,#f3fbf6_0%,#eef8f2_52%,#fdfefe_100%)] p-6 shadow-[0_18px_50px_rgba(120,53,15,0.08)] sm:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-emerald-700">Resume saved</p>
                  <h1 className="mt-4 font-serif text-4xl leading-none tracking-[-0.04em] text-stone-950">
                    {resumeFileName}
                  </h1>
                  <p className="mt-3 text-sm text-stone-700">PDF, TXT, MD, RTF</p>
                  {!canOpenResumeFile ? (
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-700">
                      Re-upload once to enable preview.
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handlePreviewOpen}
                    className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-500"
                    title={canOpenResumeFile ? "View resume" : "Re-upload once to enable file preview"}
                  >
                    <EyeIcon />
                    View
                  </button>
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50 transition hover:bg-stone-800">
                    {isUploading ? "Replacing..." : "Replace"}
                    <input
                      type="file"
                      accept=".pdf,.txt,.md,.rtf"
                      onChange={handleResumeUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {uploadError ? (
                <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {uploadError}
                </p>
              ) : null}
            </section>
          ) : (
            <section className="rounded-[2rem] border border-stone-300/70 bg-white/75 p-6 shadow-[0_18px_50px_rgba(120,53,15,0.08)] backdrop-blur sm:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h1 className="font-serif text-5xl leading-none tracking-[-0.04em] text-stone-950">
                    Upload your resume
                  </h1>
                  <p className="mt-3 text-sm text-stone-600">PDF, TXT, MD, RTF</p>
                </div>
                <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50 transition hover:bg-stone-800">
                  {isUploading ? "Uploading..." : "Choose file"}
                  <input
                    type="file"
                    accept=".pdf,.txt,.md,.rtf"
                    onChange={handleResumeUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
              </div>

              {uploadError ? (
                <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {uploadError}
                </p>
              ) : null}
            </section>
          )}

          <section className="rounded-[2rem] border border-stone-300/70 bg-white/80 p-6 shadow-[0_18px_50px_rgba(120,53,15,0.08)] backdrop-blur sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-semibold text-stone-950">Paste the job description</h2>

              </div>
            </div>

            <label className="mt-6 block space-y-2">
              <span className="text-sm font-semibold text-stone-700">Job description</span>
              <textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                rows={10}
                placeholder="Paste the full JD here. Include responsibilities, stack, and the exact prompt if the form gives you one."
                className="w-full rounded-[1.8rem] border border-stone-300 bg-stone-50 px-4 py-4 outline-none transition focus:border-stone-500"
              />
            </label>
          </section>


        </div>
      </div>


      </section>

      <section id="chat" className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-16 sm:px-10 lg:px-12">
        <div className="w-full rounded-[2rem] border border-stone-300/70 bg-white/80 p-6 shadow-[0_18px_50px_rgba(120,53,15,0.08)] backdrop-blur sm:p-8">
        <div className="overflow-hidden rounded-[2rem] border border-stone-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbf8f2_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <div className="max-h-[30rem] min-h-[22rem] overflow-y-auto px-6 py-8">
            {chatEntries.length ? (
              <div className="space-y-6">
                {chatEntries.map((entry) => (
                  <div key={entry.id} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[86%] ${
                        entry.role === "user"
                          ? "rounded-[1.6rem] bg-stone-950 px-5 py-4 text-stone-50 shadow-[0_12px_30px_rgba(28,25,23,0.16)]"
                          : "rounded-[1.6rem] border border-stone-200 bg-white px-5 py-4 text-stone-700 shadow-[0_10px_24px_rgba(120,53,15,0.06)]"
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-7">{entry.content}</p>
                      {entry.role === "assistant" && entry.mode ? (
                        <span className={`mt-4 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyle(entry.mode)}`}>
                          {entry.mode === "groq" ? "AI answer" : "Fallback"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[20rem] flex-col items-center justify-center text-center">
                <div className="inline-flex items-center gap-3 text-stone-900">
                  <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white p-3 shadow-[0_12px_30px_rgba(28,25,23,0.16)] border border-stone-200">
                    <img src="/logo.png" alt="Rolequill Logo" className="h-full w-full object-contain mix-blend-multiply" />
                  </div>
                  <h2 className="font-serif text-5xl leading-none tracking-[-0.04em] text-stone-900">
                    Rolequill chat
                  </h2>
                </div>

              </div>
            )}

            {isAsking ? (
              <div className="mt-6 flex justify-start">
                <div className="max-w-[86%] rounded-[1.6rem] border border-stone-200 bg-white px-5 py-4 text-sm leading-7 text-stone-500 shadow-[0_10px_24px_rgba(120,53,15,0.06)]">
                  Rolequill is drafting your answer...
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-stone-200 bg-[#f6f1e8] px-4 py-4 sm:px-5">
            {askError ? (
              <p className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {askError}
              </p>
            ) : null}

            <div className="rounded-[2rem] border border-stone-300 bg-[#211e1a] p-3 shadow-[0_18px_38px_rgba(28,25,23,0.18)]">
              <div className="flex items-end gap-3">
                <label className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-stone-700 text-stone-300 transition hover:border-stone-500 hover:text-stone-50">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                  </svg>
                  <input
                    type="file"
                    accept=".pdf,.txt,.md,.rtf"
                    onChange={handleResumeUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2 px-1 text-xs uppercase tracking-[0.18em] text-stone-500">
                    <span>Rolequill</span>
                    <span className="text-stone-700">/</span>
                    <span>Application assistant</span>
                  </div>
                  <textarea
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    rows={3}
                    placeholder="How can Rolequill help with this application?"
                    className="min-h-[4.5rem] w-full resize-none bg-transparent px-1 py-1 text-sm leading-7 text-stone-50 outline-none placeholder:text-stone-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAsk}
                  disabled={isAsking || !resumeText.trim() || !jobDescription.trim() || !question.trim()}
                  aria-label={isAsking ? "Sending" : "Send message"}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-50 text-stone-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-stone-500 disabled:text-stone-200"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m7 17 9.5-9.5" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h9v9" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>
      {isPreviewOpen && canOpenResumeFile ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] border border-stone-300 bg-white shadow-[0_24px_80px_rgba(28,25,23,0.28)]">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 transition hover:border-stone-500"
              aria-label="Close preview"
            >
              X
            </button>
            <div className="border-b border-stone-200 px-6 py-5">
              <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Resume preview</p>
              <p className="mt-2 text-base font-semibold text-stone-900">{resumeFileName}</p>
            </div>
            <div className="bg-stone-100 p-4">
              {isPdfResume ? (
                <iframe
                  src={resumeFileDataUrl}
                  title="Saved resume preview"
                  className="h-[75vh] w-full rounded-[1.25rem] bg-white"
                />
              ) : (
                <div className="flex h-[55vh] items-center justify-center rounded-[1.25rem] bg-white px-8 text-center text-sm leading-7 text-stone-600">
                  This file format cannot be previewed inline in every browser. Use Replace to upload a PDF if you want in-app preview.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {previewMessageOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] border border-stone-300 bg-white p-6 shadow-[0_24px_80px_rgba(28,25,23,0.28)]">
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Preview unavailable</p>
            <h3 className="mt-3 text-2xl font-semibold text-stone-950">This saved resume needs one refresh.</h3>
            <p className="mt-4 text-sm leading-7 text-stone-700">
              Your current saved resume came from the older flow that stored only extracted text. Click <span className="font-semibold text-stone-900">Replace</span> once to save the original file too, then the preview dialog will work.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewMessageOpen(false)}
                className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50 transition hover:bg-stone-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}



