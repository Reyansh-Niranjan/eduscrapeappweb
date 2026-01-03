export default function Footer() {
  return (
    <footer className="relative py-12" style={{ borderTop: '1px solid var(--theme-border)', background: 'var(--theme-footer-bg)' }}>
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <img src="/logo-icon.svg" alt="EduScrapeApp" className="w-10 h-10 rounded-lg" />
              <span className="font-bold text-xl" style={{ color: 'var(--theme-text)' }}>EduScrapeApp</span>
            </div>
            <p className="mb-6 max-w-md" style={{ color: 'var(--theme-text-secondary)' }}>
              The all-in-one platform that keeps curricula fresh, organised, and easy to share. Automate resource discovery,
              ensure alignment with standards, and put engaging content into teachers' hands faster.
            </p>

            {/* Social Media Placeholders */}
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center opacity-50">
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </div>
              <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center opacity-50">
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </div>
              <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center opacity-50">
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' })}
                  className="hover:text-teal-400 transition-colors"
                  style={{ color: 'var(--theme-text-secondary)' }}
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                  className="hover:text-teal-400 transition-colors"
                  style={{ color: 'var(--theme-text-secondary)' }}
                >
                  Why EduScrapeApp
                </button>
              </li>
              <li>
                <button
                  onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}
                  className="hover:text-teal-400 transition-colors"
                  style={{ color: 'var(--theme-text-secondary)' }}
                >
                  Features
                </button>
              </li>
              <li>
                <button
                  onClick={() => document.getElementById('team')?.scrollIntoView({ behavior: 'smooth' })}
                  className="hover:text-teal-400 transition-colors"
                  style={{ color: 'var(--theme-text-secondary)' }}
                >
                  Team
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>Connect</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/Reyansh-Niranjan/eduscrapeappweb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-teal-400 transition-colors"
                  style={{ color: 'var(--theme-text-secondary)' }}
                >
                  GitHub Repository
                </a>
              </li>
              <li className="opacity-50" style={{ color: 'var(--theme-text-secondary)' }}>Email (Coming Soon)</li>
              <li className="opacity-50" style={{ color: 'var(--theme-text-secondary)' }}>Discord (Coming Soon)</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 text-center" style={{ borderTop: '1px solid var(--theme-border)' }}>
          <p className="text-gray-400">
            © {new Date().getFullYear()} EduScrapeApp. Built for educators who deserve better tools.
          </p>
        </div>
      </div>
    </footer>
  );
}
