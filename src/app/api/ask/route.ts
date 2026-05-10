import Groq from "groq-sdk";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { AskResponse, ProfileData } from "@/lib/rolequill-assistant";

export const runtime = "nodejs";

const defaultModel = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

type AskPayload = {
  resumeText?: string;
  jobDescription?: string;
  question?: string;
  profile?: ProfileData;
  githubContext?: string;
  chatHistory?: { role: "user" | "assistant"; content: string }[];
};

type NormalizedAskPayload = {
  resumeText: string;
  jobDescription: string;
  question: string;
  profile: ProfileData;
  githubContext?: string;
  chatHistory: { role: "user" | "assistant"; content: string }[];
};

function isCasualPrompt(question: string) {
  const normalized = question.trim().toLowerCase();
  return /^(hi|hey|hello|yo|sup|thanks|thank you|cool|okay|ok)$/.test(normalized);
}

function shouldUseRepoContext(question: string) {
  const normalized = question.toLowerCase();
  return /(project|projects|repo|repos|repository|repositories|github|portfolio|architecture|tech stack|codebase|talking point|talking points)/.test(
    normalized
  );
}

function shouldUseJobContext(question: string) {
  const normalized = question.toLowerCase();
  return /(job description|job profile|role profile|\bjd\b|consider the job|consider job|consider the role|consider role|take .*job profile.*consideration|take .*job description.*consideration|take .*jd.*consideration|for this role|for the role|for this job|fit for the role|fit for this role|fit for the job|job fit|role fit|match this role|match this job|aligned with the role|according to the jd)/.test(
    normalized
  );
}

function shouldUseResumeContext(question: string) {
  const normalized = question.toLowerCase();
  return /(resume|cv|experience|skills|background|education|strength|strengths|weakness|weaknesses|introduce me|tell me about myself|based on my profile)/.test(
    normalized
  );
}

function shouldContinueJobContextFromHistory(history: { role: "user" | "assistant"; content: string }[]) {
  const combined = history
    .slice(-6)
    .map((entry) => entry.content.toLowerCase())
    .join("\n");

  return /(job description|job profile|role profile|\bjd\b|for this role|for the role|for this job|fit for the role|fit for the job|consider the job|consider the role|according to the jd)/.test(
    combined
  );
}

function shouldContinueRepoContextFromHistory(history: { role: "user" | "assistant"; content: string }[]) {
  const combined = history
    .slice(-6)
    .map((entry) => entry.content.toLowerCase())
    .join("\n");

  return /(project|projects|repo|repos|repository|repositories|github|architecture|tech stack|codebase|portfolio)/.test(
    combined
  );
}

function buildFallbackAnswer(payload: NormalizedAskPayload) {
  if (isCasualPrompt(payload.question)) {
    return "Hey. What do you want to work on?";
  }

  const useRepoContext = shouldUseRepoContext(payload.question) || shouldContinueRepoContextFromHistory(payload.chatHistory);
  const useJobContext = shouldUseJobContext(payload.question) || shouldContinueJobContextFromHistory(payload.chatHistory);
  const useResumeContext = shouldUseResumeContext(payload.question);

  if (!useRepoContext && !useJobContext && !useResumeContext) {
    return `Here is a normal draft reply to "${payload.question}". Tell me what direction you want, and I can make it more concise, technical, or detailed.`;
  }

  return [
    `## Answer`,
    "",
    useJobContext
      ? "I considered the job profile because you explicitly asked for role-based grounding."
      : "I answered normally and only used the background context that your question directly called for.",
    "",
    `Question: "${payload.question}"`,
    "",
    ...(useResumeContext || (useRepoContext && payload.githubContext) || useJobContext ? ["## Context Used"] : []),
    ...(useResumeContext ? ["- Resume context"] : []),
    ...(useRepoContext && payload.githubContext ? ["- GitHub project context"] : []),
    ...(useJobContext ? ["- Job description context"] : []),
  ].join("\n");
}

function buildProfileSection(profile: ProfileData | undefined): string {
  if (!profile) return "";
  const lines: string[] = [];
  if (profile.portfolioUrl) lines.push(`Portfolio: ${profile.portfolioUrl}`);
  if (profile.linkedinUrl) lines.push(`LinkedIn: ${profile.linkedinUrl}`);
  if (profile.githubUrl) lines.push(`GitHub: ${profile.githubUrl}`);
  if (profile.twitterUrl) lines.push(`Twitter/X: ${profile.twitterUrl}`);
  if (!lines.length) return "";
  return `Candidate profile links:\n${lines.join("\n")}`;
}

