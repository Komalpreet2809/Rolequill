import Groq from "groq-sdk";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { AskResponse, ProfileData } from "@/lib/rolequill-assistant";
import * as cheerio from "cheerio";

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
  scrapedContext?: string;
};

async function scrapeLink(url: string, query: string = ""): Promise<string> {
  if (!url || !url.startsWith("http")) return "";
  try {
    const urlsToFetch = [url];
    if (url.includes("github.com") && !url.includes("?tab=")) {
      const baseUrl = url.split("?")[0].replace(/\/$/, "");
      urlsToFetch.push(`${baseUrl}?tab=repositories&sort=stargazers`);
      urlsToFetch.push(`${baseUrl}?tab=repositories&sort=updated`);
    }

    const firstPassResults = await Promise.all(urlsToFetch.map(async (u) => {
      try {
        const res = await fetch(u, { headers: { "User-Agent": "Rolequill-Assistant/1.0" }, cache: "no-store" });
        if (!res.ok) return { html: "", url: u };
        return { html: await res.text(), url: u };
      } catch { return { html: "", url: u }; }
    }));

    let combinedText = "";
    const repoLinks: { url: string; name: string; description: string; tags: string }[] = [];

    firstPassResults.forEach(res => {
      if (!res.html) return;
      const $ = cheerio.load(res.html);
      $("script, style, nav, footer, iframe").remove();
      
      if (res.url.includes("github.com")) {
        $(".pinned-item-list-item, .repo-list-item, [itemprop='owns'], .wb-break-all").each((_, el) => {
          const $el = $(el);
          const link = $el.find("a[link-data-prefetch], a.Link--primary, a[itemprop='name codeRepository'], [itemprop='name'] a").first();
          const href = link.attr("href");
          const name = link.text().trim();
          const desc = $el.find("[itemprop='description'], .f4.text-normal, .wb-break-all").text().trim();
          const tags = $el.find(".topic-tag, [data-ga-click*='topic']").text().trim();
          
          if (href && !href.startsWith("http") && name) {
            repoLinks.push({ url: `https://github.com${href}`, name, description: desc, tags });
          }
        });
      } else {
        combinedText += $("main, article, body").text() + " ";
      }
    });

    const uniqueRepos = [...new Map(repoLinks.map(r => [r.url, r])).values()];
    
    // Sort logic to prioritize projects based on query OR default to best projects
    let reposToDeepScan = uniqueRepos;
    if (query) {
      const q = query.toLowerCase();
      reposToDeepScan = uniqueRepos.sort((a, b) => {
        const score = (item: typeof a) => {
          let s = 0;
          const text = (item.name + " " + item.description + " " + item.tags).toLowerCase();
          if (text.includes(q)) s += 15;
          if (q.includes("eda") && (text.includes("data") || text.includes("analysis") || text.includes("notebook") || text.includes("socioeconomic"))) s += 10;
          return s;
        };
        return score(b) - score(a);
      });
    }
    
    const limitedScan = reposToDeepScan.slice(0, 15);
    if (limitedScan.length > 0) {
      const readmeResults = await Promise.all(limitedScan.map(async (repo) => {
        try {
          const res = await fetch(repo.url, { headers: { "User-Agent": "Rolequill-Assistant/1.0" } });
          if (!res.ok) return "";
          const $ = cheerio.load(await res.text());
          const readme = $("#readme").text();
          return `\nTECHNICAL AUDIT: ${repo.url}\nName: ${repo.name}\nDescription: ${repo.description}\nTags: ${repo.tags}\nREADME:\n${readme}\n---`;
        } catch { return ""; }
      }));
      combinedText += readmeResults.join("\n");
    }

    if (uniqueRepos.length > 15) {
      combinedText += "\nSUMMARY OF OTHER REPOS:\n" + uniqueRepos.slice(15).map(r => `- ${r.name}: ${r.description} (Tags: ${r.tags})`).join("\n");
    }

    const finalContent = combinedText.replace(/\s+/g, " ").trim().slice(0, 16000);
    return `Live Data from ${url}:\n${finalContent}\n---`;
  } catch (e) {
    console.error(`Scraping failed for ${url}`, e);
    return "";
  }
}

function buildFallbackAnswer(payload: NormalizedAskPayload) {
  return [
    `Here is a grounded draft for the question: \"${payload.question}\".`,
    "",
    "Based on the resume context and the job description, I would answer by focusing on the most relevant experience, the strongest matching project, and the skills that directly support the role requirements.",
    "",
    "To make this stronger, keep the answer tied to specific achievements from your resume and relate them directly to the role's expectations.",
    ...(payload.scrapedContext ? ["", "P.S. I also analyzed your GitHub/Portfolio and found several projects that could strengthen this answer further."] : []),
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
    `Resume Content (Highlights Only):\n${payload.resumeText || "None provided"}`,
    `Job Description (Target Role):\n${payload.jobDescription || "None provided"}`,
    ...(payload.scrapedContext ? [`Live Scraped Context (GitHub/Portfolio - FULL REPO LIST):\n${payload.scrapedContext}`] : []),
    ...(profileSection ? [profileSection] : []),
    `User Question:\n${payload.question}`,
  ];

  return [
    {
      role: "system" as const,
      content: [
        "You are Rolequill, a helpful AI career assistant. You talk naturally and intelligently, exactly like ChatGPT.",
        "Your role is to assist the user by utilizing the career data you have access to (Resume, GitHub, Portfolio).",
        "CRITICAL RULES:",
        "1. STRUCTURED FORMATTING: Always provide answers in a highly structured, premium manner. Use Markdown tables for project comparisons, bold headings for sections, and bullet points for technical highlights.",
        "2. ARCHITECTURAL LAYOUT: Avoid long walls of text. Use a clean, 'at-a-glance' format. If listing projects, use a table showing [Project Name | Tech Stack | Core Impact].",
        "3. ACCURACY FIRST: When the user asks about a specific type of project (e.g., 'EDA'), only mention projects that are explicitly identified as such in their README or description. DO NOT guess.",
        "4. NEVER impersonate the user. Always refer to the user in the second person (e.g., 'Your resume shows...', 'You have built...').",
        "5. If you cannot find a project matching their criteria, be honest. Tell them you've scanned their GitHub but don't see a clear match.",
        "6. Keep the tone professional, supportive, and conversational.",
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: userParts.filter(p => p.trim().length > 5).join("\n\n"),
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

  if (!question) {
    return NextResponse.json(
      { error: "A question is required." },
      { status: 400 }
    );
  }

  // Scrape links if present to provide "live" context
  let scrapedContext = "";
  if (payload.profile) {
    const linksToScrape = [
      payload.profile.portfolioUrl,
      payload.profile.githubUrl
    ].filter(Boolean) as string[];
    
    if (linksToScrape.length > 0) {
      const results = await Promise.all(linksToScrape.map(l => scrapeLink(l, question)));
      scrapedContext = results.filter(Boolean).join("\n\n");
    }
  }

  const normalizedPayload: NormalizedAskPayload = {
    resumeText,
    jobDescription,
    question,
    profile: payload.profile ?? {},
    scrapedContext
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
