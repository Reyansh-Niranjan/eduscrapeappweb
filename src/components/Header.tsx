import { useState, useEffect, useCallback } from 'react';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  }, []);

  const navigateToHash = useCallback((hash: string) => {
    window.location.hash = hash;
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300" style={{ background: isScrolled ? 'var(--theme-nav-bg)' : 'rgba(var(--theme-nav-bg), 0.95)', borderBottom: isScrolled ? '1px solid var(--theme-border)' : 'none', boxShadow: isScrolled ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', backdropFilter: 'blur(8px)' }}>
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/logo-icon.svg" alt="EduScrapeApp" className="w-10 h-10 rounded-lg" />
            <span className="font-bold text-xl" style={{ color: 'var(--theme-text)' }}>EduScrapeApp</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => scrollToSection('home')}
              className="transition-colors duration-200 font-medium"
              style={{ color: 'var(--theme-text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#8B5CF6'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--theme-text-secondary)'}
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="transition-colors duration-200 font-medium"
              style={{ color: 'var(--theme-text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#8B5CF6'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--theme-text-secondary)'}
            >
              Why EduScrapeApp
            </button>
            <button
              onClick={() => scrollToSection('projects')}
              className="transition-colors duration-200 font-medium"
              style={{ color: 'var(--theme-text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#8B5CF6'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--theme-text-secondary)'}
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('team')}
              className="transition-colors duration-200 font-medium"
              style={{ color: 'var(--theme-text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#8B5CF6'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--theme-text-secondary)'}
            >
              Team
            </button>
            <button
              onClick={() => scrollToSection('updates')}
              className="transition-colors duration-200 font-medium"
              style={{ color: 'var(--theme-text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#8B5CF6'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--theme-text-secondary)'}
            >
              Updates
            </button>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <ThemeToggle />
            <button
              onClick={() => navigateToHash('#login')}
              className="btn-primary"
            >
              Login
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{ color: 'var(--theme-text)' }}
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
              <div className="pt-2">
                <ThemeToggle />
              </div>
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
