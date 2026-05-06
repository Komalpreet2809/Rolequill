import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { GitHubSignInButton, SignOutButton } from "@/components/auth-controls";
import { RolequillWorkspace } from "@/components/rolequill-workspace";

const githubConfigured = Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff8ec_0%,_#f8f1e7_32%,_#eadfce_100%)] text-stone-950">
      <section className="mx-auto w-full max-w-7xl px-6 pt-8 sm:px-10 lg:px-12">
        <div className="flex justify-end pb-4">
          {session ? <SignOutButton /> : null}
          {!session && githubConfigured ? <GitHubSignInButton /> : null}
          {!githubConfigured ? (
            <div className="max-w-md rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-900">
              Configure `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` in `.env.local` to enable GitHub login. Rolequill is now GitHub-first.
            </div>
          ) : null}
        </div>

        <header className="border-b border-stone-300/70 pb-10">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.35em] text-stone-500">Rolequill</p>
            <h1 className="mt-6 font-serif text-5xl leading-none tracking-[-0.05em] text-stone-950 sm:text-6xl lg:text-7xl">
              Connect GitHub, upload your resume, paste the JD, ask the question.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-700 sm:text-xl">
              GitHub login is required so Rolequill can be tied to your project identity before generating grounded application answers.
            </p>
          </div>
        </header>
      </section>

      {session ? (
        <RolequillWorkspace
          userName={session.user?.name || "GitHub User"}
          userEmail={session.user?.email || "GitHub account"}
          userImage={session.user?.image}
        />
      ) : (
        <section className="mx-auto w-full max-w-7xl px-6 pb-20 pt-10 sm:px-10 lg:px-12">
          <div className="rounded-[2rem] border border-stone-300/70 bg-white/80 p-8 shadow-[0_18px_50px_rgba(120,53,15,0.08)] backdrop-blur sm:p-10">
            <p className="text-sm uppercase tracking-[0.28em] text-stone-500">Before you start</p>
            <h2 className="mt-4 font-serif text-4xl leading-none tracking-[-0.04em] text-stone-950 sm:text-5xl">
              GitHub is the required entry point.
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-8 text-stone-700 sm:text-lg">
              Rolequill should answer from your resume plus your GitHub project context, so the app no longer runs in guest mode.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-stone-500">1. Sign in</p>
                <p className="mt-3 text-sm leading-7 text-stone-700">Connect your GitHub account first.</p>
              </div>
              <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-stone-500">2. Add context</p>
                <p className="mt-3 text-sm leading-7 text-stone-700">Upload the resume and paste the target job description.</p>
              </div>
              <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-stone-500">3. Generate answers</p>
                <p className="mt-3 text-sm leading-7 text-stone-700">Ask one application question at a time and refine the result.</p>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
