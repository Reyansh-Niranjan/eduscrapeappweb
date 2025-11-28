"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";

const oauthProviders: Array<{ id: string; label: string }> = [
  { id: "google", label: "Continue with Google" },
];

interface SignInFormProps {
  onSuccess?: () => void;
  redirectHash?: string;
}

export function SignInForm({ onSuccess, redirectHash = "#dashboard" }: SignInFormProps = {}) {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);

  const buildRedirectUrl = () => {
    const hash = redirectHash.startsWith("#") ? redirectHash : `#${redirectHash}`;
    return `${window.location.origin}/${hash}`;
  };

  const handleOAuth = async (provider: string) => {
    setSubmitting(true);
    try {
      await signIn(provider, {
        redirectTo: buildRedirectUrl(),
      });
      onSuccess?.();
      toast.success(`Redirecting to ${provider}...`);
    } catch (error) {
      console.error(`[auth] ${provider} sign-in failed`, error);
      toast.error(`Could not sign in with ${provider}. Please try again.`);
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <form
        className="flex flex-col gap-form-field"
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          const form = e.target as HTMLFormElement;
          const formData = new FormData(form);
          formData.set("flow", flow);
          try {
            await signIn("password", formData);
            window.location.hash = redirectHash;
            onSuccess?.();
          } catch (error: any) {
            let toastTitle = "";
            if (error.message?.includes("Invalid password")) {
              toastTitle = "Invalid password. Please try again.";
            } else {
              toastTitle =
                flow === "signIn"
                  ? "Could not sign in, did you mean to sign up?"
                  : "Could not sign up, did you mean to sign in?";
            }
            toast.error(toastTitle);
            setSubmitting(false);
            return;
          }
        }}
      >
        <input
          className="auth-input-field"
          type="email"
          name="email"
          placeholder="Email"
          required
        />
        <input
          className="auth-input-field"
          type="password"
          name="password"
          placeholder="Password"
          required
        />
        <button className="auth-button" type="submit" disabled={submitting}>
          {flow === "signIn" ? "Sign in" : "Sign up"}
        </button>
        <div className="text-center text-sm text-secondary">
          <span>
            {flow === "signIn"
              ? "Don't have an account? "
              : "Already have an account? "}
          </span>
          <button
            type="button"
            className="text-primary hover:text-primary-hover hover:underline font-medium cursor-pointer"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          >
            {flow === "signIn" ? "Sign up instead" : "Sign in instead"}
          </button>
        </div>
      </form>

      <div className="flex items-center justify-center my-3">
        <hr className="my-4 grow border-gray-200" />
        <span className="mx-4 text-secondary">or</span>
        <hr className="my-4 grow border-gray-200" />
      </div>

      <div className="flex flex-col gap-2">
        {oauthProviders.map((provider) => (
          <button
            key={provider.id}
            className="auth-button flex items-center justify-center gap-2"
            onClick={() => handleOAuth(provider.id)}
            disabled={submitting}
            type="button"
          >
            {provider.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center my-3">
        <hr className="my-4 grow border-gray-200" />
        <span className="mx-4 text-secondary">or</span>
        <hr className="my-4 grow border-gray-200" />
      </div>

      <button
        className="auth-button"
        onClick={async () => {
          setSubmitting(true);
          try {
            await signIn("anonymous");
            window.location.hash = redirectHash;
            onSuccess?.();
          } catch (error) {
            toast.error("Could not continue anonymously. Please try again.");
            setSubmitting(false);
          }
        }}
        disabled={submitting}
        type="button"
      >
        Continue anonymously
      </button>
    </div>
  );
}
