import { useEffect, useState } from 'react';

export default function ThemeToggle() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        // Check localStorage or system preference
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
        setIsDark(shouldBeDark);
        document.documentElement.setAttribute('data-theme', shouldBeDark ? 'dark' : 'light');
        document.documentElement.classList.toggle('dark', shouldBeDark);
    }, []);

    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);

        const themeValue = newTheme ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', themeValue);
        document.documentElement.classList.toggle('dark', newTheme);
        localStorage.setItem('theme', themeValue);
    };

    return (
        <button
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all hover:scale-110 hover:shadow-md"
            style={{
                background: 'var(--theme-bg)',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text)'
            }}
            aria-label="Toggle theme"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
            {isDark ? (
                // Sun icon for light mode
                <svg className="h-5 w-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ) : (
                // Moon icon for dark mode
                <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
            )}
        </button>
    );
}
