import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { fetchGitHubAccount, harvestGitHubRepos } from "@/lib/github";
import { GitHubHarvestResponse } from "@/lib/rolequill-assistant";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "GitHub access token missing." }, { status: 401 });
  }

  try {
    const [account, repos] = await Promise.all([
      fetchGitHubAccount(session.accessToken),
      harvestGitHubRepos(session.accessToken),
    ]);

    return NextResponse.json({
      account,
      repos,
      fetchedAt: new Date().toISOString(),
    } satisfies GitHubHarvestResponse);
  } catch (error) {
    console.error("GitHub repo harvest failed", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "GitHub repo harvest failed.",
      },
      { status: 500 }
    );
  }
}
