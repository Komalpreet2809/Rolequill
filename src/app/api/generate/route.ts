import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { createDrafts } from "@/lib/draft-generator";
import { Draft, RolequillInput, RolequillResponse } from "@/lib/rolequill";

export const runtime = "nodejs";

const defaultModel = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

const draftSchema = {
  type: "object",
  additionalProperties: false,
  required: ["drafts"],
  properties: {
    drafts: {
      type: "array",
      minItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "answer", "source"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          answer: { type: "string" },
          source: { type: "string" }
        }
      }
    }
  }
} as const;

function normalizeInput(payload: Partial<RolequillInput>): RolequillInput {
  return {
    name: payload.name ?? "",
    headline: payload.headline ?? "",
    strengths: payload.strengths ?? "",
    project: payload.project ?? "",
    projectImpact: payload.projectImpact ?? "",
    github: payload.github ?? "",
    resume: payload.resume ?? "",
    company: payload.company ?? "",
    role: payload.role ?? "",
    description: payload.description ?? "",
    tone: payload.tone ?? "Confident",
    length: payload.length ?? "Balanced",
  };
}

function buildFallbackResponse(input: RolequillInput, message?: string): RolequillResponse {
  return {
    drafts: createDrafts(input),
    mode: "mock",
    model: "template-fallback",
    message,
  };
}

function buildSystemPrompt() {
  return [
    "You are Rolequill, a grounded job-application drafting assistant.",
    "Write four tailored answers for a job application.",
    "Use only the candidate data provided.",
    "Do not invent experience, companies, metrics, or tools.",
    "If the candidate data is weak or missing, write cautiously and stay truthful.",
    "Keep the tone aligned with the requested tone and length.",
    "Return JSON only that matches the requested schema.",
  ].join("\n");
}

function buildUserPrompt(input: RolequillInput) {
  return [
    "Candidate and role data:",
    JSON.stringify(input, null, 2),
  ].join("\n");
}

function extractDrafts(raw: string): Draft[] {
  const parsed = JSON.parse(raw) as { drafts?: Draft[] };

  if (!Array.isArray(parsed.drafts) || parsed.drafts.length === 0) {
    throw new Error("Model response did not include drafts.");
  }

  return parsed.drafts.map((draft, index) => ({
    id: draft.id || `draft-${index + 1}`,
    label: draft.label || `Draft ${index + 1}`,
    answer: draft.answer || "",
    source: draft.source || "Grounded in the provided profile and role inputs.",
  }));
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Partial<RolequillInput>;
  const input = normalizeInput(payload);

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      buildFallbackResponse(
        input,
        "GROQ_API_KEY is not set, so Rolequill is using the local template fallback."
      )
    );
  }

  try {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const response = await client.chat.completions.create({
      model: defaultModel,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(),
        },
        {
          role: "user",
          content: buildUserPrompt(input),
        },
      ],
      temperature: 0.3,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "rolequill_drafts",
          schema: draftSchema,
        },
      },
    });

    const content = response.choices[0]?.message?.content || "";
    const drafts = extractDrafts(content);

    return NextResponse.json({
      drafts,
      mode: "groq",
      model: defaultModel,
    } satisfies RolequillResponse);
  } catch (error) {
    console.error("Rolequill generate route failed", error);

    return NextResponse.json(
      buildFallbackResponse(
        input,
        "The Groq request failed, so Rolequill fell back to the local template generator."
      )
    );
  }
}
