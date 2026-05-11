# Rolequill

<p align="center">
  <img src="./public/logo.png" alt="Rolequill logo" width="96" />
</p>

<p align="center">
  <strong>GitHub-grounded career drafting workspace for resumes, job descriptions, and project-based answers.</strong>
</p>

<p align="center">
  Rolequill helps you turn your resume, GitHub repos, and target JD into grounded chat answers and tailored application drafts.
</p>

<p align="center">
  <img src="./demo.png" alt="Rolequill product demo" />
</p>

## Overview

Rolequill is a Next.js app for technical job applicants who want better answers than generic AI output.

Instead of responding from a blank prompt, it works from:

- your resume text
- your saved profile links
- the current job description
- synced GitHub repository context
- recent chat history

The result is a workspace that can:

- answer role-fit questions with context
- rank relevant projects for a target role
- generate multiple grounded application drafts
- keep the flow tied to your actual work instead of invented claims

## Features

- GitHub OAuth sign-in with NextAuth
- Resume parsing and local session persistence
- Job description save-and-continue flow
- Context-aware chat backed by Groq
- Repo ranking against a prompt or JD
- Draft generation for application-style answers
- Responsive landing page and dashboard
- Dark/light theme toggle

## Product Flow

1. Sign in with GitHub.
2. Add your resume and profile links.
3. Paste the target job description.
4. Sync GitHub repositories.
5. Ask questions like `best projects for this role` or `why does this project fit the JD`.
6. Generate tailored application drafts from the same context.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- NextAuth
- Groq SDK
- Cheerio
- React Markdown
- remark-gfm
- unpdf

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

If you need both local and production auth, keep separate GitHub OAuth apps.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## API Routes

### `POST /api/ask`

Contextual Q&A using:

- resume text
- job description
- GitHub repo context
- recent chat history

Notes:

- uses `openai/gpt-oss-20b` by default
- retries once with compacted context before failing
- returns a local mock mode if `GROQ_API_KEY` is missing

### `POST /api/generate`

Generates four grounded application drafts from candidate and role inputs.

### `POST /api/github/analyze`

Ranks synced repositories against a target prompt or job context.

### `POST /api/github/talking-points`

Builds project talking points from repository context.

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

- Some local fallback behavior is intentional when model credentials are missing.
- Chat quality depends heavily on the quality of the synced repo README content.
- The app is optimized around grounded drafting, not open-ended chatbot behavior.

## Author

Built by [Komal](https://komalpreet.me)
