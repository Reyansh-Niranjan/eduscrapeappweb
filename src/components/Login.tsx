import { SignInForm } from "../SignInForm";

interface LoginProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function Login({ onSuccess, onCancel }: LoginProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-teal-900 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl rounded-2xl border border-purple-500/30 bg-purple-900/40 p-8 shadow-2xl backdrop-blur">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-teal-400 to-purple-500 text-white">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2m12 0h6v-2a4 4 0 00-4-4h-2m0 6v-2a4 4 0 00-4-4V7a4 4 0 118 0v4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
          <p className="mt-2 text-sm text-gray-300">
            Choose Google, GitHub, or email to access your EduScrapeApp dashboard.
          </p>
        </div>

        <div className="mb-6">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-purple-400/60 px-4 py-2 text-sm font-semibold text-purple-200 transition hover:border-purple-300 hover:text-white"
          >
            ← Back to site
          </button>
        </div>

        <div className="rounded-2xl border border-purple-500/20 bg-purple-950/30 p-6 backdrop-blur">
          <SignInForm
            onSuccess={onSuccess}
            redirectHash="#dashboard"
          />
        </div>
      </div>
    </div>
  );
}

