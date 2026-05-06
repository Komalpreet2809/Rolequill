export type StepId = "profile" | "role" | "answers";
export type Tone = "Concise" | "Confident" | "Formal";
export type Length = "Short" | "Balanced" | "Detailed";
export type DraftGenerationMode = "groq" | "mock";

export type Draft = {
  id: string;
  label: string;
  answer: string;
  source: string;
};

export type RolequillInput = {
  name: string;
  headline: string;
  strengths: string;
  project: string;
  projectImpact: string;
  github: string;
  resume: string;
  company: string;
  role: string;
  description: string;
  tone: Tone;
  length: Length;
};

export type RolequillResponse = {
  drafts: Draft[];
  mode: DraftGenerationMode;
  model: string;
  message?: string;
};
