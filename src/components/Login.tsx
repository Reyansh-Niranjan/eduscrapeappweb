import { SignInForm } from "../SignInForm";

interface LoginProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function Login({ onSuccess, onCancel }: LoginProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-lg">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2m12 0h6v-2a4 4 0 00-4-4h-2m0 6v-2a4 4 0 00-4-4V7a4 4 0 118 0v4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="mt-2 text-sm text-gray-600">
            Choose Google, GitHub, or email to access your EduScrapeApp dashboard.
          </p>
        </div>

        <div className="mb-6">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            ← Back to site
          </button>
        </div>

        <div className="rounded-xl bg-gray-50 p-6 border border-gray-200">
          <SignInForm
            onSuccess={onSuccess}
            redirectHash="#dashboard"
          />
        </div>
      </div>
    </div>
  );
}

