export default function About() {
  return (
    <section id="about" className="py-20 relative bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Why <span className="text-purple-600">EduScrapeApp</span> Matters
          </h2>
          <div className="w-20 h-1 bg-purple-600 mx-auto mb-12"></div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-left">
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                EduScrapeApp streamlines how schools and tutoring centres gather learning materials. Instead of manually
                copying resources from dozens of sites, educators define a topic once and let EduScrapeApp surface the
                most relevant content, complete with readability grading and citation tracking.
              </p>

              <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                Built for curriculum teams, administrators, and classroom teachers alike, the platform reduces prep time,
                keeps lesson plans aligned with standards, and provides one-click sharing to any device.
              </p>

              <div className="grid grid-cols-2 gap-6">
                <div className="card text-center hover-lift">
                  <div className="text-4xl font-bold text-teal-600 mb-2">85%</div>
                  <div className="text-gray-600 font-medium">Prep Time Saved</div>
                </div>
                <div className="card text-center hover-lift">
                  <div className="text-4xl font-bold text-purple-600 mb-2">10k+</div>
                  <div className="text-gray-600 font-medium">Curated Resources</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="card p-12 hover-lift bg-gradient-to-br from-purple-50 to-teal-50 border-2 border-purple-200">
                <div className="text-center">
                  <div className="w-24 h-24 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Built for Classrooms</h3>
                  <p className="text-gray-700">Secure, scalable infrastructure that keeps educators in control of every source.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
