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

export type GitHubRepo = {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  description: string;
  url: string;
  homepage: string;
  topics: string[];
  languages: Record<string, number>;
  readme: string;
  stars: number;
  forks: number;
  openIssues: number;
  updatedAt: string;
  pushedAt: string;
  defaultBranch: string;
  visibility: "public" | "private";
  isPrivate: boolean;
  isFork: boolean;
};

export type GitHubHarvestResponse = {
  account: {
    login: string;
    name: string | null;
    avatarUrl: string;
    publicRepos: number;
  };
  repos: GitHubRepo[];
  fetchedAt: string;
};

export type RepoMatch = {
  repoId: number;
  score: number;
  reasons: string[];
};

export type RepoAnalysisResponse = {
  matches: RepoMatch[];
  mode: AskMode;
  model: string;
  message?: string;
};

export type TalkingPointsResponse = {
  repoId: number;
  repoName: string;
  talkingPoints: string[];
  mode: AskMode;
  model: string;
  message?: string;
};
