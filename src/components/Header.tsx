import { useState, useEffect } from 'react';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  const navigateToHash = (hash: string) => {
    window.location.hash = hash;
    setIsMobileMenuOpen(false);
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-purple-900/90 backdrop-blur-md shadow-lg' : 'bg-transparent'
    }`}>
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-teal-400 to-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <span className="text-white font-bold text-xl">EduScrapeApp</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => scrollToSection('home')}
              className="text-gray-300 hover:text-teal-400 transition-colors duration-200"
            >
              Home
            </button>
            <button 
              onClick={() => scrollToSection('about')}
              className="text-gray-300 hover:text-teal-400 transition-colors duration-200"
            >
              Why EduScrapeApp
            </button>
            <button 
              onClick={() => scrollToSection('projects')}
              className="text-gray-300 hover:text-teal-400 transition-colors duration-200"
            >
              Features
            </button>
            <button 
              onClick={() => scrollToSection('team')}
              className="text-gray-300 hover:text-teal-400 transition-colors duration-200"
            >
              Team
            </button>
            <button 
              onClick={() => scrollToSection('updates')}
              className="text-gray-300 hover:text-teal-400 transition-colors duration-200"
            >
              Updates
            </button>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={() => navigateToHash('#dashboard')}
              className="text-gray-300 hover:text-teal-400 transition-colors duration-200"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigateToHash('#login')}
              className="inline-flex items-center rounded-lg bg-gradient-to-r from-teal-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-teal-600 hover:to-purple-700"
            >
              Login
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-purple-700">
            <div className="flex flex-col space-y-3 pt-4">
              <button 
                onClick={() => scrollToSection('home')}
                className="text-gray-300 hover:text-teal-400 transition-colors duration-200 text-left"
              >
                Home
              </button>
              <button 
                onClick={() => scrollToSection('about')}
                className="text-gray-300 hover:text-teal-400 transition-colors duration-200 text-left"
            >
              Why EduScrapeApp
              </button>
              <button 
                onClick={() => scrollToSection('projects')}
                className="text-gray-300 hover:text-teal-400 transition-colors duration-200 text-left"
            >
              Features
              </button>
              <button 
                onClick={() => scrollToSection('team')}
                className="text-gray-300 hover:text-teal-400 transition-colors duration-200 text-left"
              >
                Team
              </button>
              <button 
                onClick={() => scrollToSection('updates')}
                className="text-gray-300 hover:text-teal-400 transition-colors duration-200 text-left"
              >
                Updates
              </button>
              <button 
                onClick={() => navigateToHash('#dashboard')}
                className="text-gray-300 hover:text-teal-400 transition-colors duration-200 text-left"
              >
                Dashboard
              </button>
              <button 
                onClick={() => navigateToHash('#login')}
                className="rounded-lg bg-gradient-to-r from-teal-500 to-purple-600 px-4 py-2 text-left text-sm font-semibold text-white transition hover:from-teal-600 hover:to-purple-700"
              >
                Login
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
