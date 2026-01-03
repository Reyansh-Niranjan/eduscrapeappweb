import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { X, Bot, Sparkles } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useEffect, useState, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';

interface AlsomAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (session: Session) => void;
}

export default function AlsomAuthModal({ isOpen, onClose, onAuthSuccess }: AlsomAuthModalProps) {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check theme on mount and when modal opens
  useEffect(() => {
    if (isOpen) {
      const theme = document.documentElement.getAttribute('data-theme');
      setIsDarkMode(theme === 'dark');
    }
  }, [isOpen]);

  useEffect(() => {
    setIsConfigured(isSupabaseConfigured());
  }, []);

  useEffect(() => {
    if (!isOpen || !isConfigured) return;

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        onAuthSuccess(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isOpen, isConfigured, onAuthSuccess]);

  // Memoize theme to avoid recalculating on every render
  const authTheme = useMemo(() => isDarkMode ? 'dark' : 'light', [isDarkMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-full blur-3xl -top-48 -left-48 animate-pulse" />
        <div className="absolute w-96 h-96 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4 text-center border-b border-gray-200 dark:border-gray-800">
          {/* Logos */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="text-gray-400 text-2xl">×</span>
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Bot className="h-6 w-6 text-white" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Welcome to Alsom AI
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Sign in to continue with AI chat
          </p>
        </div>

        {/* Auth Content */}
        <div className="p-6">
          {!isConfigured ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Configuration Required
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Supabase authentication is not yet configured. Please add the VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: isDarkMode ? '#7c3aed' : '#6366f1',
                      brandAccent: isDarkMode ? '#6d28d9' : '#4f46e5',
                    }
                  }
                },
                className: {
                  container: 'supabase-auth-container',
                  button: 'supabase-auth-button',
                  input: 'supabase-auth-input',
                }
              }}
              providers={[]}
              theme={authTheme}
            />
          )}
        </div>
      </div>
    </div>
  );
}
