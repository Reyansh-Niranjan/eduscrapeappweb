import { Toaster } from "sonner";
import Header from "./components/Header";
import Hero from "./components/Hero";
import About from "./components/About";
import Projects from "./components/Projects";
import Team from "./components/Team";
import Updates from "./components/Updates";
import Footer from "./components/Footer";
import Admin from "./components/Admin";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Chat from "./components/Chat";
import ProfileCompletionBanner from "./components/ProfileCompletionBanner";
import { useEffect, useState } from "react";

export default function App() {
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";

    const checkAdminRoute = () => {
      if (
        window.location.pathname === "/admin" ||
        window.location.hash === "#admin" ||
        window.location.search.includes("admin=true")
      ) {
        setShowAdmin(true);
      }
    };

    checkAdminRoute();

    const handleHashChange = () => checkAdminRoute();
    window.addEventListener("hashchange", handleHashChange);

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  if (showAdmin) {
    return <Admin />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-teal-900">
        <div className="fixed inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.02%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] pointer-events-none"></div>

        <Header />

        <main className="relative z-10">
          <ProfileCompletionBanner />
          <Hero />
          <About />
          <Projects />
          <Team />
          <Updates />
        </main>

        <Footer />
        <Chat />
        <Toaster theme="dark" />
      </div>
    </ErrorBoundary>
  );
}
