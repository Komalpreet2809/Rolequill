import Groq from "groq-sdk";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { buildRepoDigest } from "@/lib/github";
import { buildExpandedKeywordSet } from "@/lib/repo-query";
import { GitHubRepo, RepoAnalysisResponse, RepoMatch } from "@/lib/rolequill-assistant";

export const runtime = "nodejs";

const defaultModel = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["matches"],
  properties: {
    matches: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["repoId", "score", "reasons"],
        properties: {
          repoId: { type: "number" },
          score: { type: "number" },
          reasons: {
            type: "array",
            minItems: 2,
            maxItems: 2,
            items: { type: "string" },
          },
        },
      },
    },
  },
} as const;

type AnalyzePayload = {
  jobDescription?: string;
  target?: string;
  topK?: number;
  repos?: GitHubRepo[];
};

function parseTopK(target: string, explicitTopK?: number) {
  if (typeof explicitTopK === "number" && explicitTopK > 0) {
    return Math.max(1, Math.min(20, Math.floor(explicitTopK)));
  }

  const normalized = target.toLowerCase();
  const wordMap: Record<string, number> = {
    one: 1,
    single: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };

  const match = target.match(/\b(\d{1,2})\b/);
  if (match) {
    return Math.max(1, Math.min(20, Number(match[1])));
  }

  for (const [word, value] of Object.entries(wordMap)) {
    if (new RegExp(`\\b${word}\\b`, "i").test(normalized)) {
      return value;
    }
  }

  if (/\bbest project\b|\bbest repo\b|\bone project\b|\bone repo\b|\bsingle project\b|\bsingle repo\b/.test(normalized)) {
    return 1;
  }

  if (/\bproject\b/.test(normalized) && !/\bprojects\b/.test(normalized)) {
    return 1;
  }

  return 5;
}

function repoKeywordScore(target: string, repo: GitHubRepo) {
  const jdTokens = buildExpandedKeywordSet(target);
  const readmeText = repo.readme.slice(0, 2000).toLowerCase();
  const supportText = [
    repo.name,
    repo.fullName,
    repo.description,
    repo.topics.join(" "),
    Object.keys(repo.languages).join(" "),
  ]
    .join(" ")
    .toLowerCase();

  let readmeScore = 0;
  let supportScore = 0;
  for (const token of jdTokens) {
    if (readmeText.includes(token)) readmeScore += 1;
    if (supportText.includes(token)) supportScore += 1;
  }

  return readmeScore * 4 + supportScore;
}

