# Rolequill

<p align="center">
  <img src="./public/logo.png" alt="Rolequill logo" width="96" />
</p>

<p align="center">
  <strong>GitHub-grounded career drafting workspace for resumes, job descriptions, and project-based answers.</strong>
</p>

<p align="center">
  Rolequill turns your resume, synced repositories, and target JD into grounded chat answers, project rankings, and tailored application drafts.
</p>

<p align="center">
  <a href="#overview">Overview</a> |
  <a href="#features">Features</a> |
  <a href="#product-flow">Flow</a> |
  <a href="#getting-started">Setup</a> |
  <a href="#deployment">Deployment</a>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-111111?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-111111?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Ready-111111?style=for-the-badge&logo=typescript&logoColor=3178C6" />
  <img alt="Groq" src="https://img.shields.io/badge/Groq-Grounded%20LLM-111111?style=for-the-badge" />
  <img alt="NextAuth" src="https://img.shields.io/badge/Auth-GitHub%20OAuth-111111?style=for-the-badge" />
</p>

<p align="center">
  <img src="./demo.png" alt="Rolequill product demo" />
</p>

> Rolequill is built for applicants who want answers tied to actual work, not polished hallucinations.

## Overview

Most career tools start with a prompt box and a generic model response.

Rolequill is structured differently. It builds answers from:

- your resume text
- saved profile links
- the current job description
- synced GitHub repository context
- recent chat history

That gives you a workspace that can:

- explain why a project fits a role
- rank repositories against a target prompt
- answer follow-up questions with retained context
- generate application drafts without inventing experience

## Features

| Area | What Rolequill does |
|---|---|
| Context grounding | Uses resume, JD, profile links, repo metadata, and README excerpts |
| GitHub sync | Pulls repositories and keeps a shortlist for role-based analysis |
| Chat | Supports grounded Q&A with retry-on-compact-context behavior |
| Drafting | Generates multiple job-application style drafts from the same source context |
| Persistence | Saves local browser state for resume, profile links, and JD flow |
| UX | Responsive landing page, theme toggle, and mobile-friendly dashboard |

## Why It Feels Different

<table>
  <tr>
    <td width="33%">
      <strong>Grounded Answers</strong><br />
      Repo README content is treated as the primary source of truth, which keeps project claims tighter and more defensible.
    </td>
    <td width="33%">
      <strong>Role-Aware Chat</strong><br />
      The assistant only pulls JD or repo context when the question calls for it, instead of forcing every answer into recruiter mode.
    </td>
    <td width="33%">
      <strong>Project Shortlisting</strong><br />
      Instead of dumping your whole profile into a prompt, Rolequill narrows the repo set and reasons from the strongest matches.
    </td>
  </tr>
</table>

## Product Flow

```text
GitHub Sign-In
      ->
Resume + Profile Links
      ->
Job Description
      ->
Repo Sync + Shortlist
      ->
Grounded Chat + Draft Generation
```

Typical prompts:

- `best projects for this role`
- `why does this project fit the JD`
- `can I replace this project with another one`
- `summarize this job profile`

## Tech Stack

| Layer | Tools |
|---|---|
| App | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Auth | NextAuth with GitHub OAuth |
| Model layer | Groq SDK |
| Content parsing | Cheerio, unpdf |
| Rendering | React Markdown, remark-gfm |

## Environment Variables

Create `.env.local` in the project root:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b

NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=your_nextauth_secret
AUTH_GITHUB_ID=your_github_oauth_client_id
AUTH_GITHUB_SECRET=your_github_oauth_client_secret
```

## GitHub OAuth Setup

For local development:

- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3000/api/auth/callback/github`

For production:

- Homepage URL: `https://rolequill.komalpreet.me`
- Authorization callback URL: `https://rolequill.komalpreet.me/api/auth/callback/github`

If you need both local and production auth, use separate GitHub OAuth apps.

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`

### Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## API Routes

| Route | Purpose |
|---|---|
| `POST /api/ask` | Contextual Q&A using resume, JD, repo context, and chat history |
| `POST /api/generate` | Generates four grounded application drafts |
| `POST /api/github/analyze` | Ranks synced repositories against a target prompt or role |
| `POST /api/github/talking-points` | Produces project talking points from repo context |

Implementation notes:

- default model: `openai/gpt-oss-20b`
- `/api/ask` retries once with compacted context
- missing `GROQ_API_KEY` triggers local fallback behavior

## Project Structure

```text
src/
  app/
    api/
    layout.tsx
    page.tsx
  components/
    auth-controls.tsx
    rolequill-dashboard.tsx
    theme-toggle.tsx
  lib/
  auth.ts
public/
  logo.png
demo.png
```

## Deployment

For Vercel, set:

- `GROQ_API_KEY`
- `GROQ_MODEL`
- `NEXTAUTH_URL`
- `AUTH_SECRET`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`

Also make sure the GitHub OAuth callback URL matches the deployed domain exactly.

## Notes

- Chat quality depends heavily on the quality of synced repo README content.
- Local fallback behavior is intentional when model credentials are missing.
- The app is optimized for grounded drafting, not open-ended chatbot behavior.

## Author

Built by [Komal](https://komalpreet.me)
