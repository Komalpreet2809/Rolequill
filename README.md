# Rolequill

Rolequill is a GitHub-grounded career workspace for drafting job application answers and asking role-specific questions against your resume, job description, and project history.

## What It Does

- Signs users in with GitHub via NextAuth.
- Pulls project context from GitHub-linked data and repo summaries.
- Lets users save a job description and ask follow-up questions in chat.
- Generates multiple grounded draft answers for job applications.
- Uses Groq for model responses, with controlled local fallbacks when keys are missing.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- NextAuth
- Groq SDK
- Cheerio
- React Markdown + remark-gfm

## Core App Flow

1. Sign in with GitHub.
2. Add resume text and profile links.
3. Paste the target job description.
4. Ask project or role-fit questions in chat.
5. Generate tailored application drafts from the same context.

## Environment Variables

Create a `.env.local` file in the project root.

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b

NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=your_nextauth_secret
AUTH_GITHUB_ID=your_github_oauth_client_id
AUTH_GITHUB_SECRET=your_github_oauth_client_secret
```

## GitHub OAuth Setup

For local development, configure your GitHub OAuth app like this:

- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3000/api/auth/callback/github`

For production, use your deployed domain instead:

- Homepage URL: `https://rolequill.komalpreet.me`
- Authorization callback URL: `https://rolequill.komalpreet.me/api/auth/callback/github`

If you actively use both local and production sign-in, keep separate GitHub OAuth apps. One callback URL will not cover both cleanly.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the dev server:

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

- `POST /api/ask`
  Uses Groq chat completions for contextual Q&A against resume, job description, GitHub context, and recent chat history.

- `POST /api/generate`
  Generates four structured application drafts from candidate and role inputs.

- `POST /api/github/analyze`
  Processes GitHub-related project context.

- `POST /api/github/talking-points`
  Produces project talking points from GitHub context.

## Notes

- The default model is `openai/gpt-oss-20b` unless `GROQ_MODEL` is overridden.
- `/api/ask` retries once with compacted context before failing.
- If `GROQ_API_KEY` is missing, some routes fall back to local template behavior.
- Production deploys require matching GitHub OAuth settings and Vercel environment variables.

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
```

## Deployment

For Vercel production, set these environment variables:

- `GROQ_API_KEY`
- `GROQ_MODEL`
- `NEXTAUTH_URL`
- `AUTH_SECRET`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`

Then make sure the GitHub OAuth app callback URL matches the deployed domain exactly.

## Author

Made with love by [Komal](https://komalpreet.me)
