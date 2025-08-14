export default function About() {
  return (
    <section id="about" className="py-20 relative">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            About <span className="bg-gradient-to-r from-teal-400 to-purple-500 bg-clip-text text-transparent">Our Mission</span>
          </h2>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-left">
              <p className="text-lg text-gray-300 mb-6 leading-relaxed">
                We are a passionate team of innovators committed to pushing the boundaries of technology 
                and creativity. Our mission is to develop solutions that make a meaningful impact on society 
                while fostering collaboration and learning.
              </p>
              
              <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                Through our diverse expertise in design, development, finance, presentation, and outreach, 
                we bring unique perspectives to every project we undertake.
              </p>

              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4 bg-purple-800/30 rounded-lg backdrop-blur-sm">
                  <div className="text-3xl font-bold text-teal-400 mb-2">7</div>
                  <div className="text-gray-300">Team Members</div>
                </div>
                <div className="text-center p-4 bg-purple-800/30 rounded-lg backdrop-blur-sm">
                  <div className="text-3xl font-bold text-teal-400 mb-2">∞</div>
                  <div className="text-gray-300">Possibilities</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="w-full h-80 bg-gradient-to-br from-purple-600/20 to-teal-600/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-purple-500/30">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-r from-teal-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Innovation First</h3>
                  <p className="text-gray-300">Driving change through creative solutions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
