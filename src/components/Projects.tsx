import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ErrorBoundary } from "./ErrorBoundary";
import LoadingSpinner from "./LoadingSpinner";

export default function Projects() {
  const projects = useQuery(api.projects.list);

  // Updated sample project data with correct technologies
  const sampleProjects = [
    {
      _id: "sample1",
      name: "EduScrapeApp",
      description: "An innovative educational mobile application built with modern Android development tools. Features user authentication, real-time data synchronization, and an intuitive interface for enhanced learning experiences.",
      technologies: ["Java", "Android Studio", "Firebase", "XML", "Material Design"],
      repositoryUrl: "https://github.com/Reyansh-Niranjan/EduScrapeApp",
      featured: true,
    },
    {
      _id: "sample3",
      name: "IoT Education Device",
      description: "Physical device that integrates with our software solutions to provide hands-on learning experiences in STEM education.",
      technologies: ["Arduino", "Raspberry Pi", "IoT", "Python", "Hardware Design"],
      repositoryUrl: "https://github.com/Reyansh-Niranjan/EduScrapeApp",
      featured: true,
    }
  ];

  const displayProjects = projects && projects.length > 0 ? projects : sampleProjects;

  return (
    <ErrorBoundary>
      <section id="projects" className="py-20 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Our <span className="bg-gradient-to-r from-teal-400 to-purple-500 bg-clip-text text-transparent">Projects</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Explore our innovative solutions and cutting-edge projects that showcase our team's expertise and creativity.
            </p>
          </div>

          {projects === undefined ? (
            <LoadingSpinner size="lg" text="Loading projects..." className="py-12" />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayProjects.map((project, index) => (
                <div 
                  key={project._id}
                  className="group relative bg-gradient-to-br from-purple-800/20 to-teal-800/20 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6 hover:border-teal-400/50 transition-all duration-300 transform hover:scale-105"
                >
                  {project.featured && (
                    <div className="absolute -top-3 -right-3 bg-gradient-to-r from-teal-400 to-purple-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      Featured
                    </div>
                  )}

                  <div className="mb-4">
                    <div className="w-full h-48 bg-gradient-to-br from-purple-600/30 to-teal-600/30 rounded-lg flex items-center justify-center mb-4">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-teal-400 transition-colors">
                    {project.name}
                  </h3>
                  
                  <p className="text-gray-300 mb-4 leading-relaxed">
                    {project.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {project.technologies.map((tech, techIndex) => (
                      <span 
                        key={techIndex}
                        className="px-3 py-1 bg-purple-700/50 text-purple-200 rounded-full text-sm"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <a
                      href={project.repositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-gradient-to-r from-teal-500 to-purple-600 text-white py-2 px-4 rounded-lg text-center font-semibold hover:from-teal-600 hover:to-purple-700 transition-all duration-300"
                    >
                      View Code
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