function compactRepoDigest(repo: GitHubRepo) {
  const compactReadme = repo.readme
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1100);

  return [
    compactReadme ? `README excerpt: ${compactReadme}` : "",
    repo.description ? `Description: ${repo.description}` : "",
    repo.topics.length ? `Topics: ${repo.topics.slice(0, 8).join(", ")}` : "",
    Object.keys(repo.languages).length ? `Languages: ${Object.keys(repo.languages).slice(0, 6).join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function selectReposForModel(target: string, repos: GitHubRepo[]) {
  return [...repos]
    .sort((a, b) => repoKeywordScore(target, b) - repoKeywordScore(target, a))
    .slice(0, 8);
}

function buildFallbackMatches(target: string, repos: GitHubRepo[], topK: number) {
  const jdTokens = buildExpandedKeywordSet(target);

  return repos
    .map((repo) => {
      const digest = buildRepoDigest(repo).toLowerCase();
      const readmeText = repo.readme.toLowerCase();
      const readmeMatches = [...jdTokens].filter((token) => readmeText.includes(token));
      const supportMatches = [...jdTokens].filter((token) => digest.includes(token) && !readmeMatches.includes(token));
      const weightedHits = readmeMatches.length * 4 + supportMatches.length;
      const score = Math.max(1, Math.min(10, Math.round((weightedHits / Math.max(jdTokens.size * 2, 10)) * 10)));

      const reasons = [
        readmeMatches.length
          ? `The README explicitly covers ${readmeMatches.slice(0, 3).join(", ")}.`
          : "The README provides the strongest available project evidence for this request.",
        Object.keys(repo.languages).length
          ? `The implementation uses ${Object.keys(repo.languages).slice(0, 3).join(", ")}.`
          : repo.description
            ? `The supporting repo metadata reinforces ${supportMatches.slice(0, 3).join(", ") || "the project scope"}.`
            : "The supporting repo metadata is limited, so the README is doing most of the ranking work.",
      ];

      return {
        repoId: repo.id,
        score,
        reasons,
      } satisfies RepoMatch;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

function buildPrompt(target: string, repos: GitHubRepo[], topK: number) {
  const repoPayload = repos.map((repo) => ({
    repoId: repo.id,
    name: repo.fullName,
    topics: repo.topics,
    languages: Object.keys(repo.languages),
    digest: compactRepoDigest(repo),
  }));

  return [
    "Ranking Request:",
    target,
    "",
    `Return the best ${topK} repositories for this request.`,
    "",
    "Repositories:",
    JSON.stringify(repoPayload, null, 2),
  ].join("\n");
}

function normalizeMatches(
  matches: RepoMatch[],
  target: string,
  repos: GitHubRepo[],
  topK: number
) {
  const validMatches = matches
    .filter((match) => repos.some((repo) => repo.id === match.repoId))
    .sort((a, b) => b.score - a.score);

  if (validMatches.length >= topK) {
    return validMatches.slice(0, topK);
  }

  const fallbackMatches = buildFallbackMatches(target, repos, topK);
  const seen = new Set(validMatches.map((match) => match.repoId));
  const filledMatches = [...validMatches];

  for (const match of fallbackMatches) {
    if (seen.has(match.repoId)) continue;
    filledMatches.push(match);
    seen.add(match.repoId);
    if (filledMatches.length >= topK) break;
  }

  return filledMatches.slice(0, topK);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as AnalyzePayload;
  const rankingPrompt = payload.target?.trim() || "";
  const jobDescription = payload.jobDescription?.trim() || "";
  const target = rankingPrompt && jobDescription ? `${rankingPrompt}\n\nJob Description:\n${jobDescription}` : rankingPrompt || jobDescription;
  const repos = Array.isArray(payload.repos) ? payload.repos : [];
  const topK = parseTopK(rankingPrompt || jobDescription, payload.topK);

  if (!target) {
    return NextResponse.json({ error: "A ranking prompt or job description is required." }, { status: 400 });
  }

  if (!repos.length) {
    return NextResponse.json({ error: "At least one repository is required." }, { status: 400 });
  }

  const candidateRepos = selectReposForModel(target, repos);

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({
      matches: buildFallbackMatches(target, repos, topK),
      mode: "mock",
      model: "heuristic-fallback",
      message: "GROQ_API_KEY is not set, so Rolequill used local repo scoring.",
    } satisfies RepoAnalysisResponse);
  }

  try {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const response = await client.chat.completions.create({
      model: defaultModel,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: [
            "You are an engineering recruiter assistant.",
            "Given a ranking request and a set of GitHub repositories, score each repo from 1 to 10 for relevance.",
            "Prioritize README evidence first.",
            "Use repo description, topics, and languages only as secondary supporting signals.",
            "If the request uses a category label like EDA, infer the category from related README evidence even when the exact acronym is absent.",
            "Return the strongest repos first.",
            "Each repo must have exactly 2 short reasons.",
            `Return exactly ${topK} matches unless there are fewer than ${topK} repositories available.`,
            "Return JSON only.",
          ].join("\n"),
        },
        {
          role: "user",
          content: buildPrompt(target, candidateRepos, topK),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "repo_analysis",
          schema: responseSchema,
        },
      },
    });

    const content = response.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(content) as { matches: RepoMatch[] };

    return NextResponse.json({
      matches: normalizeMatches(parsed.matches, target, candidateRepos, topK),
      mode: "groq",
      model: defaultModel,
    } satisfies RepoAnalysisResponse);
  } catch (error) {
    console.error("GitHub repo analysis failed", error);

    return NextResponse.json({
      matches: buildFallbackMatches(target, repos, topK),
      mode: "mock",
      model: "heuristic-fallback",
      message: "The AI analysis failed, so Rolequill used local repo scoring.",
    } satisfies RepoAnalysisResponse);
  }
}
