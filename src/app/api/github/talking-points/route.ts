import Groq from "groq-sdk";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { buildRepoDigest } from "@/lib/github";
import { GitHubRepo, TalkingPointsResponse } from "@/lib/rolequill-assistant";

export const runtime = "nodejs";

const defaultModel = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["talkingPoints"],
  properties: {
    talkingPoints: {
      type: "array",
      minItems: 2,
      maxItems: 3,
      items: { type: "string" },
    },
  },
} as const;

type TalkingPointsPayload = {
  jobDescription?: string;
  repo?: GitHubRepo;
};

function fallbackTalkingPoints(jobDescription: string, repo: GitHubRepo) {
  const roleLabel = jobDescription.split("\n")[0].slice(0, 80) || "the role";
  const languages = Object.keys(repo.languages).slice(0, 3).join(", ");

  return [
    `I would highlight ${repo.fullName} because it shows hands-on delivery work that maps directly to ${roleLabel}.`,
    repo.description
      ? `I can explain how the project solves ${repo.description.toLowerCase()} and why that matters for this job.`
      : `I can connect the project scope to the responsibilities in this job description without overstating it.`,
    languages
      ? `I can point to the technical execution in ${languages} as proof that I have built, debugged, and shipped real work.`
      : `I can use the README and project structure to talk through the technical decisions I made.`,
  ];
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as TalkingPointsPayload;
  const jobDescription = payload.jobDescription?.trim() ?? "";
  const repo = payload.repo;

  if (!jobDescription || !repo) {
    return NextResponse.json({ error: "Job description and repository are required." }, { status: 400 });
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({
      repoId: repo.id,
      repoName: repo.fullName,
      talkingPoints: fallbackTalkingPoints(jobDescription, repo),
      mode: "mock",
      model: "heuristic-fallback",
      message: "GROQ_API_KEY is not set, so Rolequill used local talking points.",
    } satisfies TalkingPointsResponse);
  }

  try {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const response = await client.chat.completions.create({
      model: defaultModel,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: [
            "You turn project evidence into interview-ready talking points.",
            "Write 2 or 3 first-person talking points the candidate could actually say out loud.",
            "Keep them concrete, credible, and grounded in the repository details and the job description.",
            "Return JSON only.",
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            "Job Description:",
            jobDescription,
            "",
            "Repository:",
            buildRepoDigest(repo),
          ].join("\n"),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "repo_talking_points",
          schema: responseSchema,
        },
      },
    });

    const content = response.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(content) as { talkingPoints: string[] };

    return NextResponse.json({
      repoId: repo.id,
      repoName: repo.fullName,
      talkingPoints: parsed.talkingPoints,
      mode: "groq",
      model: defaultModel,
    } satisfies TalkingPointsResponse);
  } catch (error) {
    console.error("GitHub talking points failed", error);

    return NextResponse.json({
      repoId: repo.id,
      repoName: repo.fullName,
      talkingPoints: fallbackTalkingPoints(jobDescription, repo),
      mode: "mock",
      model: "heuristic-fallback",
      message: "The AI request failed, so Rolequill used local talking points.",
    } satisfies TalkingPointsResponse);
  }
}
