import { Suspense, lazy, useMemo, useState, memo } from "react";
import AIAssistant from "./AIAssistant";
import ProfileCompletionBanner from "./ProfileCompletionBanner";
import ThemeToggle from "./ThemeToggle";
import { ErrorBoundary } from "./ErrorBoundary";
import {
  BookOpen,
  LayoutDashboard,
  UserCircle,
  Trophy,
  Zap,
  Users,
  Shield,
  BarChart3,
  FolderKanban,
} from "lucide-react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { motion } from "framer-motion";
import { toast } from "sonner";

const Library = lazy(() => import("./Library"));
const ProfileEdit = lazy(() => import("./ProfileEdit"));

function SectionLoader({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
        <p className="mt-4 text-[var(--theme-text-secondary)]">Loading {label}…</p>
      </div>
    </div>
  );
}

interface DashboardProps {
  onLogout: () => void;
}

// Memoized Overview component to prevent unnecessary re-renders
const DashboardOverview = memo(
  ({
    userName,
    userRole,
    grade,
    userProgress,
    onBrowseLibrary,
    onViewProgress,
    onStartSession,
  }: {
    userName?: string;
    userRole?: string;
    grade?: string;
    userProgress?: {
      totalXP: number;
      booksCompleted: number;
      chaptersCompleted: number;
      quizzesPassed: number;
      currentStreak: number;
      longestStreak: number;
      lastActivity: number;
      completionPercentage: number;
    };
    onBrowseLibrary?: () => void;
    onViewProgress?: () => void;
    onStartSession?: () => void;
  }) => {
  const role = (userRole || "student").toLowerCase();
  const isAdmin = role.includes("admin");
  const isTeacher = role.includes("teacher");
  const isStudent = !isAdmin && !isTeacher;

  const chaptersPerMonth = useQuery(
    api.progress.getChaptersPerMonth,
    isStudent ? { months: 6 } : "skip"
  );

  const chart = useMemo(() => {
    const pts = chaptersPerMonth?.points ?? [];
    if (pts.length === 0) return null;

    const values = pts.map((p) => p.count);
    const max = Math.max(1, ...values);

    const width = 100;
    const height = 44;
    const padX = 4;
    const padY = 6;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;

    const points = pts.map((p, i) => {
      const x = padX + (innerW * (pts.length === 1 ? 0 : i / (pts.length - 1)));
      const y = padY + innerH * (1 - p.count / max);
      return { x, y, count: p.count, month: p.month };
    });

    const polyline = points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
    const latest = points[points.length - 1]?.count ?? 0;

    const monthLabel = (ym: string) => {
      const [y, m] = ym.split("-");
      const dt = new Date(Number(y), Math.max(0, Number(m) - 1), 1);
      return dt.toLocaleString(undefined, { month: "short" });
    };

    return {
      polyline,
      dots: points,
      latest,
      labels: pts.map((p) => monthLabel(p.month)),
    };
  }, [chaptersPerMonth]);

  const lastActivityText = (() => {
    const ts = userProgress?.lastActivity;
    if (!ts || ts <= 0) return "No recent activity yet.";
    try {
      return `Last activity: ${new Date(ts).toLocaleString()}`;
    } catch {
      return "Last activity recorded.";
    }
  })();

  const streakText = (() => {
    const streak = userProgress?.currentStreak;
    if (typeof streak !== "number") return "Start studying to build a streak.";
    if (streak <= 0) return "Start a streak by studying today.";
    return `Keep your ${streak}-day learning streak alive!`;
  })();

  return (
    <motion.div
      className="px-6 py-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <motion.header
          className="card flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-[var(--theme-card-bg)] border border-[var(--theme-border)]"
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <div>
            <motion.h1
              className="text-3xl font-bold text-[var(--theme-text)]"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {isAdmin
                ? "Admin Dashboard"
                : isTeacher
                  ? "Teacher Dashboard"
                  : "Student Dashboard"}
            </motion.h1>
            <motion.p
              className="mt-2 text-sm text-[var(--theme-text-secondary)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {isAdmin
                ? "Monitor the platform, manage users, and review analytics."
                : isTeacher
                  ? "Manage resources, track class insights, and collaborate with educators."
                  : "Track progress, earn achievements, and access resources."}
            </motion.p>
          </div>
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-medium text-[var(--theme-text-secondary)]">
              {userName ? `${userName} • ` : ""}
              {isAdmin ? "Admin" : isTeacher ? "Teacher" : `Grade ${grade || "—"}`}
            </span>
          </motion.div>
        </motion.header>

        {/* Role-Based Highlights */}
        <motion.section
          className="grid gap-6 lg:grid-cols-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {isStudent && (
          <motion.div
            className="card text-center p-6 bg-[var(--theme-card-bg)] border border-[var(--theme-border)]"
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              <BarChart3 className="w-6 h-6 text-white" />
            </motion.div>
            <h3 className="font-semibold mb-2 text-[var(--theme-text)]">Chapters per month</h3>
            {chart ? (
              <div className="w-full">
                <svg viewBox="0 0 100 44" className="w-full h-16">
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-purple-500"
                    points={chart.polyline}
                  />
                  {chart.dots.map((d, idx) => (
                    <circle
                      key={idx}
                      cx={d.x}
                      cy={d.y}
                      r={1.8}
                      className="fill-purple-500"
                    />
                  ))}
                </svg>
                <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)]">
                  <span>{chart.labels[0]}</span>
                  <span>{chart.labels[Math.floor(chart.labels.length / 2)]}</span>
                  <span>{chart.labels[chart.labels.length - 1]}</span>
                </div>
                <p className="mt-2 text-xs text-[var(--theme-text-secondary)]">
                  This month: <span className="font-medium text-[var(--theme-text)]">{chart.latest}</span>
                </p>
              </div>
            ) : (
              <p className="text-xs text-[var(--theme-text-secondary)]">
                No monthly data yet.
              </p>
            )}
          </motion.div>
          )}

          {isStudent && (
          <motion.div
            className="card text-center p-6 bg-[var(--theme-card-bg)] border border-[var(--theme-border)]"
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center mx-auto mb-3"
              whileHover={{ scale: 1.1 }}
            >
              <Zap className="w-6 h-6 text-white" />
            </motion.div>
            <h3 className="font-semibold mb-2 text-[var(--theme-text)]">XP Points</h3>
            <motion.div
              className="text-2xl font-bold text-teal-500"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1, type: "spring", stiffness: 200 }}
            >
              {typeof userProgress?.totalXP === "number" ? userProgress.totalXP.toLocaleString() : "—"}
            </motion.div>
            <p className="text-xs text-[var(--theme-text-secondary)]">Total</p>
          </motion.div>
          )}

          {isStudent && (
          <motion.div
            className="card text-center p-6 bg-[var(--theme-card-bg)] border border-[var(--theme-border)]"
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <BookOpen className="w-6 h-6 text-white" />
            </motion.div>
            <h3 className="font-semibold mb-2 text-[var(--theme-text)]">Books Completed</h3>
            <motion.div
              className="text-2xl font-bold text-green-500"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 1.4 }}
            >
              {typeof userProgress?.booksCompleted === "number" ? userProgress.booksCompleted : "—"}
            </motion.div>
            <p className="text-xs text-[var(--theme-text-secondary)]">All time</p>
          </motion.div>
          )}

          {isTeacher && (
            <>
              <motion.div
                className="card text-center p-6 bg-[var(--theme-card-bg)] border border-[var(--theme-border)]"
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FolderKanban className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2 text-[var(--theme-text)]">Resource Hub</h3>
                <p className="text-xs text-[var(--theme-text-secondary)]">Organize and share materials</p>
              </motion.div>

              <motion.div
                className="card text-center p-6 bg-[var(--theme-card-bg)] border border-[var(--theme-border)]"
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2 text-[var(--theme-text)]">Class Insights</h3>
                <p className="text-xs text-[var(--theme-text-secondary)]">Track engagement trends</p>
              </motion.div>

              <motion.div
                className="card text-center p-6 bg-[var(--theme-card-bg)] border border-[var(--theme-border)]"
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2 text-[var(--theme-text)]">Automation</h3>
                <p className="text-xs text-[var(--theme-text-secondary)]">Keep curricula up to date</p>
              </motion.div>

              <motion.div
                className="card text-center p-6 bg-[var(--theme-card-bg)] border border-[var(--theme-border)]"
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2 text-[var(--theme-text)]">Library</h3>
                <p className="text-xs text-[var(--theme-text-secondary)]">Find and assign content</p>
              </motion.div>
            </>
          )}

          {isAdmin && (
            <>
              <motion.div
                className="card text-center p-6 bg-[var(--theme-card-bg)] border border-[var(--theme-border)]"
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2 text-[var(--theme-text)]">System</h3>
                <p className="text-xs text-[var(--theme-text-secondary)]">Platform health & access</p>
              </motion.div>

              <motion.div
                className="card text-center p-6 bg-[var(--theme-card-bg)] border border-[var(--theme-border)]"
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2 text-[var(--theme-text)]">Users</h3>
                <p className="text-xs text-[var(--theme-text-secondary)]">Manage accounts & roles</p>
              </motion.div>

              <motion.div
                className="card text-center p-6 bg-[var(--theme-card-bg)] border border-[var(--theme-border)]"
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2 text-[var(--theme-text)]">Analytics</h3>
                <p className="text-xs text-[var(--theme-text-secondary)]">Usage & performance</p>
              </motion.div>

              <motion.div
                className="card text-center p-6 bg-[var(--theme-card-bg)] border border-[var(--theme-border)]"
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FolderKanban className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2 text-[var(--theme-text)]">Content</h3>
                <p className="text-xs text-[var(--theme-text-secondary)]">Projects & updates</p>
              </motion.div>
            </>
          )}
        </motion.section>

        <motion.section
          className="grid gap-6 lg:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            className="card hover-lift p-6 bg-[var(--theme-card-bg)] border border-[var(--theme-border)]"
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-lg font-semibold mb-3 text-[var(--theme-text)]">Quick Actions</h2>
            <p className="text-sm mb-4 text-[var(--theme-text-secondary)]">
              Access your favorite resources and continue learning.
            </p>
            <motion.button
              onClick={onBrowseLibrary}
              className="w-full bg-purple-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-purple-600 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Browse Library
            </motion.button>
          </motion.div>

          <motion.div
            className="card hover-lift p-6 bg-[var(--theme-card-bg)] border border-[var(--theme-border)]"
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-lg font-semibold mb-3 text-[var(--theme-text)]">Recent Activity</h2>
            <p className="text-sm mb-4 text-[var(--theme-text-secondary)]">
              {lastActivityText}
            </p>
            <motion.button
              onClick={onViewProgress}
              className="w-full bg-teal-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-teal-600 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              View Progress
            </motion.button>
          </motion.div>

          <motion.div
            className="card hover-lift p-6 bg-[var(--theme-card-bg)] border border-[var(--theme-border)]"
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-lg font-semibold mb-3 text-[var(--theme-text)]">Study Streak</h2>
            <p className="text-sm mb-4 text-[var(--theme-text-secondary)]">
              {streakText}
            </p>
            <motion.button
              onClick={onStartSession}
              className="w-full bg-yellow-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-yellow-600 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Start Session
            </motion.button>
          </motion.div>
        </motion.section>

        <motion.section
          className="card p-6 bg-[var(--theme-card-bg)] border border-[var(--theme-border)]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          whileHover={{ y: -2 }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[var(--theme-text)]">Learning Path</h2>
              <p className="text-sm text-[var(--theme-text-secondary)]">
                Continue your personalized learning journey with curated content and challenges.
              </p>
            </div>
            <motion.span
              className="inline-flex items-center rounded-full bg-gradient-to-r from-purple-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Explore Now
            </motion.span>
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
});

