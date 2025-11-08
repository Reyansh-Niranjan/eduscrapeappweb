interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 px-6 py-12 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-2xl border border-purple-500/30 bg-purple-950/40 p-8 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">EduScrapeApp Dashboard</h1>
            <p className="mt-2 text-sm text-purple-100/80">
              Welcome to your workspace. Dashboard widgets and insights will appear here once we wire up the data sources.
            </p>
          </div>

          <button
            onClick={onLogout}
            className="inline-flex items-center justify-center rounded-lg border border-purple-400/60 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:border-purple-300 hover:text-white"
          >
            Log out
          </button>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-purple-500/20 bg-purple-950/30 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-purple-100">Quick actions</h2>
            <p className="mt-2 text-sm text-gray-300/80">
              Shortcuts for managing collections, teams, and automations will land here.
            </p>
          </div>

          <div className="rounded-2xl border border-purple-500/20 bg-purple-950/30 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-purple-100">Recent activity</h2>
            <p className="mt-2 text-sm text-gray-300/80">
              Track the latest content imports, approvals, and workflow events once the pipeline is connected.
            </p>
          </div>

          <div className="rounded-2xl border border-purple-500/20 bg-purple-950/30 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-purple-100">Insights</h2>
            <p className="mt-2 text-sm text-gray-300/80">
              Analytics and engagement charts will be added soon to showcase impact at a glance.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-purple-500/20 bg-purple-950/30 p-8 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-purple-100">What’s next?</h2>
              <p className="text-sm text-gray-300/80">
                We’ll populate this dashboard with your institution’s live data, automations, and curated collections.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-teal-500/20 px-3 py-1 text-xs font-semibold text-teal-200">
              Coming soon
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

