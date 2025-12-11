import { SignInForm } from "../SignInForm";
import ThemeToggle from "./ThemeToggle";

interface LoginProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function Login({ onSuccess, onCancel }: LoginProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ background: 'linear-gradient(135deg, var(--theme-bg), var(--theme-bg-secondary))' }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border p-8 shadow-xl"
        style={{
          background: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-border)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        }}
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-lg">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2m12 0h6v-2a4 4 0 00-4-4h-2m0 6v-2a4 4 0 00-4-4V7a4 4 0 118 0v4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--theme-text)' }}>Welcome Back</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
            Choose Google or email to access your EduScrapeApp dashboard.
          </p>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-semibold transition"
            style={{
              color: 'var(--theme-text)',
              border: `1px solid var(--theme-border)`,
              background: 'var(--theme-card-bg)',
            }}
          >
            ← Back to site
          </button>
          <ThemeToggle />
        </div>

        <div
          className="rounded-xl p-6 border"
          style={{
            background: 'var(--theme-bg-secondary)',
            borderColor: 'var(--theme-border)',
          }}
        >
          <SignInForm
            onSuccess={onSuccess}
            redirectHash="#dashboard"
          />
        </div>
      </div>
    </div>
  );
}

