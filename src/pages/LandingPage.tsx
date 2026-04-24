import { ArrowRight, Bot, FileText, Lock, Search, Sparkles, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HeroGeometric } from '@/components/ui/shape-landing-hero';
import { getStoredUser, isStoredUserAuthenticated } from '@/services/auth';

const featureCards = [
  {
    icon: FileText,
    title: 'Markdown First',
    description: 'Write in a clean editor built for structured notes, quick capture, and long-form thinking without clutter.',
  },
  {
    icon: Bot,
    title: 'AI Inside The Workflow',
    description: 'Generate notes, search context, and chat with your workspace without leaving the app or breaking focus.',
  },
  {
    icon: Search,
    title: 'Find Ideas Faster',
    description: 'Use AI search and smart organization to retrieve the exact note, summary, or detail you need in seconds.',
  },
];

const appHighlights = [
  'Real-time-feeling note flow with a focused dashboard',
  'Built-in AI generation, search, and note chat',
  'Simple auth and personal workspace access',
  'Designed for creators, students, and operators',
];

const showcaseImages = [
  {
    src: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80',
    alt: 'Desk workspace with notebook and laptop',
  },
  {
    src: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    alt: 'Modern team reviewing a digital product',
  },
];

export default function LandingPage() {
  const isAuthenticated = isStoredUserAuthenticated(getStoredUser());
  const primaryHref = isAuthenticated ? '/dashboard' : '/signup';
  const primaryLabel = isAuthenticated ? 'Go To Dashboard' : 'Create Your Workspace';
  const secondaryHref = isAuthenticated ? '/dashboard' : '/login';
  const secondaryLabel = isAuthenticated ? 'Open Notes' : 'Log In';

  return (
    <div className="min-h-screen bg-[#030303] text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/8 bg-[#030303]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <a href="#hero" className="flex items-center gap-3">
            <img
              src="https://res.cloudinary.com/dudwzh2xy/image/upload/v1774161751/nexera_logo_rk3yzf.png"
              alt="Nexera Note"
              className="h-10 w-10 rounded-2xl object-contain"
            />
            <div>
              <div className="text-sm font-semibold tracking-[0.18em] text-white/95">NEXERA NOTE</div>
              <div className="text-xs text-white/45">Markdown workspace with AI</div>
            </div>
          </a>

          <nav className="hidden items-center gap-8 text-sm text-white/60 md:flex">
            <a href="#features" className="transition-colors hover:text-white">Features</a>
            <a href="#workflow" className="transition-colors hover:text-white">Workflow</a>
            <a href="#cta" className="transition-colors hover:text-white">Get Started</a>
          </nav>

          <div className="flex items-center gap-3">
            {!isAuthenticated && (
              <Link to="/login" className="hidden text-sm text-white/70 transition-colors hover:text-white sm:inline-flex">
                Log In
              </Link>
            )}
            <Link
              to={primaryHref}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950"
            >
              {primaryLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <HeroGeometric
        badge="Nexera Note Platform"
        title1="Your ideas deserve"
        title2="an intelligent workspace"
        description="Capture thoughts in markdown, organize notes with clarity, and use AI to generate, search, and refine your knowledge from one sharp, fast interface."
        primaryCtaHref={primaryHref}
        primaryCtaLabel={primaryLabel}
        secondaryCtaHref={secondaryHref}
        secondaryCtaLabel={secondaryLabel}
      />

      <main className="relative z-10 -mt-24 pb-24">
        <section id="features" className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-10">
            <div className="mb-10 max-w-2xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-orange-300/80">
                Product Highlights
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
                A promotional front door for the Nexera Note app
              </h2>
              <p className="mt-4 text-base leading-7 text-white/60 md:text-lg">
                This landing page introduces the product clearly, communicates the core value fast, and gives users a direct path into signup or the dashboard.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {featureCards.map(({ icon: Icon, title, description }) => (
                <div key={title} className="rounded-[1.75rem] border border-white/10 bg-black/30 p-6">
                  <div className="mb-4 inline-flex rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                    <Icon className="h-5 w-5 text-orange-300" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/60">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="mx-auto mt-12 max-w-7xl px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-orange-500/[0.08] to-cyan-500/[0.06] p-6 md:p-8">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.22em] text-white/60">
                <Sparkles className="h-3.5 w-3.5 text-orange-300" />
                Workflow
              </div>
              <h3 className="max-w-xl text-3xl font-bold tracking-tight text-white md:text-4xl">
                Write, retrieve, and refine without jumping between tools
              </h3>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {appHighlights.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-sm text-white/70">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6">
              {showcaseImages.map((image) => (
                <div key={image.src} className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/30">
                  <img src={image.src} alt={image.alt} className="h-64 w-full object-cover md:h-72" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-7xl px-4 md:px-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
              <Zap className="h-6 w-6 text-cyan-300" />
              <h3 className="mt-4 text-xl font-semibold">Fast Onboarding</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Users can move from landing page to account creation to dashboard with a much cleaner product story.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
              <Lock className="h-6 w-6 text-emerald-300" />
              <h3 className="mt-4 text-xl font-semibold">Auth-Aware Entry</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Returning users are nudged toward the dashboard while new users are guided into signup naturally.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
              <Bot className="h-6 w-6 text-orange-300" />
              <h3 className="mt-4 text-xl font-semibold">Built For The Existing App</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">
                The page matches the current dark visual language while introducing a stronger branded marketing layer.
              </p>
            </div>
          </div>
        </section>

        <section id="cta" className="mx-auto mt-12 max-w-5xl px-4 md:px-6">
          <div className="rounded-[2.25rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.16),transparent_35%),#090909] px-6 py-12 text-center md:px-10">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-300/75">
              Ready To Start
            </p>
            <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight md:text-5xl">
              Bring your notes, ideas, and AI workflow into one focused place
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/60 md:text-lg">
              Nexera Note now has a real landing experience for discovery, conversion, and a more polished first impression.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to={primaryHref}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-950"
              >
                {primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to={secondaryHref}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-white/85"
              >
                {secondaryLabel}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
