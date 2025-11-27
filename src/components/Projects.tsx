import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ErrorBoundary } from "./ErrorBoundary";
import LoadingSpinner from "./LoadingSpinner";
import OptimizedImage from "./OptimizedImage";

interface Project {
  _id: string;
  name: string;
  description: string;
  technologies: string[];
  imageUrl?: string;
  repositoryUrl: string;
  featured?: boolean;
}

export default function Projects() {
  const projects = useQuery(api.projects.list);

  const sampleProjects: Project[] = [
    {
      _id: "sample1",
      name: "Smart Resource Scraper",
      description:
        "Continuously monitors trusted education sites and learning portals, extracts fresh material, and auto-tags resources by grade level, language, and topic.",
      technologies: ["Android", "Firebase", "Natural Language Processing", "Background Jobs"],
      repositoryUrl: "https://github.com/Reyansh-Niranjan/eduscrapeappweb",
      featured: true,
      imageUrl: "https://i.imgur.com/7NwjEoE.jpeg",
    },
    {
      _id: "sample3",
      name: "Curriculum Control Centre",
      description:
        "Visual dashboard that highlights gaps in lesson plans, surfaces trending topics, and enables one-click publishing to Google Classroom or school intranets.",
      technologies: ["React Native", "Analytics", "Role-Based Access", "Google Classroom API"],
      repositoryUrl: "https://github.com/Reyansh-Niranjan/eduscrapeappweb",
      featured: true,
      imageUrl: "https://i.imgur.com/avU9LmQ.jpeg",
    },
    {
      _id: "sample4",
      name: "Offline Companion App",
      description:
        "Lightweight Android client that syncs curated playlists for low-connectivity classrooms, giving teachers instant access to approved worksheets and videos.",
      technologies: ["Android", "Local Caching", "Progressive Sync", "Accessibility"],
      repositoryUrl: "https://github.com/Reyansh-Niranjan/eduscrapeappweb",
      featured: true,
      imageUrl: "https://i.imgur.com/ZJHGEkV.jpeg",
    },
  ];

  const displayProjects = projects && projects.length > 0 ? (projects as Project[]) : sampleProjects;

  return (
    <ErrorBoundary>
      <section id="projects" className="py-20 relative" style={{ background: 'var(--theme-bg)' }}>
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: 'var(--theme-text)' }}>
              Core <span className="text-purple-600">Features</span>
            </h2>
            <p className="text-xl max-w-3xl mx-auto" style={{ color: 'var(--theme-text-secondary)' }}>
              Explore the pillars that power EduScrapeApp—from automated scraping to insights that help educators deliver lessons faster.
            </p>
          </div>

          {projects === undefined ? (
            <LoadingSpinner size="lg" text="Loading projects..." className="py-12" />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayProjects.map((project, index) => (
                <div
                  key={project._id}
                  className="group relative rounded-2xl p-6 hover:border-purple-400 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                  style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-border)' }}
                >
                  {project.featured && (
                    <div className="absolute -top-3 -right-3 bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-md">
                      Featured
                    </div>
                  )}

                  <div className="mb-4">
                    {project.imageUrl ? (
                      <div className="w-full h-48 rounded-lg overflow-hidden mb-4" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border)' }}>
                        <OptimizedImage
                          src={project.imageUrl}
                          alt={project.name}
                          className="w-full h-full"
                          loading={index < 2 ? "eager" : "lazy"}
                          fetchPriority={index < 2 ? "high" : "low"}
                          sizes="(max-width: 768px) 100vw, 33vw"
                          width={720}
                          height={384}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-48 rounded-lg flex items-center justify-center mb-4" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border)' }}>
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--theme-text-secondary)' }}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-bold mb-3 group-hover:text-purple-600 transition-colors" style={{ color: 'var(--theme-text)' }}>
                    {project.name}
                  </h3>

                  <p className="mb-4 leading-relaxed" style={{ color: 'var(--theme-text-secondary)' }}>
                    {project.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {project.technologies.map((tech) => (
                      <span key={tech} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                        {tech}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <a
                      href={project.repositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg text-center font-semibold hover:bg-purple-700 shadow-sm hover:shadow-md transition-all duration-300"
                    >
                      Learn More
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </ErrorBoundary>
  );
}
