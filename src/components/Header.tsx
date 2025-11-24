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
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white border-b border-gray-200 shadow-sm' : 'bg-white/95 backdrop-blur-sm'
      }`}>
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <span className="text-gray-900 font-bold text-xl">EduScrapeApp</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => scrollToSection('home')}
              className="text-gray-600 hover:text-purple-600 transition-colors duration-200 font-medium"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="text-gray-600 hover:text-purple-600 transition-colors duration-200 font-medium"
            >
              Why EduScrapeApp
            </button>
            <button
              onClick={() => scrollToSection('projects')}
              className="text-gray-600 hover:text-purple-600 transition-colors duration-200 font-medium"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('team')}
              className="text-gray-600 hover:text-purple-600 transition-colors duration-200 font-medium"
            >
              Team
            </button>
            <button
              onClick={() => scrollToSection('updates')}
              className="text-gray-600 hover:text-purple-600 transition-colors duration-200 font-medium"
            >
              Updates
            </button>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={() => navigateToHash('#dashboard')}
              className="text-gray-600 hover:text-purple-600 transition-colors duration-200 font-medium"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigateToHash('#login')}
              className="btn-primary"
            >
              Login
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-900"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-200 fade-in">
            <div className="flex flex-col space-y-3 pt-4">
              <button
                onClick={() => scrollToSection('home')}
                className="text-gray-600 hover:text-purple-600 transition-colors duration-200 text-left font-medium"
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection('about')}
                className="text-gray-600 hover:text-purple-600 transition-colors duration-200 text-left font-medium"
              >
                Why EduScrapeApp
              </button>
              <button
                onClick={() => scrollToSection('projects')}
                className="text-gray-600 hover:text-purple-600 transition-colors duration-200 text-left font-medium"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('team')}
                className="text-gray-600 hover:text-purple-600 transition-colors duration-200 text-left font-medium"
              >
                Team
              </button>
              <button
                onClick={() => scrollToSection('updates')}
                className="text-gray-600 hover:text-purple-600 transition-colors duration-200 text-left font-medium"
              >
                Updates
              </button>
              <button
                onClick={() => navigateToHash('#dashboard')}
                className="text-gray-600 hover:text-purple-600 transition-colors duration-200 text-left font-medium"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigateToHash('#login')}
                className="btn-primary text-center"
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
