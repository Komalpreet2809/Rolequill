<div align="center">
  <img src="public/logo.png" alt="Rolequill Logo" width="200" height="200" />
  <h1>Rolequill</h1>
</div>

Rolequill is a GitHub-first job application assistant. It lets you sign in with GitHub, upload your resume, paste a job description, and ask flexible application questions that are answered from your stored context.

## Current flow

1. Sign in with GitHub
2. Upload your resume
3. Paste the target job description
4. Ask any application question in the bottom chat panel
5. Copy and refine the generated answer

## Features

- GitHub-authenticated app flow
- Resume upload with PDF and text parsing
- Stored resume preview and replace flow
- Saved profile links with quick-open icons
- Job description input
- Flexible multi-line AI question box
- Groq-backed answer generation with fallback mode

## Tech stack

- Next.js
- React
- TypeScript
- NextAuth
- Groq API
- Tailwind CSS

## Environment variables

Create `.env.local` with:

```env
GROQ_API_KEY=your_groq_key
GROQ_MODEL=openai/gpt-oss-20b
AUTH_SECRET=your_auth_secret
AUTH_GITHUB_ID=your_github_oauth_id
AUTH_GITHUB_SECRET=your_github_oauth_secret
```

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Notes

- Resume, job description, and profile links are currently stored locally in the browser.
- GitHub sign-in is required for the app flow.
- GitHub repo ingestion is not fully implemented yet; current grounding uses resume, JD, and saved profile links.

## Next steps

- Add real GitHub repository ingestion
- Save user data in a database instead of local browser storage
- Add answer history and regeneration controls
- Improve prompt grounding and source visibility
