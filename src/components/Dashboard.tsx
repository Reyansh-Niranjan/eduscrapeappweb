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
  LogOut,
  Edit,
  X,
  User,
  Mail,
  GraduationCap,
  FileText,
  BookPlus,
  CalendarClock,
} from "lucide-react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { motion } from "framer-motion";
import { toast } from "sonner";

const Library = lazy(() => import("./Library"));
const ProfileEdit = lazy(() => import("./ProfileEdit"));
const Notes = lazy(() => import("./Notes"));
const YourBooks = lazy(() => import("./YourBooks"));
const DailyTimeTable = lazy(() => import("./DailyTimeTable"));

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

        </div>
      </motion.div>
    );
  });

DashboardOverview.displayName = "DashboardOverview";

const Quiz = lazy(() => import("./Quiz"));

export default function Dashboard({ onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "library" | "profile" | "quiz" | "notes" | "books" | "timetable">("overview");
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
    currentPage: activeTab === "library"
      ? "library"
      : activeTab === "profile"
        ? "profile"
        : activeTab === "books"
          ? "your-books"
          : activeTab === "timetable"
            ? "daily-timetable"
            : "dashboard",
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
    <div className="min-h-screen bg-[var(--theme-bg)] flex">
      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[var(--theme-card-bg)] border-r border-[var(--theme-border)] flex flex-col z-40">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <img src="/logo-icon.svg" alt="EduScrapeApp" className="w-10 h-10 rounded-xl shadow-lg" />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-teal-500">
              EduScrapeApp
            </span>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === "overview"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                : "text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-secondary)] hover:text-[var(--theme-text)]"
                }`}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span className="font-medium">Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab("library")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === "library"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                : "text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-secondary)] hover:text-[var(--theme-text)]"
                }`}
            >
              <BookOpen className="h-5 w-5" />
              <span className="font-medium">Library</span>
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === "notes"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                : "text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-secondary)] hover:text-[var(--theme-text)]"
                }`}
            >
              <FileText className="h-5 w-5" />
              <span className="font-medium">Notes</span>
            </button>
            <button
              onClick={() => setActiveTab("books")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === "books"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                : "text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-secondary)] hover:text-[var(--theme-text)]"
                }`}
            >
              <BookPlus className="h-5 w-5" />
              <span className="font-medium">Your Books</span>
            </button>
            <button
              onClick={() => setActiveTab("timetable")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === "timetable"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                : "text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-secondary)] hover:text-[var(--theme-text)]"
                }`}
            >
              <CalendarClock className="h-5 w-5" />
              <span className="font-medium">Your Daily TimeTable</span>
            </button>
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-[var(--theme-border)]">
          <div className="flex items-center justify-between mb-4 px-2">
            <ThemeToggle />
            <button
              onClick={onLogout}
              className="p-2 text-[var(--theme-text-secondary)] hover:text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>

          <button
            onClick={() => setActiveTab("profile")}
            className="w-full flex items-center gap-3 p-2 rounded-xl border border-transparent hover:border-[var(--theme-border)] hover:bg-[var(--theme-bg-secondary)] transition-all group"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-teal-400 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                {userProfile?.name?.charAt(0) || <User className="w-6 h-6" />}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-[var(--theme-card-bg)] rounded-full"></div>
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-sm font-semibold text-[var(--theme-text)] truncate">
                {userProfile?.name || "Loading..."}
              </p>
              <p className="text-xs text-[var(--theme-text-secondary)] truncate">
                {userProfile?.role || "Student"}
              </p>
            </div>
          </button>
        </div>
      </aside>

      <div className="flex-1 pl-64 min-h-screen flex flex-col">
        {/* Content Area */}
        <div className="flex-1">
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
          ) : activeTab === "notes" ? (
            <ErrorBoundary fallback={
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <p className="text-red-600 font-semibold">Failed to load notes</p>
                  <button onClick={() => setActiveTab("overview")} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg">Back to Home</button>
                </div>
              </div>
            }>
              <Suspense fallback={<SectionLoader label="notes" />}>
                <Notes />
              </Suspense>
            </ErrorBoundary>
          ) : activeTab === "books" ? (
            <ErrorBoundary fallback={
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <p className="text-red-600 font-semibold">Failed to load Your Books</p>
                  <button onClick={() => setActiveTab("overview")} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg">Back to Home</button>
                </div>
              </div>
            }>
              <Suspense fallback={<SectionLoader label="your books" />}>
                <YourBooks />
              </Suspense>
            </ErrorBoundary>
          ) : activeTab === "timetable" ? (
            <ErrorBoundary fallback={
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <p className="text-red-600 font-semibold">Failed to load timetable</p>
                  <button onClick={() => setActiveTab("overview")} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg">Back to Home</button>
                </div>
              </div>
            }>
              <Suspense fallback={<SectionLoader label="timetable" />}>
                <DailyTimeTable />
              </Suspense>
            </ErrorBoundary>
          ) : activeTab === "profile" ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-lg bg-[var(--theme-card-bg)] border border-[var(--theme-border)] rounded-3xl shadow-2xl overflow-hidden"
              >
                <ErrorBoundary fallback={
                  <div className="p-8 text-center">
                    <p className="text-red-600 font-semibold">Failed to load profile</p>
                    <button onClick={() => setActiveTab("overview")} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg">Close</button>
                  </div>
                }>
                  <Suspense fallback={<SectionLoader label="profile" />}>
                    <div className="relative">
                      <ProfileEdit onCancel={() => setActiveTab("overview")} />
                    </div>
                  </Suspense>
                </ErrorBoundary>
              </motion.div>
            </div>
          ) : (
            <>
              <ProfileCompletionBanner />
              <DashboardOverview
                userName={userProfile?.name}
                userRole={userProfile?.role}
                grade={userProfile?.grade}
                userProgress={userProgress}
              />
            </>
          )}
        </div>

        {/* AI Assistant */}
        <ErrorBoundary>
          <AIAssistant userContext={userContext} onBookOpen={handleBookOpen} />
        </ErrorBoundary>
      </div>
    </div>
  );
}
