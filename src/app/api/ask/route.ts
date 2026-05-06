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
};

type NormalizedAskPayload = {
  resumeText: string;
  jobDescription: string;
  question: string;
  profile: ProfileData;
};

function buildFallbackAnswer(payload: NormalizedAskPayload) {
  return [
    `Here is a grounded draft for the question: \"${payload.question}\".`,
    "",
    "Based on the resume context and the job description, I would answer by focusing on the most relevant experience, the strongest matching project, and the skills that directly support the role requirements.",
    "",
    "To make this stronger, keep the answer tied to specific achievements from your resume and relate them directly to the role's expectations.",
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
  const userParts = [
    `Resume:\n${payload.resumeText}`,
    `Job description:\n${payload.jobDescription}`,
    ...(profileSection ? [profileSection] : []),
    `Question:\n${payload.question}`,
  ];

  return [
    {
      role: "system" as const,
      content: [
        "You are Rolequill, a grounded job application assistant.",
        "Answer in first person as the candidate.",
        "Use only the resume, job description, and profile links provided.",
        "When relevant, reference the candidate's portfolio or social links naturally.",
        "Do not invent facts, projects, metrics, companies, or experience.",
        "If key information is missing, stay cautious and truthful.",
        "Write a polished application-style answer, not bullet points.",
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: userParts.join("\n\n"),
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

  if (!resumeText || !jobDescription || !question) {
    return NextResponse.json(
      { error: "Resume text, job description, and question are required." },
      { status: 400 }
    );
  }

  const normalizedPayload: NormalizedAskPayload = {
    resumeText,
    jobDescription,
    question,
    profile: payload.profile ?? {},
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