DashboardOverview.displayName = "DashboardOverview";

const Quiz = lazy(() => import("./Quiz"));

function ProfileBannerFallback() {
  return (
    <div className="px-6 pt-6">
      <div className="max-w-3xl mx-auto rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-4 text-sm text-[var(--theme-text-secondary)]">
        We couldn’t load your profile reminder right now. You can still use the dashboard; refresh to retry.
      </div>
    </div>
  );
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "library" | "profile" | "quiz">("overview");
  const [bookToNavigate, setBookToNavigate] = useState<{ path: string; name: string } | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<{ quizId: Id<"quizzes"> } | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const userProfile = useQuery(api.userProfiles.getMyProfile, isAuthenticated ? {} : "skip");
  const userProgress = useQuery(api.progress.getUserProgress, isAuthenticated ? {} : "skip");

  const handleBookOpen = (book: { path: string; name: string }) => {
    toast(`Opening: ${book.name}`);
    setBookToNavigate(book);
    setActiveTab("library");
  };

  const handleStartQuiz = (quizId: Id<"quizzes">) => {
    setCurrentQuiz({ quizId });
    setActiveTab("quiz");
  };

  const userContext = useMemo(() => ({
    grade: userProfile?.grade,
    currentPage: activeTab === "library" ? "library" : activeTab === "profile" ? "profile" : "dashboard",
  }), [userProfile?.grade, activeTab]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--theme-bg)] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
          <p className="mt-4 text-[var(--theme-text-secondary)]">Signing you in…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--theme-bg)] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-6 text-center">
          <h1 className="text-xl font-semibold text-[var(--theme-text)]">Please sign in</h1>
          <p className="mt-2 text-sm text-[var(--theme-text-secondary)]">
            Your session isn’t active, so the dashboard can’t load yet.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                try {
                  window.history.pushState({}, "", "/");
                } catch {
                  // noop
                }
                window.location.hash = "#login";
              }}
              className="rounded-lg bg-gradient-to-r from-purple-600 to-teal-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Go to Login
            </button>
            <button
              onClick={onLogout}
              className="rounded-lg border border-[var(--theme-border)] px-4 py-2 text-sm font-semibold text-[var(--theme-text-secondary)]"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--theme-bg)]">
      {/* Profile Completion Banner */}
      <ErrorBoundary fallback={<ProfileBannerFallback />}>
        <ProfileCompletionBanner />
      </ErrorBoundary>
      
      {/* Navigation Tabs */}
      <div className="bg-[var(--theme-nav-bg)] border-b border-[var(--theme-border)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between py-4">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab("overview")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  activeTab === "overview"
                    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-semibold"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800 text-[var(--theme-text-secondary)]"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab("library")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  activeTab === "library"
                    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-semibold"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800 text-[var(--theme-text-secondary)]"
                }`}
              >
                <BookOpen className="h-4 w-4" />
                Library
              </button>
              <button
                onClick={() => setActiveTab("profile")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  activeTab === "profile"
                    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-semibold"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800 text-[var(--theme-text-secondary)]"
                }`}
              >
                <UserCircle className="h-4 w-4" />
                Profile
              </button>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button
                onClick={onLogout}
                className="inline-flex items-center justify-center rounded-lg border-2 border-[var(--theme-border)] px-4 py-2 text-sm font-semibold text-[var(--theme-text-secondary)] transition hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === "quiz" && currentQuiz ? (
        <ErrorBoundary fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-red-600 font-semibold">Failed to load quiz</p>
              <button onClick={() => setActiveTab("library")} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg">Back to Library</button>
            </div>
          </div>
        }>
          <Suspense fallback={<SectionLoader label="quiz" />}>
            <Quiz
              quizId={currentQuiz.quizId}
              onComplete={() => {
                setCurrentQuiz(null);
                setActiveTab("library");
              }}
              onClose={() => {
                setCurrentQuiz(null);
                setActiveTab("library");
              }}
            />
          </Suspense>
        </ErrorBoundary>
      ) : activeTab === "library" ? (
        <ErrorBoundary fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-red-600 font-semibold">Failed to load library</p>
              <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg">Reload</button>
            </div>
          </div>
        }>
          <Suspense fallback={<SectionLoader label="library" />}>
            <Library bookToOpen={bookToNavigate} onStartQuiz={handleStartQuiz} />
          </Suspense>
        </ErrorBoundary>
      ) : activeTab === "profile" ? (
        <ErrorBoundary fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-red-600 font-semibold">Failed to load profile</p>
              <button onClick={() => setActiveTab("overview")} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg">Back to Dashboard</button>
            </div>
          </div>
        }>
          <Suspense fallback={<SectionLoader label="profile" />}>
            <ProfileEdit onCancel={() => setActiveTab("overview")} />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <DashboardOverview
          userName={userProfile?.name}
          userRole={userProfile?.role}
          grade={userProfile?.grade}
          userProgress={userProgress}
          onBrowseLibrary={() => setActiveTab("library")}
          onViewProgress={() => setActiveTab("profile")}
          onStartSession={() => setActiveTab("library")}
        />
      )}

      {/* AI Assistant */}
      <ErrorBoundary>
        <AIAssistant userContext={userContext} onBookOpen={handleBookOpen} />
      </ErrorBoundary>
    </div>
  );
}
