import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

function renderFatal(message: string) {
  const rootElement = document.getElementById("root");
  if (!rootElement) return;

  createRoot(rootElement).render(
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--theme-bg)" }}
    >
      <div
        className="max-w-md w-full rounded-xl shadow-sm p-6"
        style={{ background: "var(--theme-card-bg)", border: "1px solid var(--theme-border)" }}
      >
        <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--theme-text)" }}>
          Configuration error
        </h1>
        <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
          {message}
        </p>
      </div>
    </div>
  );
}

if (!convexUrl || typeof convexUrl !== 'string') {
  console.error("VITE_CONVEX_URL environment variable is not defined");
  renderFatal(
    "Missing VITE_CONVEX_URL. Set it in your hosting environment (e.g. Vercel Project → Settings → Environment Variables) to your Convex deployment URL."
  );
} else {
  const convex = new ConvexReactClient(convexUrl);

  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }

  createRoot(rootElement).render(
    <ConvexAuthProvider client={convex}>
      <App />
    </ConvexAuthProvider>
  );
}
