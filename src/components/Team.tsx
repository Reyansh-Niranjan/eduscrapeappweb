import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import OptimizedImage from "./OptimizedImage";

export default function Team() {
  const teamMembers = useQuery(api.team.list);

  const sampleTeam = [
    {
      _id: "1",
      name: "Reyansh Niranjan",
      role: "Creativity & Designing Head",
      bio: "Lead on project development, website design, presentations, videos, and physical device creation.",
      imageUrl: "https://i.imgur.com/J79QHGS.jpeg",
      order: 1,
    },
    {
      _id: "2",
      name: "Jeebika Choudary",
      role: "Team Leader",
      bio: "Coordinates team activities and ensures project alignment with goals.",
      imageUrl: "https://i.imgur.com/EwmBKY4.jpeg",
      order: 2,
    },
    {
      _id: "3",
      name: "Anshita Mohanty",
      role: "Creativity & Designing Head",
      bio: "Focuses on creative solutions and innovative design approaches.",
      imageUrl: "https://i.imgur.com/gQjDvmj.jpeg",
      order: 3,
    },
    {
      _id: "4",
      name: "Shreya Kar",
      role: "Finance Head",
      bio: "Manages project budgets and financial planning.",
      imageUrl: "https://i.imgur.com/LlsE9HH.jpeg",
      order: 4,
    },
    {
      _id: "5",
      name: "Sai Sradha Ray",
      role: "Presentation Head",
      bio: "Leads presentation development and public speaking initiatives.",
      imageUrl: "https://i.imgur.com/I8B14Y6.jpeg",
      order: 5,
    },
    {
      _id: "6",
      name: "Riya Sakshi",
      role: "Social Impact Head",
      bio: "Focuses on the social implications and community impact of our projects.",
      imageUrl: "https://i.imgur.com/dUMJNa9.jpeg",
      order: 6,
    },
    {
      _id: "7",
      name: "Nirlipta Sahoo",
      role: "Networking & Outreach Head",
      bio: "Manages external partnerships and community outreach efforts.",
      imageUrl: "https://i.imgur.com/E1EsJSB.jpeg",
      order: 7,
    },
  ];

  const displayTeam = teamMembers && teamMembers.length > 0 ? teamMembers : sampleTeam;

  return (
    <section id="team" className="py-20 relative">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Meet Our <span className="bg-gradient-to-r from-teal-400 to-purple-500 bg-clip-text text-transparent">Team</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            A diverse group of talented individuals working together to create innovative solutions and drive meaningful change.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {displayTeam.map((member: any) => (
            <div
              key={member._id}
              className="group bg-gradient-to-br from-purple-800/20 to-teal-800/20 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6 hover:border-teal-400/50 transition-all duration-300 transform hover:scale-105 text-center"
            >
              <div className="mb-6">
                {member.imageUrl ? (
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-gradient-to-r from-teal-400 to-purple-500">
                    <OptimizedImage
                      src={member.imageUrl}
                      alt={member.name}
                      className="w-full h-full rounded-full"
                      loading="lazy"
                      fetchPriority="low"
                      sizes="96px"
                      width={96}
                      height={96}
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-r from-teal-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-2xl">
                      {member.name.split(" ").map((n: string) => n[0]).join("")}
                    </span>
                  </div>
                )}
              </div>

              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-teal-400 transition-colors">
                {member.name}
              </h3>

              <p className="text-teal-400 font-semibold mb-3">
                {member.role}
              </p>

              {member.bio && (
                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                  {member.bio}
                </p>
              )}

              <div className="flex justify-center gap-3 opacity-50">
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </div>
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
