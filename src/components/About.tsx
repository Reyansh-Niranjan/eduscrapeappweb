export default function About() {
  return (
    <section id="about" className="py-20 relative">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            Why <span className="bg-gradient-to-r from-teal-400 to-purple-500 bg-clip-text text-transparent">EduScrapeApp</span> Matters
          </h2>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-left">
              <p className="text-lg text-gray-300 mb-6 leading-relaxed">
                EduScrapeApp streamlines how schools and tutoring centres gather learning materials. Instead of manually
                copying resources from dozens of sites, educators define a topic once and let EduScrapeApp surface the
                most relevant content, complete with readability grading and citation tracking.
              </p>
              
              <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                Built for curriculum teams, administrators, and classroom teachers alike, the platform reduces prep time,
                keeps lesson plans aligned with standards, and provides one-click sharing to any device.
              </p>

              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4 bg-purple-800/30 rounded-lg backdrop-blur-sm">
                  <div className="text-3xl font-bold text-teal-400 mb-2">85%</div>
                  <div className="text-gray-300">Prep Time Saved</div>
                </div>
                <div className="text-center p-4 bg-purple-800/30 rounded-lg backdrop-blur-sm">
                  <div className="text-3xl font-bold text-teal-400 mb-2">10k+</div>
                  <div className="text-gray-300">Curated Resources</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="w-full h-80 bg-gradient-to-br from-purple-600/20 to-teal-600/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-purple-500/30">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-r from-teal-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.105 0-2-.672-2-1.5S10.895 5 12 5s2 .672 2 1.5S13.105 8 12 8zM6 22l2-7-4-4 5-.4L12 4l3 6.6 5 .4-4 4 2 7-6-3-6 3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Built for Classrooms</h3>
                  <p className="text-gray-300">Secure, scalable infrastructure that keeps educators in control of every source.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
