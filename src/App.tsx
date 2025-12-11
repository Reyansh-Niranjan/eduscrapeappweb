import { Toaster } from "sonner";
import Header from "./components/Header";
import Hero from "./components/Hero";
import About from "./components/About";
import Projects from "./components/Projects";
import Team from "./components/Team";
import Updates from "./components/Updates";
import Login from "./components/Login.tsx";
import Dashboard from "./components/Dashboard.tsx";
import Footer from "./components/Footer";
import Admin from "./components/Admin";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useEffect, useState } from "react";

type View = "home" | "admin" | "login" | "dashboard";

const getViewFromURL = (): View => {
  const { pathname, hash, search } = window.location;
  
  // Check pathname first
  if (pathname === "/admin") return "admin";
  if (pathname === "/dashboard") return "dashboard";
  
  // Check hash
  if (hash === "#admin") return "admin";
  if (hash === "#login") return "login";
  if (hash === "#dashboard") return "dashboard";
  
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

  if (currentView === "admin") {
    return <Admin />;
  }

  if (currentView === "login") {
    return (
      <Login
        onCancel={() => {
          window.location.hash = "";
          setCurrentView("home");
        }}
        onSuccess={() => {
          window.location.hash = "#dashboard";
          setCurrentView("dashboard");
        }}
      />
    );
  }

  if (currentView === "dashboard") {
    return (
      <Dashboard
        onLogout={() => {
          window.location.hash = "";
          setCurrentView("home");
        }}
      />
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen" style={{ background: 'var(--theme-bg)' }}>
        <Header />

        <main className="relative">
          <Hero />
          <About />
          <Projects />
          <Team />
          <Updates />
        </main>

        <Footer />
        <Toaster theme="light" />
      </div>
    </ErrorBoundary>
  );
}
