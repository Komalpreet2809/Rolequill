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

const quickQuestions = [
  "Why am I a strong fit for this role?",
  "What project should I highlight for this job?",
  "Write a concise answer for this application prompt.",
];

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
  const [question, setQuestion] = useState("Why am I a strong fit for this role?");
  const [answer, setAnswer] = useState("");
  const [chatEntries, setChatEntries] = useState<ChatEntry[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Ask your application question below and I will answer from your resume and the current job description.",
      mode: null,
    },
  ]);
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
    <section className="mx-auto w-full max-w-7xl px-6 pb-20 pt-10 sm:px-10 lg:px-12">
      <div className="grid items-start gap-8 lg:grid-cols-[0.84fr_1.16fr]">
        <aside className="space-y-5 rounded-[2rem] border border-stone-300/70 bg-[#171412] p-6 text-stone-100 shadow-[0_24px_70px_rgba(28,25,23,0.16)]">
          <div className="flex items-center gap-4 rounded-[1.5rem] border border-stone-800 bg-stone-950/40 p-4">
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

          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Rolequill</p>
            <h2 className="mt-3 font-serif text-4xl leading-none text-stone-50">
              Resume in. Job description in. Ask anything.
            </h2>
          </div>

          <div className="rounded-[1.5rem] border border-stone-800 bg-stone-950/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-stone-500">Status</p>
                <p className="mt-2 text-lg font-semibold text-stone-50">{statusLabel(mode, model)}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle(mode)}`}>
                {hasResume ? "Profile loaded" : "Waiting for resume"}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-stone-300">
              {message ?? "Upload the resume, paste the JD, and ask one focused application question."}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-stone-800 bg-stone-950/40 p-4 space-y-3">
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

          <div className="rounded-[1.5rem] border border-stone-800 p-4 text-sm leading-7 text-stone-300">
            <p className="text-[11px] uppercase tracking-[0.24em] text-stone-500">Accepted formats</p>
            <p className="mt-2">PDF, TXT, and other text-based files. Rolequill keeps the uploaded file and extracts text in the background for AI answers.</p>
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
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-700">
                    This file stays loaded until you replace it.
                    {!canOpenResumeFile ? " Re-upload it once to enable preview in the dialog." : ""}
                  </p>
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
              <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h1 className="font-serif text-5xl leading-none tracking-[-0.04em] text-stone-950">
                    Upload your resume
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600">
                    Upload it once. Rolequill keeps the original file on this device and extracts text in the background for AI answers.
                  </p>
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
                <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
                  Add the target role description so the answer matches the company context, required skills, and writing style.
                </p>
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


      <section className="mt-8 rounded-[2rem] border border-stone-300/70 bg-white/80 p-6 shadow-[0_18px_50px_rgba(120,53,15,0.08)] backdrop-blur sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-stone-950">Ask AI your application question</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
              Use it like a focused chatbot. Keep the same resume and JD context, then ask follow-up questions freely.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {answer ? (
              <button
                type="button"
                onClick={handleCopyAnswer}
                className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-500"
              >
                {copyState === "copied" ? "Copied" : copyState === "error" ? "Copy failed" : "Copy"}
              </button>
            ) : null}
            <span className={`rounded-full border px-3 py-2 text-xs font-semibold ${statusStyle(mode)}`}>
              {statusLabel(mode, model)}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {quickQuestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setQuestion(item)}
              className="rounded-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 transition hover:border-stone-500"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-[1.8rem] border border-stone-300/80 bg-[#fcfaf6]">
          <div className="max-h-[24rem] min-h-[18rem] space-y-4 overflow-y-auto px-5 py-5">
            {chatEntries.map((entry) => (
              <div key={entry.id} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] rounded-[1.5rem] px-4 py-3 text-sm leading-7 shadow-sm sm:max-w-[78%] ${
                    entry.role === "user"
                      ? "bg-stone-950 text-stone-50"
                      : "border border-stone-200 bg-white text-stone-700"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{entry.content}</p>
                  {entry.role === "assistant" && entry.mode ? (
                    <span className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyle(entry.mode)}`}>
                      {entry.mode === "groq" ? "AI answer" : "Fallback"}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}

            {isAsking ? (
              <div className="flex justify-start">
                <div className="max-w-[78%] rounded-[1.5rem] border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500 shadow-sm">
                  Rolequill is drafting your answer...
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-stone-200 px-5 py-4">
            {askError ? (
              <p className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {askError}
              </p>
            ) : null}

            <div className="rounded-[1.6rem] border border-stone-300 bg-white p-3 shadow-sm">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={4}
                placeholder="Ask Rolequill anything about this application."
                className="w-full resize-none bg-transparent px-2 py-2 text-sm leading-7 text-stone-800 outline-none placeholder:text-stone-400"
              />
              <div className="mt-3 flex items-center justify-end gap-3 px-2 pb-1">
                <button
                  type="button"
                  onClick={handleAsk}
                  disabled={isAsking || !resumeText.trim() || !jobDescription.trim() || !question.trim()}
                  className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-500"
                >
                  {isAsking ? "Sending..." : "Send"}
                </button>
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
    </section>
  );
}



