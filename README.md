# Rolequill

<div align="center">
  <img src="public/logo.png" alt="Rolequill Logo" width="120" />
  <h3>The Deep-Context Career Intelligence Workspace</h3>
  <p>Evolving job applications from guesswork to data-driven technical audits.</p>
</div>

---

## 🖋️ Overview

**Rolequill** is a high-end career assistant designed for technical professionals. Unlike standard AI career tools, Rolequill operates on a **Full Profile Mirror** engine—it doesn't just read your resume; it audits your entire GitHub presence, parsing READMEs, tech stacks, and repository metadata to build a comprehensive technical "brain" of your career.

By grounding every answer in live-scraped repository data and your professional resume, Rolequill generates high-fidelity, structured responses that align your actual work history with specific job requirements.

---

## ✨ Core Intelligence Features

- **Full Profile Mirror Mode**: Rolequill performs parallel technical audits of up to 15 repositories at once, ingesting full README contents and metadata to ensure 100% accuracy in project discovery.
- **Deep Technical Grounding**: Answers are cross-referenced across your Resume, GitHub repositories, and Portfolio links.
- **Structured Architectural Output**: AI responses are rendered using Markdown tables and bold technical sections for maximum readability and professional presentation.
- **GitHub-First Identity**: Seamlessly integrated with GitHub OAuth for a secure, developer-focused workspace.
- **High-Contrast Workspace**: A premium, minimalist workspace designed for focus, featuring a dark-mode optimized, high-contrast aesthetic.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Intelligence**: [Groq SDK](https://groq.com/) (LLM-agnostic grounding)
- **Scraping Engine**: [Cheerio](https://cheerio.js.org/) (Live GitHub Audit)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Markdown**: [React-Markdown](https://github.com/remarkjs/react-markdown) with GFM support

---

## 🚀 Getting Started

### 1. Environment Configuration

Create a `.env.local` file in the root directory and configure the following variables:

```env
# Intelligence
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b

# Authentication
AUTH_SECRET=your_nextauth_secret
AUTH_GITHUB_ID=your_github_oauth_id
AUTH_GITHUB_SECRET=your_github_oauth_secret
```

### 2. Local Installation

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Visit `http://localhost:3000` to access your workspace.

---

## 📋 Workspace Workflow

1. **GitHub Sync**: Sign in with your GitHub account to authorize profile access.
2. **Knowledge Ingestion**: Upload your latest Resume (PDF/Markdown) and provide your professional links.
3. **Target Analysis**: Paste the target Job Description to define the context.
4. **Technical Audit**: Ask specific questions (e.g., "Find my best EDA projects for this role").
5. **Structured Delivery**: Receive a structured, table-formatted summary of your matching technical expertise.

---

Made with ❤️ by [Komal](https://komalpreet.me)
