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
import ProfileCompletionBanner from "./components/ProfileCompletionBanner";
import { useEffect, useState } from "react";

type View = "home" | "admin" | "login" | "dashboard";

export default function App() {
  const [currentView, setCurrentView] = useState<View>("home");

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";

    const determineView = () => {
      if (
        window.location.pathname === "/admin" ||
        window.location.hash === "#admin" ||
        window.location.search.includes("admin=true")
      ) {
        setCurrentView("admin");
        return;
      }
      if (window.location.hash === "#login") {
        setCurrentView("login");
        return;
      }
      if (
        window.location.hash === "#dashboard" ||
        window.location.pathname === "/dashboard" ||
        window.location.search.includes("dashboard=true")
      ) {
        setCurrentView("dashboard");
        return;
      }
      setCurrentView("home");
    };

    determineView();

    const handleHashChange = () => determineView();
    window.addEventListener("hashchange", handleHashChange);

    return () => window.removeEventListener("hashchange", handleHashChange);
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
          <ProfileCompletionBanner />
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
