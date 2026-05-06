export type ResumeParseResponse = {
  fileName: string;
  text: string;
};

export type AskMode = "groq" | "mock";

export type AskResponse = {
  answer: string;
  mode: AskMode;
  model: string;
  message?: string;
};

export type ProfileData = {
  portfolioUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  twitterUrl?: string;
};
