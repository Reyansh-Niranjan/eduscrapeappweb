import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import {
  BookOpen,
  Brain,
  CalendarClock,
  Code2,
  Dumbbell,
  FlaskConical,
  GraduationCap,
  Music,
  PencilRuler,
  Plus,
  X,
} from "lucide-react";

type Day = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

type TimetableItem = {
  id: string;
  day: Day;
  title: string;
  start: string;
  end: string;
  icon: string;
};

const DAYS: Day[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const STORAGE_KEY = "eduscrape_simple_timetable_v1";

const ICON_OPTIONS = [
  { key: "BookOpen", label: "Study", icon: BookOpen },
  { key: "GraduationCap", label: "Class", icon: GraduationCap },
  { key: "Brain", label: "Focus", icon: Brain },
  { key: "FlaskConical", label: "Lab", icon: FlaskConical },
  { key: "Code2", label: "Coding", icon: Code2 },
  { key: "PencilRuler", label: "Homework", icon: PencilRuler },
  { key: "Music", label: "Music", icon: Music },
  { key: "Dumbbell", label: "Workout", icon: Dumbbell },
];

const iconLookup = ICON_OPTIONS.reduce<Record<string, (props: { className?: string }) => JSX.Element>>(
  (acc, entry) => {
    acc[entry.key] = entry.icon;
    return acc;
  },
  {}
);

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const isOverlap = (start: string, end: string, otherStart: string, otherEnd: string) =>
  timeToMinutes(start) < timeToMinutes(otherEnd) && timeToMinutes(otherStart) < timeToMinutes(end);

const nextOccurrenceDate = (day: Day, time: string) => {
  const dayIndexMap: Record<Day, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  const now = new Date();
  const target = new Date(now);
  const [hours, minutes] = time.split(":").map(Number);
  target.setHours(hours, minutes, 0, 0);
  const targetDayIndex = dayIndexMap[day];
  let diff = (targetDayIndex - now.getDay() + 7) % 7;
  if (diff === 0 && target <= now) diff = 7;
  target.setDate(now.getDate() + diff);
  return target;
};

export default function DailyTimeTable() {
  const [items, setItems] = useState<TimetableItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    day: DAYS[0],
    title: "",
    start: "08:00",
    end: "09:00",
    icon: "BookOpen",
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as TimetableItem[];
      if (Array.isArray(parsed)) setItems(parsed);
    } catch (err) {
      console.error("Failed to load timetable", err);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    LocalNotifications.requestPermissions().catch(() => null);
  }, []);

  const totalItems = items.length;

  const dayItems = useMemo(() => {
    return DAYS.reduce<Record<Day, TimetableItem[]>>((acc, day) => {
      acc[day] = items
        .filter((item) => item.day === day)
        .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
      return acc;
    }, {} as Record<Day, TimetableItem[]>);
  }, [items]);

  const openModal = (day?: Day) => {
    setForm((prev) => ({ ...prev, day: day ?? prev.day }));
    setError(null);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setError(null);
  };

  const scheduleAlarm = async (item: TimetableItem) => {
    if (!Capacitor.isNativePlatform()) return;
    const permission = await LocalNotifications.requestPermissions();
    if (permission.display !== "granted") return;
    const scheduleAt = nextOccurrenceDate(item.day, item.start);
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 1_000_000_000),
          title: item.title || "Timetable",
          body: `${item.start} - ${item.end}`,
          schedule: { at: scheduleAt },
        },
      ],
    });
  };

  const handleAdd = async () => {
    setError(null);
    if (!form.title.trim()) {
      setError("Add a name for this session.");
      return;
    }
    if (timeToMinutes(form.end) <= timeToMinutes(form.start)) {
      setError("End time must be after start time.");
      return;
    }
    const overlaps = items
      .filter((item) => item.day === form.day)
      .some((item) => isOverlap(form.start, form.end, item.start, item.end));
    if (overlaps) {
      setError("This time range overlaps another session.");
      return;
    }
    const newItem: TimetableItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      day: form.day,
      title: form.title.trim(),
      start: form.start,
      end: form.end,
      icon: form.icon,
    };
    setItems((prev) => [...prev, newItem]);
    await scheduleAlarm(newItem);
    setForm({ day: form.day, title: "", start: "08:00", end: "09:00", icon: "BookOpen" });
    setIsOpen(false);
  };

  const handleDelete = (id: string) => setItems((prev) => prev.filter((item) => item.id !== id));

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-[var(--theme-bg)]">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/20">
            <CalendarClock className="h-6 w-6 text-teal-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-[var(--theme-text)]">Your Daily Timetable</h1>
            <p className="text-[var(--theme-text-secondary)]">Add sessions per day. No overlapping time ranges.</p>
          </div>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 rounded-2xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-500/30 transition hover:bg-teal-400"
        >
          <Plus className="h-4 w-4" />
          Add Session
        </button>
      </header>

      <div className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-[var(--theme-border)] bg-[var(--theme-bg-secondary)]">
          {DAYS.map((day) => (
            <div key={day} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--theme-text-secondary)]">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 divide-x divide-[var(--theme-border)]">
          {totalItems === 0 ? (
            <div className="col-span-7 flex flex-col items-center justify-center py-16 text-center">
              <button
                onClick={() => openModal()}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-500/10 text-teal-400"
              >
                <Plus className="h-6 w-6" />
              </button>
              <p className="mt-4 text-sm text-[var(--theme-text-secondary)]">Tap + to add your first session.</p>
            </div>
          ) : (
            DAYS.map((day) => (
              <div key={day} className="min-h-[240px] p-4">
                <button
                  onClick={() => openModal(day)}
                  className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-3 py-2 text-xs font-semibold text-[var(--theme-text)] hover:border-teal-400/40"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
                <div className="space-y-3">
                  {dayItems[day].length === 0 ? (
                    <p className="text-xs text-[var(--theme-text-secondary)]">No sessions</p>
                  ) : (
                    dayItems[day].map((item) => {
                      const Icon = iconLookup[item.icon] || BookOpen;
                      return (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-3 py-3 text-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10 text-teal-300">
                                <Icon className="h-4 w-4" />
                              </span>
                              <div>
                                <p className="font-semibold text-[var(--theme-text)]">{item.title}</p>
                                <p className="text-xs text-[var(--theme-text-secondary)]">
                                  {item.start} - {item.end}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="rounded-full p-1 text-[var(--theme-text-secondary)] hover:text-rose-400"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[var(--theme-text)]">Add session</h2>
              <button onClick={closeModal} className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-text)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--theme-text-secondary)]">Day</label>
                <select
                  value={form.day}
                  onChange={(event) => setForm((prev) => ({ ...prev, day: event.target.value as Day }))}
                  className="mt-2 w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-2 text-sm text-[var(--theme-text)]"
                >
                  {DAYS.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--theme-text-secondary)]">Name</label>
                <input
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Math Practice"
                  className="mt-2 w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-2 text-sm text-[var(--theme-text)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--theme-text-secondary)]">Start</label>
                  <input
                    type="time"
                    value={form.start}
                    onChange={(event) => setForm((prev) => ({ ...prev, start: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-2 text-sm text-[var(--theme-text)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--theme-text-secondary)]">End</label>
                  <input
                    type="time"
                    value={form.end}
                    onChange={(event) => setForm((prev) => ({ ...prev, end: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-2 text-sm text-[var(--theme-text)]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--theme-text-secondary)]">Icon</label>
                <select
                  value={form.icon}
                  onChange={(event) => setForm((prev) => ({ ...prev, icon: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-2 text-sm text-[var(--theme-text)]"
                >
                  {ICON_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {error && <p className="text-sm font-semibold text-rose-400">{error}</p>}
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={closeModal}
                  className="rounded-2xl border border-[var(--theme-border)] px-4 py-2 text-sm font-semibold text-[var(--theme-text)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  className="rounded-2xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-500/30"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
