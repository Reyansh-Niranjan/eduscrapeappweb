import { useEffect, useState } from 'react';

export default function Hero() {
  const [isVisible, setIsVisible] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ background: 'var(--theme-hero-bg)' }}>
      {/* Clean background with subtle pattern */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, var(--theme-bg-secondary), var(--theme-bg))' }}></div>

      <div className="container mx-auto px-6 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Product Logo with animation */}
          <div className={`mb-8 flex justify-center ${isVisible ? 'scale-in' : 'opacity-0'}`}>
            <div className="w-32 h-32 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden border-2" style={{ background: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}>
              {logoError ? (
                <div className="w-full h-full flex items-center justify-center bg-purple-600 text-white font-bold text-2xl">
                  CC
                </div>
              ) : (
                <img
                  src="https://i.imgur.com/r4W9l7n.png"
                  alt="EduScrapeApp Logo"
                  className="w-full h-full object-cover"
                  width={128}
                  height={128}
                  onLoad={() => setLogoLoaded(true)}
                  onError={() => setLogoError(true)}
                  style={{ opacity: logoLoaded ? 1 : 0.7, transition: 'opacity 0.3s ease-in-out' }}
                />
              )}
            </div>
          </div>

          <h1 className={`text-5xl md:text-7xl font-bold mb-6 leading-tight ${isVisible ? 'slide-up' : 'opacity-0'}`} style={{ color: 'var(--theme-text)' }}>
            EduScrapeApp
            <span className="text-purple-600"> Reinvents Learning</span>
          </h1>

          <p className={`text-xl md:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed ${isVisible ? 'slide-up stagger-1' : 'opacity-0'}`} style={{ color: 'var(--theme-text-secondary)' }}>
            Discover a unified platform that collects, organises, and delivers curriculum-ready content in seconds.
            EduScrapeApp blends smart automation with educator-friendly design so schools can keep lesson plans current without the busywork.
          </p>

          <div className={`flex flex-col sm:flex-row gap-6 justify-center items-center ${isVisible ? 'slide-up stagger-2' : 'opacity-0'}`}>
            <button
              onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-primary px-8 py-4 text-lg"
            >
              Explore Features
            </button>
            <button
              onClick={() => document.getElementById('team')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-outline px-8 py-4 text-lg"
            >
              See Outcomes
            </button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 rounded-full flex justify-center" style={{ borderColor: 'var(--theme-text-light)' }}>
            <div className="w-1 h-3 rounded-full mt-2" style={{ background: 'var(--theme-text-light)' }}></div>
          </div>
        </div>
      </div>
    </section>
  );
}
