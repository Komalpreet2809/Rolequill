# Rolequill

<p align="center">
  <img src="./public/logo.png" alt="Rolequill Logo" width="120" />
</p>

<h2 align="center">Master Every Role with Total Context</h2>

<p align="center">
  <strong>Grounded AI drafting workspace for resumes, job descriptions, and GitHub-verified project answers.</strong>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-20232a?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Ready-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
</p>

---

## 🖋️ What is Rolequill?

Rolequill isn't just another AI chatbot. It's a **grounded workspace** designed for applicants who want their claims to be backed by evidence. By syncing your GitHub repositories and analyzing your resume against target JDs, Rolequill ensures your application drafts are high-impact and hallucination-free.

### Why it feels different:

- **🔗 Grounded Answers**: Repository README content is treated as the primary source of truth.
- **🧠 Role-Aware Chat**: The assistant understands the context of the specific role you're applying for.
- **🎯 Project Shortlisting**: Identifies the strongest matches from your profile instead of dumping everything into a prompt.

---

## 🛠️ The Experience

<p align="center">
  <img src="./demo.png" alt="Rolequill Dashboard Demo" width="90%" style="border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.3);" />
</p>

### 🚀 Core Features

| 🛡️ Grounded Context | 📂 GitHub Sync |
| :--- | :--- |
| Uses resume, JD, and repo metadata to build tight, defensible project claims. | Pulls real-time repository data from your OAuth session for deep analysis. |

| 💬 Contextual Chat | 📝 Intelligent Drafting |
| :--- | :--- |
| Grounded Q&A that knows when to pull from your JD versus your repo history. | Generates four distinct, role-specific application drafts from your source context. |

---

## 📐 Product Architecture

```mermaid
graph TD
    A[GitHub OAuth] --> B[Profile Sync]
    B --> C{Workspace}
    C --> D[Resume Parser]
    C --> E[JD Analyzer]
    C --> F[GitHub Repo Miner]
    D & E & F --> G[Grounded Context Engine]
    G --> H[Contextual Chat]
    G --> I[Draft Generator]
    H --> J[High-Impact Answers]
    I --> K[Tailored Applications]
```

---

## 🚦 Getting Started

<details>
<summary><b>1. Prerequisites</b></summary>

- Groq API Key
- GitHub OAuth Application
- Node.js & npm
</details>

<details>
<summary><b>2. Environment Setup</b></summary>

Create a `.env.local` file in the root:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b

NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=your_nextauth_secret
AUTH_GITHUB_ID=your_github_oauth_client_id
AUTH_GITHUB_SECRET=your_github_oauth_client_secret
```
</details>

<details>
<summary><b>3. Installation</b></summary>

```bash
npm install
npm run dev
```
</details>

---

## 🏗️ Technical Stack

- **Framework**: [Next.js 16](https://nextjs.org/)
- **UI**: [React 19](https://reactjs.org/) + [Tailwind CSS 4](https://tailwindcss.com/)
- **Auth**: [NextAuth.js](https://next-auth.js.org/)
- **LLM**: [Groq SDK](https://groq.com/)
- **Parsing**: [Cheerio](https://cheerio.js.org/), [unpdf](https://github.com/unjs/unpdf)

---

## 📜 License

Distributed under the ISC License. See `LICENSE` for more information.

<p align="right">(<a href="#top">back to top</a>)</p>

---
Built with ❤️ by [Komal](https://komalpreet.me)
