import { Draft, Length, RolequillInput, Tone } from "@/lib/rolequill";

function sentenceCase(value: string) {
  if (!value.trim()) {
    return "your background";
  }

  return value.trim();
}

function toBullets(text: string) {
  return text
    .split(/\r?\n|,/) 
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function trimDescription(text: string, fallback: string) {
  const value = text.trim();
  if (!value) {
    return fallback;
  }

  const normalized = value.replace(/\s+/g, " ");
  return normalized.length > 190 ? `${normalized.slice(0, 187)}...` : normalized;
}

function buildOpening(tone: Tone) {
  if (tone === "Concise") {
    return "I fit this role because";
  }

  if (tone === "Formal") {
    return "I believe I am well aligned with this position because";
  }

  return "I am a strong fit for this role because";
}

function buildLengthSuffix(length: Length) {
  if (length === "Short") {
    return "I can expand on this with a project-specific example if needed.";
  }

  if (length === "Detailed") {
    return "That combination of hands-on execution, relevant tooling, and clear project ownership is what I would bring into this position.";
  }

  return "That gives me a practical foundation to contribute quickly in this role.";
}

export function createDrafts(input: RolequillInput): Draft[] {
  const strengths = toBullets(input.strengths);
  const role = sentenceCase(input.role || "this role");
  const company = sentenceCase(input.company || "the company");
  const project = sentenceCase(input.project || "a strong recent project");
  const projectImpact = trimDescription(
    input.projectImpact,
    "It reflects end-to-end ownership, practical implementation, and clear technical decision-making."
  );
  const headline = sentenceCase(input.headline || "a builder with relevant hands-on experience");
  const resumeSignal = input.resume.trim()
    ? "your uploaded resume details"
    : "the profile information you entered";
  const githubSignal = input.github.trim() ? "your linked GitHub work" : "your listed projects";
  const roleNeed = trimDescription(
    input.description,
    "the responsibilities and skills highlighted in the job description"
  );
  const strengthsText =
    strengths.length > 0
      ? strengths.join(", ")
      : "full-stack execution, structured problem solving, and project ownership";
  const opening = buildOpening(input.tone);
  const suffix = buildLengthSuffix(input.length);

  return [
    {
      id: "fit",
      label: "Why are you a fit for this role?",
      source: `Grounded in ${resumeSignal}, ${githubSignal}, and the target role description.`,
      answer: `${opening} my profile already shows ${strengthsText}. I am targeting ${role}, and the role description emphasizes ${roleNeed}. Across ${resumeSignal} and ${githubSignal}, I can point to concrete evidence instead of generic claims. ${suffix}`,
    },
    {
      id: "project",
      label: "Which project best represents your experience?",
      source: `Grounded in the project notes for ${project}.`,
      answer: `${project} is the strongest project to highlight for ${company} because it best reflects ${headline}. ${projectImpact} It is relevant to ${role} because it demonstrates that I can translate requirements into a working product and explain the tradeoffs behind the implementation.`,
    },
    {
      id: "challenge",
      label: "Tell us about a challenge you solved.",
      source: "Grounded in your project and strengths summary.",
      answer: `One challenge I consistently solve is turning vague requirements into a structured build plan. In projects like ${project}, I had to decide what to prioritize first, break the work into smaller deliverables, and keep the solution aligned with the final user need. That matters for ${role} because the job description is not just asking for tools, it is asking for ownership and judgment.`,
    },
    {
      id: "motivation",
      label: "Why do you want to work here?",
      source: "Grounded in the job title, company name, and your profile focus.",
      answer: `I am interested in ${company} because this ${role} lines up with the kind of work I want to keep deepening: ${headline}. The role appears to value ${strengthsText}, and that is where I can contribute with real examples from ${project} and the rest of my profile rather than starting from zero for every application.`,
    },
  ];
}
