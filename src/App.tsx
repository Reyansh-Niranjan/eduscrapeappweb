import { Toaster } from "sonner";
import { SpeedInsights } from "@vercel/speed-insights/react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import About from "./components/About";
import Projects from "./components/Projects";
import Team from "./components/Team";
import Updates from "./components/Updates";
import Footer from "./components/Footer";
import AIAssistant from "./components/AIAssistant";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { lazy, Suspense, useEffect, useState } from "react";

const Admin = lazy(() => import("./components/Admin"));
const Login = lazy(() => import("./components/Login.tsx"));
const Dashboard = lazy(() => import("./components/Dashboard.tsx"));

function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--theme-bg)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
        <p style={{ color: 'var(--theme-text-secondary)' }}>Loading…</p>
      </div>
    </div>
  );
}

type View = "home" | "admin" | "login" | "dashboard";

const getViewFromURL = (): View => {
  const { pathname, hash, search } = window.location;

  // Check hash first (works reliably with static hosts + rewrites)
  if (hash === "#admin") return "admin";
  if (hash === "#login") return "login";
  if (hash === "#dashboard") return "dashboard";

  // Then check pathname (for direct links like /dashboard)
  if (pathname === "/admin") return "admin";
  if (pathname === "/login") return "login";
  if (pathname === "/dashboard") return "dashboard";
  
  // Check search params
  const params = new URLSearchParams(search);
  if (params.get("admin") === "true") return "admin";
  if (params.get("dashboard") === "true") return "dashboard";
  
  return "home";
};

export default function App() {
  const [currentView, setCurrentView] = useState<View>(getViewFromURL);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";

    // Initialize theme on app load
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    document.documentElement.setAttribute('data-theme', shouldBeDark ? 'dark' : 'light');

    const handleRouteChange = () => {
      setCurrentView(getViewFromURL());
    };

    window.addEventListener("hashchange", handleRouteChange);
    window.addEventListener("popstate", handleRouteChange);

    return () => {
      window.removeEventListener("hashchange", handleRouteChange);
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="min-h-screen" style={{ background: 'var(--theme-bg)' }}>
        {currentView === "admin" ? (
          <Suspense fallback={<FullPageLoader />}>
            <Admin />
          </Suspense>
        ) : currentView === "login" ? (
          <Suspense fallback={<FullPageLoader />}>
            <Login
              onCancel={() => {
                try {
                  window.history.pushState({}, "", "/");
                } catch {
                  // noop
                }
                window.location.hash = "";
                setCurrentView("home");
              }}
              onSuccess={() => {
                try {
                  window.history.pushState({}, "", "/");
                } catch {
                  // noop
                }
                window.location.hash = "#dashboard";
                setCurrentView("dashboard");
              }}
            />
          </Suspense>
        ) : currentView === "dashboard" ? (
          <Suspense fallback={<FullPageLoader />}>
            <Dashboard
              onLogout={() => {
                try {
                  window.history.pushState({}, "", "/");
                } catch {
                  // noop
                }
                window.location.hash = "";
                setCurrentView("home");
              }}
            />
          </Suspense>
        ) : (
          <>
            <Header />
            <main className="relative">
              <Hero />
              <About />
              <Projects />
              <Team />
              <Updates />
            </main>
            <Footer />
            <AIAssistant />
          </>
        )}

        <Toaster theme="system" richColors />
        <SpeedInsights />
      </div>
    </ErrorBoundary>
  );
}
