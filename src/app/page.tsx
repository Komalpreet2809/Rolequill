import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { GitHubSignInButton, SignOutButton } from "@/components/auth-controls";
import { RolequillWorkspace } from "@/components/rolequill-workspace";

const githubConfigured = Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff8ec_0%,_#f8f1e7_32%,_#eadfce_100%)] text-stone-950">
      <section className="pb-12">
        <div className="mx-auto flex w-full flex-col px-4 pt-2 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="Rolequill Logo" className="h-16 w-16 object-contain mix-blend-multiply" />
              <p className="text-lg font-bold uppercase tracking-[0.4em] text-stone-950">Rolequill</p>
            </div>
            <div className="flex items-center gap-4">
              {session ? <SignOutButton /> : null}
              {!session && githubConfigured ? <GitHubSignInButton /> : null}
              {!githubConfigured ? (
                <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs leading-5 text-amber-900">
                  Configure GitHub login in `.env.local`.
                </div>
              ) : null}
            </div>
          </header>

          <div className="flex items-start pt-12 pb-20">
            <div className="max-w-4xl">
              <h1 className="font-serif text-5xl leading-none tracking-[-0.05em] text-stone-950 sm:text-6xl lg:text-7xl">
                Connect GitHub, load your context, then ask better application questions.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-stone-700 sm:text-lg">
                Resume, links, and the job description live in one place. The chat below answers from that context.
              </p>
              {session ? (
                <a
                  href="#context"
                  className="mt-10 inline-flex items-center rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-stone-50 transition hover:bg-stone-800"
                >
                  Scroll to context
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {session ? (
        <RolequillWorkspace
          userName={session.user?.name || "GitHub User"}
          userEmail={session.user?.email || "GitHub account"}
          userImage={session.user?.image}
        />
      ) : (
        <section id="context" className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-16 sm:px-10 lg:px-12">
          <div className="w-full rounded-[2rem] border border-stone-300/70 bg-white/80 p-8 shadow-[0_18px_50px_rgba(120,53,15,0.08)] backdrop-blur sm:p-10">
            <h2 className="font-serif text-4xl leading-none tracking-[-0.04em] text-stone-950 sm:text-5xl">
              Connect GitHub to continue.
            </h2>
          </div>
        </section>
      )}
    </main>
  );
}

