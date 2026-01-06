import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Updates() {
  const updates = useQuery(api.updates.list);

  // Sample updates data - only GitHub releases and device updates
  const sampleUpdates = [
    {
      _id: "1",
      title: "EduScrapeApp v2.0 Released",
      content: "We're excited to announce the release of EduScrapeApp v2.0 with enhanced scraping capabilities, improved user interface, and better performance optimization.",
      type: "github_release" as const,
      githubReleaseData: {
        version: "v2.0.0",
        releaseUrl: "https://github.com/Reyansh-Niranjan/eduscrapeappweb/releases/tag/v2.0.0"
      },
      published: true,
      _creationTime: Date.now() - 86400000, // 1 day ago
    },
    {
      _id: "2",
      title: "District Analytics Dashboard Preview",
      content: "Released early access to the analytics workspace showing adoption KPIs, class engagement trends, and source performance for curriculum leads.",
      type: "device_update" as const,
      published: true,
      _creationTime: Date.now() - 172800000, // 2 days ago
    }
  ];

  const displayUpdates = updates && updates.length > 0 ? updates : sampleUpdates;

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'github_release':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        );
      case 'device_update':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'github_release':
        return 'GitHub Release';
      case 'device_update':
        return 'Device Update';
      default:
        return 'Update';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'github_release':
        return 'from-green-500 to-blue-500';
      case 'device_update':
        return 'from-orange-500 to-red-500';
      default:
        return 'from-teal-500 to-purple-500';
    }
  };

  return (
    <section id="updates" className="py-20 relative" style={{ background: 'var(--theme-bg)' }}>
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: 'var(--theme-text)' }}>
            Latest <span className="bg-gradient-to-r from-teal-400 to-purple-500 bg-clip-text text-transparent">Updates</span>
          </h2>
          <p className="text-xl max-w-3xl mx-auto" style={{ color: 'var(--theme-text-secondary)' }}>
            Stay up to date with new releases, roadmap milestones, and platform improvements across EduScrapeApp.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {displayUpdates.map((update, index) => (
            <div
              key={update._id}
              className="group card rounded-2xl transition-all duration-300"
              style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-border)' }}
            >
              <div className="h-1 w-16 rounded-full bg-gradient-to-r from-teal-400 to-purple-500 mb-6" />
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-12 h-12 bg-gradient-to-r ${getTypeColor(update.type)} rounded-full flex items-center justify-center text-white`}>
                  {getUpdateIcon(update.type)}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 bg-gradient-to-r ${getTypeColor(update.type)} text-white rounded-full text-sm font-semibold`}>
                      {getTypeLabel(update.type)}
                      {update.type === 'github_release' && update.githubReleaseData && (
                        <> - Version: {update.githubReleaseData.version}</>
                      )}
                    </span>
                    {update.type === 'github_release' && update.githubReleaseData && (
                      <a
                        href={update.githubReleaseData.releaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 text-sm font-semibold transition-colors"
                      >
                        View Release →
                      </a>
                    )}
                  </div>

                  <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--theme-text)' }}>
                    {update.title}
                  </h3>
                  <p className="leading-relaxed mb-4" style={{ color: 'var(--theme-text-secondary)' }}>
                    {update.content}
                  </p>
                  <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
                    {new Date(update._creationTime).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {displayUpdates.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-r from-teal-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--theme-text)' }}>No Updates Yet</h3>
            <p style={{ color: 'var(--theme-text-secondary)' }}>Check back soon for the latest news and updates!</p>
          </div>
        )}
      </div>
    </section>
  );
}
