/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0ABAB5',
          hover: '#089a96',
        },
        secondary: '#3B0A45',
        accent: '#FFFFFF',
        dark: {
          100: '#1a1a2e',
          200: '#16213e',
          300: '#0f3460',
        },
        // Solid theme colors
        theme: {
          bg: 'var(--theme-bg)',
          'bg-secondary': 'var(--theme-bg-secondary)',
          text: 'var(--theme-text)',
          'text-secondary': 'var(--theme-text-secondary)',
          'text-light': 'var(--theme-text-light)',
          border: 'var(--theme-border)',
          'border-secondary': 'var(--theme-border-secondary)',
          'card-bg': 'var(--theme-card-bg)',
          'nav-bg': 'var(--theme-nav-bg)',
          'hero-bg': 'var(--theme-hero-bg)',
          'footer-bg': 'var(--theme-footer-bg)',
        },
        // Brand solid colors
        purple: {
          DEFAULT: 'var(--color-purple)',
          dark: 'var(--color-purple-dark)',
        },
        teal: {
          DEFAULT: 'var(--color-teal)',
          dark: 'var(--color-teal-dark)',
        },
        gray: {
          50: 'var(--color-gray-50)',
          100: 'var(--color-gray-100)',
          200: 'var(--color-gray-200)',
          300: 'var(--color-gray-300)',
          600: 'var(--color-gray-600)',
          800: 'var(--color-gray-800)',
        },
      },
      spacing: {
        'section': '2rem',
        'container': '1rem',
      },
      borderRadius: {
        'container': '0.75rem',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
      },
      // Removed gradients as per solid color requirement
    },
  },
  plugins: [
    // Custom utilities for solid colors
    function({ addUtilities }) {
      addUtilities({
        '.solid-card': {
          background: 'var(--theme-card-bg)',
          border: '1px solid var(--theme-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-lg)',
          boxShadow: '0 1px 3px var(--theme-card-shadow)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        '.solid-card:hover': {
          boxShadow: '0 4px 12px var(--theme-card-shadow)',
          transform: 'translateY(-2px)',
        },
        '.solid-nav': {
          background: 'var(--theme-nav-bg)',
          borderBottom: '1px solid var(--theme-border)',
        },
        '.solid-panel': {
          background: 'var(--theme-bg-secondary)',
          border: '1px solid var(--theme-border)',
          borderRadius: 'var(--radius-lg)',
        },
      });
    },
  ],
}
