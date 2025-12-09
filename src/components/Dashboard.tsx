import { useState } from "react";
import Library from "./Library";
import { BookOpen, LayoutDashboard } from "lucide-react";

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "library">("overview");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between py-4">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab("overview")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  activeTab === "overview"
                    ? "bg-purple-100 text-purple-700 font-semibold"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab("library")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  activeTab === "library"
                    ? "bg-purple-100 text-purple-700 font-semibold"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <BookOpen className="h-4 w-4" />
                Library
              </button>
            </div>

            <button
              onClick={onLogout}
              className="inline-flex items-center justify-center rounded-lg border-2 border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-purple-500 hover:text-purple-600"
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === "library" ? (
        <Library />
      ) : (
        <div className="px-6 py-12">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
            <header className="card flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">EduScrapeApp Dashboard</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Welcome to your workspace. Dashboard widgets and insights will appear here once we wire up the data sources.
                </p>
              </div>
            </header>

            <section className="grid gap-6 lg:grid-cols-3">
              <div className="card hover-lift">
                <h2 className="text-lg font-semibold text-gray-900">Quick actions</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Shortcuts for managing collections, teams, and automations will land here.
                </p>
              </div>

              <div className="card hover-lift">
                <h2 className="text-lg font-semibold text-gray-900">Recent activity</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Track the latest content imports, approvals, and workflow events once the pipeline is connected.
                </p>
              </div>

              <div className="card hover-lift">
                <h2 className="text-lg font-semibold text-gray-900">Insights</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Analytics and engagement charts will be added soon to showcase impact at a glance.
                </p>
              </div>
            </section>

            <section className="card">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">What's next?</h2>
                  <p className="text-sm text-gray-600">
                    We'll populate this dashboard with your institution's live data, automations, and curated collections.
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
                  Coming soon
                </span>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
