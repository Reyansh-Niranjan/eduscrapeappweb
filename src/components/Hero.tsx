import { useEffect, useState } from 'react';
import OptimizedLogo from './OptimizedLogo';

export default function Hero() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div 
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse"
          style={{ transform: `translateY(${scrollY * 0.3}px)` }}
        ></div>
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-pulse"
          style={{ transform: `translateY(${scrollY * -0.2}px)` }}
        ></div>
      </div>

      <div className="container mx-auto px-6 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Team Logo */}
          <div className="mb-8 flex justify-center">
            <div className="w-32 h-32 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden bg-gradient-to-br from-purple-600/30 to-teal-600/30">
              <OptimizedLogo 
                src="https://i.imgur.com/r4W9l7n.png"
                alt="Celestial Coders Team Logo"
                className="w-full h-full object-cover"
                fallbackText="CC"
                width={128}
                height={128}
              />
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Innovation Through
            <span className="bg-gradient-to-r from-teal-400 to-purple-500 bg-clip-text text-transparent"> Collaboration</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            We are a dynamic team of innovators, creators, and problem-solvers dedicated to building 
            the future through cutting-edge technology and creative solutions.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <button 
              onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-gradient-to-r from-teal-500 to-purple-600 text-white font-semibold rounded-lg hover:from-teal-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Explore Our Work
            </button>
            <button 
              onClick={() => document.getElementById('team')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 border-2 border-teal-400 text-teal-400 font-semibold rounded-lg hover:bg-teal-400 hover:text-white transition-all duration-300 transform hover:scale-105"
            >
              Meet the Team
            </button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-gray-400 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-gray-400 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
