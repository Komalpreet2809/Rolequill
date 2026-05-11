import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { GitHubSignInButton, SignOutButton } from "@/components/auth-controls";
import { RolequillDashboard } from "@/components/rolequill-dashboard";
import { ThemeToggle } from "@/components/theme-toggle";

const githubConfigured = Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <main className="snap-y snap-proximity overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(253,244,214,0.95)_0%,_rgba(245,234,216,0.92)_38%,_rgba(230,220,202,0.96)_100%)] text-stone-950 transition-colors duration-500 dark:bg-[radial-gradient(circle_at_top,_rgba(28,25,23,0.98)_0%,_rgba(12,10,9,1)_100%)] dark:text-stone-50">
      <header className="absolute top-0 left-0 z-50 w-full px-3 py-3 sm:px-8 sm:py-6 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 text-stone-950 dark:text-stone-50">
            <Image src="/logo.png" alt="Rolequill Logo" width={40} height={40} className="h-8 w-8 dark:invert sm:h-10 sm:w-10" />
            <p className="font-mono text-xl font-bold tracking-tight uppercase text-stone-900 dark:text-stone-50 sm:text-2xl">
              Role<span className="text-stone-500 dark:text-stone-400">quill</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <ThemeToggle />
            {session ? <SignOutButton /> : null}
            {!session && githubConfigured ? <GitHubSignInButton /> : null}
          </div>
        </div>
      </header>

      <section className="relative flex min-h-screen snap-start flex-col overflow-hidden pt-28 pb-8 sm:pt-36 sm:pb-12 lg:pt-24">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:invert" />
          <div className="absolute left-[-10%] top-[-12rem] h-[28rem] w-[28rem] animate-float rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-900/10" />
          <div className="absolute right-[-8%] top-[18%] h-[24rem] w-[24rem] animate-float-delayed rounded-full bg-orange-200/25 blur-3xl dark:bg-orange-950/10" />
          <div className="absolute bottom-[-8rem] left-[18%] h-[22rem] w-[22rem] animate-float rounded-full bg-white/40 blur-3xl dark:bg-stone-800/20" />
          
          <div className="absolute bottom-56 left-1/2 -translate-x-1/2 flex flex-col items-center select-none opacity-[0.03] dark:opacity-[0.02] sm:-bottom-10 lg:-bottom-20">
            <Image
              src="/logo.png"
              alt="Rolequill Logo Watermark"
              width={320}
              height={320}
              className="h-[8rem] w-[8rem] object-contain grayscale -mb-6 dark:invert animate-breathe sm:h-[12rem] sm:w-[12rem] sm:-mb-12 md:h-[15rem] md:w-[15rem] md:-mb-16 lg:h-[20rem] lg:w-[20rem] lg:-mb-24"
            />
            <h2 className="font-serif text-[5.5rem] font-bold tracking-tighter text-stone-950 dark:text-stone-50 sm:text-[10rem] md:text-[14rem] lg:text-[18rem] xl:text-[24rem]">
              Rolequill
            </h2>
          </div>
        </div>
 
        <div className="relative flex w-full flex-1 flex-col px-3 sm:px-8 lg:px-10">
          <div className="flex flex-1 flex-col items-center justify-center py-6 text-center sm:py-12 lg:py-24">
            <div className="max-w-5xl animate-fade-in-up">
              <h1 className="font-serif text-[3rem] font-black leading-[0.98] tracking-[-0.075em] text-stone-950 sm:text-7xl sm:leading-[1.08] lg:text-[7.5rem] dark:text-stone-50">
                Master Every Role <br /> with <span className="bg-gradient-to-r from-amber-600 to-stone-600 bg-clip-text text-transparent dark:from-amber-200 dark:to-stone-400">Total Context.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-3xl px-2 text-[13px] leading-6 text-stone-700 opacity-0 [animation-delay:400ms] animate-fade-in-up sm:mt-10 sm:px-0 sm:text-lg sm:leading-9 dark:text-stone-400">
                Rolequill crafts personalized job application drafts grounded in your career history. Connect your resume, links, and job brief to generate context-aware answers for every role.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-2.5 px-2 opacity-0 [animation-delay:800ms] animate-fade-in-up sm:mt-12 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5 sm:px-0">
                <a
                  href={session ? "#workspace" : "#access"}
                  className="group/btn relative inline-flex w-auto min-w-[15rem] items-center justify-center gap-2.5 overflow-hidden rounded-full bg-stone-950 px-6 py-3.5 text-[13px] font-bold text-white shadow-xl transition-all hover:bg-stone-800 sm:min-w-0 sm:gap-3 sm:px-10 sm:py-5 sm:text-sm dark:bg-white dark:text-black dark:hover:bg-stone-100"
                >
                  <div className="absolute inset-0 z-0 h-full w-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-sweep" />
                  <span className="relative z-10 text-white dark:!text-black">Start a new session</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="relative z-10 h-4 w-4 dark:!stroke-black" aria-hidden="true" style={{ color: 'white' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </a>
                <a
                  href={session ? "#chat" : "#access"}
                  className="group/btn relative inline-flex w-auto min-w-[15rem] items-center justify-center gap-2.5 overflow-hidden rounded-full border border-stone-300/80 bg-white/60 px-6 py-3.5 text-[13px] font-semibold backdrop-blur transition-all hover:border-stone-500 hover:bg-white sm:min-w-0 sm:gap-3 sm:px-10 sm:py-5 sm:text-sm dark:bg-stone-950"
                >
                  <div className="absolute inset-0 z-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-sweep [animation-delay:3s]" />
                  <svg viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" className="relative z-10 h-5 w-5 dark:!stroke-white" aria-hidden="true" style={{ color: 'black' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746-3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746-3.746 0 0 1 3.296-1.043A3.746-3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746-3.746 0 0 1 3.296 1.043 3.746-3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                  </svg>
                  <span className="relative z-10 text-black dark:!text-white">Go to chat</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {session ? (
        <div id="workspace">
          <RolequillDashboard
            userName={session.user?.name || "GitHub User"}
            userEmail={session.user?.email || "GitHub account"}
            userImage={session.user?.image}
          />
        </div>
      ) : (
        <section id="access" className="mx-auto flex min-h-screen w-full max-w-7xl snap-start items-center px-4 py-10 sm:px-10 sm:py-16 lg:px-12">
          <div className="w-full overflow-hidden rounded-[2.4rem] border border-white/70 bg-white/72 shadow-[0_28px_80px_rgba(120,53,15,0.12)] backdrop-blur dark:border-stone-800 dark:bg-stone-900/40">
            <div className="flex min-h-[26rem] flex-col items-center justify-center p-6 text-center sm:min-h-0 sm:p-20">
                <p className="text-sm font-semibold uppercase tracking-[0.05em] text-stone-500 dark:text-stone-400">Access</p>
                <h2 className="mt-6 max-w-2xl font-serif text-3xl leading-[1.05] tracking-[-0.05em] text-stone-950 sm:mt-8 sm:text-5xl dark:text-stone-50">
                  Connect GitHub to open the working sections.
                </h2>
                <p className="mt-6 max-w-xl text-sm leading-7 text-stone-700 sm:mt-8 sm:text-base sm:leading-9 dark:text-stone-300">
                  Your context and chat are private to your session. Connect your account to start grounding AI in your career history.
                </p>
                {githubConfigured ? <div className="mt-8 sm:mt-12"><GitHubSignInButton /></div> : null}
            </div>
          </div>
        </section>
      )}

      <div className="mt-0 flex w-full justify-end pr-3 pb-0 sm:-mt-36 sm:pr-0 sm:pb-4">
        <div className="pr-0 text-stone-700/85 dark:text-stone-500/65">
          <div className="text-[10px] font-medium tracking-[0.04em] whitespace-nowrap sm:hidden">
            Made with <span aria-hidden="true">❤️</span> by{" "}
            <a
              href="https://komalpreet.me"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-stone-700/85 underline decoration-stone-400 underline-offset-2 transition hover:decoration-stone-900 dark:text-stone-500/65 dark:decoration-stone-600/70 dark:hover:decoration-stone-400"
            >
              Komal
            </a>
          </div>
          <div className="hidden text-xs font-medium tracking-[0.04em] [writing-mode:vertical-rl] rotate-180 whitespace-nowrap sm:block">
            Made with <span aria-hidden="true" className="inline-block rotate-90">❤️</span> by{" "}
            <a
              href="https://komalpreet.me"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-stone-700/85 underline decoration-stone-400 underline-offset-2 transition hover:decoration-stone-900 dark:text-stone-500/65 dark:decoration-stone-600/70 dark:hover:decoration-stone-400"
            >
              Komal
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
