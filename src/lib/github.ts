import { GitHubRepo } from "@/lib/rolequill-assistant";

const githubApiBase = "https://api.github.com";
const githubHeaders = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
} as const;

type GitHubUser = {
  login: string;
  name: string | null;
  avatar_url: string;
  public_repos: number;
};

type GitHubApiRepo = {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  description: string | null;
  html_url: string;
  homepage: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  updated_at: string;
  pushed_at: string;
  default_branch: string;
  private: boolean;
  fork: boolean;
  archived: boolean;
};

function authorizationHeaders(accessToken: string) {
  return {
    ...githubHeaders,
    Authorization: `Bearer ${accessToken}`,
  };
}

async function fetchGitHubJson<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${githubApiBase}${path}`, {
    headers: authorizationHeaders(accessToken),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${path} failed (${response.status}): ${body.slice(0, 160)}`);
  }

  return response.json() as Promise<T>;
}

async function fetchAllRepos(accessToken: string): Promise<GitHubApiRepo[]> {
  const repos: GitHubApiRepo[] = [];

  for (let page = 1; page <= 100; page += 1) {
    const batch = await fetchGitHubJson<GitHubApiRepo[]>(
      `/user/repos?per_page=100&page=${page}&sort=updated&direction=desc&affiliation=owner`,
      accessToken
    );

    repos.push(...batch);

    if (batch.length < 100) {
      break;
    }
  }

  return repos
    .filter((repo) => !repo.archived)
    .sort((a, b) => Date.parse(b.pushed_at) - Date.parse(a.pushed_at));
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function fetchReadme(owner: string, repo: string, accessToken: string): Promise<string> {
  const response = await fetch(`${githubApiBase}/repos/${owner}/${repo}/readme`, {
    headers: authorizationHeaders(accessToken),
    cache: "no-store",
  });

  if (response.status === 404) {
    return "";
  }

  if (!response.ok) {
    return "";
  }

  const payload = (await response.json()) as { content?: string; encoding?: string };

  if (!payload.content) {
    return "";
  }

  if (payload.encoding === "base64") {
    return Buffer.from(payload.content, "base64").toString("utf-8").replace(/\0/g, "");
  }

  return payload.content;
}

async function fetchLanguages(owner: string, repo: string, accessToken: string): Promise<Record<string, number>> {
  try {
    return await fetchGitHubJson<Record<string, number>>(`/repos/${owner}/${repo}/languages`, accessToken);
  } catch {
    return {};
  }
}

function trimReadme(readme: string) {
  return readme.replace(/\s+/g, " ").trim().slice(0, 4000);
}

function normalizeRepo(repo: GitHubApiRepo, readme: string, languages: Record<string, number>): GitHubRepo {
  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner.login,
    description: repo.description ?? "",
    url: repo.html_url,
    homepage: repo.homepage ?? "",
    topics: repo.topics ?? [],
    languages,
    readme: trimReadme(readme),
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    openIssues: repo.open_issues_count,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    defaultBranch: repo.default_branch,
    visibility: repo.private ? "private" : "public",
    isPrivate: repo.private,
    isFork: repo.fork,
  };
}

export function buildRepoDigest(repo: GitHubRepo) {
  return [
    `Repository: ${repo.fullName}`,
    repo.description ? `Description: ${repo.description}` : "",
    repo.topics.length ? `Topics: ${repo.topics.join(", ")}` : "",
    Object.keys(repo.languages).length ? `Languages: ${Object.keys(repo.languages).join(", ")}` : "",
    repo.readme ? `README: ${repo.readme}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function fetchGitHubAccount(accessToken: string) {
  const user = await fetchGitHubJson<GitHubUser>("/user", accessToken);
  return {
    login: user.login,
    name: user.name,
    avatarUrl: user.avatar_url,
    publicRepos: user.public_repos,
  };
}

export async function harvestGitHubRepos(accessToken: string): Promise<GitHubRepo[]> {
  const repos = await fetchAllRepos(accessToken);
  const enriched = await mapWithConcurrency(
    repos,
    6,
    async (repo) => {
      const [readme, languages] = await Promise.all([
        fetchReadme(repo.owner.login, repo.name, accessToken),
        fetchLanguages(repo.owner.login, repo.name, accessToken),
      ]);

      return normalizeRepo(repo, readme, languages);
    }
  );

  return enriched;
}