function buildMessages(payload: NormalizedAskPayload) {
  const profileSection = buildProfileSection(payload.profile);
  const includeRepoContext = shouldUseRepoContext(payload.question) || shouldContinueRepoContextFromHistory(payload.chatHistory);
  const includeJobContext = shouldUseJobContext(payload.question) || shouldContinueJobContextFromHistory(payload.chatHistory);
  const includeResumeContext = shouldUseResumeContext(payload.question) || includeJobContext;
  const userParts = [
    ...(includeResumeContext ? [`Resume Content (Highlights Only):\n${payload.resumeText || "None provided"}`] : []),
    ...(includeJobContext ? [`Job Description (Target Role):\n${payload.jobDescription || "None provided"}`] : []),
    ...(includeRepoContext && payload.githubContext ? [`GitHub Repository Context:\n${payload.githubContext}`] : []),
    ...((includeResumeContext || includeRepoContext || includeJobContext) && profileSection ? [profileSection] : []),
    ...(payload.chatHistory.length
      ? [
          "Recent Conversation History:",
          ...payload.chatHistory.map((entry) => `${entry.role === "user" ? "User" : "Assistant"}: ${entry.content}`),
        ]
      : []),
    `Current User Question:\n${payload.question}`,
  ];

  return [
    {
      role: "system" as const,
      content: [
        "You are Rolequill, a normal conversational assistant.",
        "Talk naturally, like ChatGPT.",
        "The user may have resume, job-description, portfolio, and GitHub project context available, but that context is background knowledge, not the main subject unless the user asks for it.",
        "If the user says something casual like hello, hey, thanks, or asks a general question, respond briefly and normally. Do not force career analysis, tables, or structured recruiter-style output.",
        "Do not use the job description unless the user explicitly asks you to consider the job, JD, role, job profile, or role fit.",
        "However, if the recent conversation already established that the user wants the JD or role considered, maintain that context for direct follow-up questions in the same chat.",
        "Use GitHub project context only when the question is about projects, architecture, GitHub, repositories, portfolio work, or similar technical work.",
        "If the recent conversation is clearly about repos or projects, maintain that repo context for direct follow-up questions in the same chat.",
        "When repo context is available, treat README content as the primary source of truth about what a project actually does.",
        "Use descriptions, topics, and languages only as supporting metadata around the README.",
        "Use resume context only when the question is about the user's background, skills, experience, or when the user explicitly asks for role-fit reasoning.",
        "When the user does ask context-dependent questions, ground the answer in the available context and be accurate.",
        "Use recent conversation history to resolve references like 'that', 'it', 'this role', or 'the pay'.",
        "Do not guess project details that are not supported by the provided repo context.",
        "Do not impersonate the user. Refer to the user in the second person.",
        "Formatting rules:",
        "1. Start with the direct answer in 1 to 2 sentences.",
        "2. Then, if useful, add short sections with markdown headings like 'Why', 'Evidence', 'Best Projects', or 'Next Step'.",
        "3. Prefer bullets over long paragraphs.",
        "4. Keep paragraphs short, usually 1 to 3 lines.",
        "5. Use tables only for explicit comparisons or ranked lists.",
        "6. Do not bury the answer under setup or disclaimers.",
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: userParts.filter(p => p.trim().length > 5).join("\n\n"),
    },
  ];
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as AskPayload;
  const resumeText = payload.resumeText?.trim() ?? "";
  const jobDescription = payload.jobDescription?.trim() ?? "";
  const question = payload.question?.trim() ?? "";

  if (!question) {
    return NextResponse.json(
      { error: "A question is required." },
      { status: 400 }
    );
  }

  const normalizedPayload: NormalizedAskPayload = {
    resumeText,
    jobDescription,
    question,
    profile: payload.profile ?? {},
    githubContext: payload.githubContext?.trim() ?? "",
    chatHistory: Array.isArray(payload.chatHistory) ? payload.chatHistory.slice(-8) : [],
  };

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({
      answer: buildFallbackAnswer(normalizedPayload),
      mode: "mock",
      model: "template-fallback",
      message: "GROQ_API_KEY is not set, so Rolequill is using the local fallback answer.",
    } satisfies AskResponse);
  }

  try {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await client.chat.completions.create({
      model: defaultModel,
      messages: buildMessages(normalizedPayload),
      temperature: 0.3,
    });

    const answer = completion.choices[0]?.message?.content?.trim();

    if (!answer) {
      throw new Error("Groq returned an empty answer.");
    }

    return NextResponse.json({
      answer,
      mode: "groq",
      model: defaultModel,
    } satisfies AskResponse);
  } catch (error) {
    console.error("Rolequill ask route failed", error);

    return NextResponse.json({
      answer: buildFallbackAnswer(normalizedPayload),
      mode: "mock",
      model: "template-fallback",
      message: "The Groq request failed, so Rolequill fell back to the local answer generator.",
    } satisfies AskResponse);
  }
}
