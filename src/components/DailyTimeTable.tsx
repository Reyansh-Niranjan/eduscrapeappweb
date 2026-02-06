import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock,
  Copy,
  Flame,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";

type Priority = "Low" | "Medium" | "High";
type SessionType = "Study" | "Revision" | "Project" | "Exam" | "Break" | "Exercise" | "Reading" | "Other";

type ScheduleItem = {
  id: string;
  day: string;
  title: string;
  subject: string;
  start: string;
  end: string;
  location: string;
  notes: string;
  type: SessionType;
  priority: Priority;
  completed: boolean;
};

type GeneratorSettings = {
  targetHours: number;
  sessionMinutes: number;
  breakMinutes: number;
  startTime: string;
  endTime: string;
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const STORAGE_KEY = "eduscrape_daily_timetable_v1";

const DEFAULT_ITEMS: ScheduleItem[] = [
  {
    id: "seed-1",
    day: "Monday",
    title: "Math Focus Sprint",
    subject: "Algebra",
    start: "07:30",
    end: "08:30",
    location: "Home Desk",
    notes: "Practice quadratic equations and review mistakes.",
    type: "Study",
    priority: "High",
    completed: false,
  },
  {
    id: "seed-2",
    day: "Monday",
    title: "Chemistry Revision",
    subject: "Organic",
    start: "10:00",
    end: "10:45",
    location: "Library",
    notes: "Flashcards + reactions map.",
    type: "Revision",
    priority: "Medium",
    completed: false,
  },
  {
    id: "seed-3",
    day: "Monday",
    title: "Recharge Break",
    subject: "",
    start: "10:45",
    end: "11:05",
    location: "Garden",
    notes: "Stretch + water.",
    type: "Break",
    priority: "Low",
    completed: false,
  },
];

const DEFAULT_GENERATOR: GeneratorSettings = {
  targetHours: 3,
  sessionMinutes: 50,
  breakMinutes: 10,
  startTime: "08:00",
  endTime: "18:00",
};

const TEMPLATE_LIBRARY: Record<string, Omit<ScheduleItem, "id" | "day">[]> = {
  "Exam Prep": [
    {
      title: "Past Paper Set 1",
      subject: "Primary Subject",
      start: "08:00",
      end: "09:15",
      location: "Home Desk",
      notes: "Timed conditions.",
      type: "Exam",
      priority: "High",
      completed: false,
    },
    {
      title: "Error Log Review",
      subject: "Primary Subject",
      start: "09:30",
      end: "10:10",
      location: "Home Desk",
      notes: "Fix top 10 mistakes.",
      type: "Revision",
      priority: "High",
      completed: false,
    },
  ],
  "Balanced Day": [
    {
      title: "Deep Work Block",
      subject: "Core Subject",
      start: "07:30",
      end: "08:30",
      location: "Library",
      notes: "No distractions.",
      type: "Study",
      priority: "High",
      completed: false,
    },
    {
      title: "Concept Review",
      subject: "Secondary",
      start: "09:30",
      end: "10:10",
      location: "Home Desk",
      notes: "Summaries + recap.",
      type: "Reading",
      priority: "Medium",
      completed: false,
    },
    {
      title: "Workout/Walk",
      subject: "",
      start: "17:00",
      end: "17:30",
      location: "Outdoors",
      notes: "Move + refresh.",
      type: "Exercise",
      priority: "Low",
      completed: false,
    },
  ],
  "Light Day": [
    {
      title: "Quick Recap",
      subject: "Any",
      start: "09:00",
      end: "09:30",
      location: "Home Desk",
      notes: "Top 3 topics only.",
      type: "Revision",
      priority: "Low",
      completed: false,
    },
  ],
};

const generateId = () => `session-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes: number) => {
  const clamped = Math.max(0, minutes);
  const h = Math.floor(clamped / 60) % 24;
  const m = clamped % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

const getDurationMinutes = (start: string, end: string) => Math.max(0, timeToMinutes(end) - timeToMinutes(start));

const overlaps = (a: ScheduleItem, b: ScheduleItem) =>
  timeToMinutes(a.start) < timeToMinutes(b.end) && timeToMinutes(b.start) < timeToMinutes(a.end);

export default function DailyTimeTable() {
  const [items, setItems] = useState<ScheduleItem[]>(DEFAULT_ITEMS);
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Omit<ScheduleItem, "id" | "completed" | "day">>({
    title: "",
    subject: "",
    start: "08:00",
    end: "09:00",
    location: "",
    notes: "",
    type: "Study",
    priority: "Medium",
  });
  const [goalHours, setGoalHours] = useState(4);
  const [generator, setGenerator] = useState<GeneratorSettings>(DEFAULT_GENERATOR);
  const [templateName, setTemplateName] = useState("Balanced Day");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as {
        items: ScheduleItem[];
        selectedDay: string;
        goalHours: number;
        generator: GeneratorSettings;
      };
      if (parsed?.items?.length) setItems(parsed.items);
      if (parsed?.selectedDay) setSelectedDay(parsed.selectedDay);
      if (parsed?.goalHours) setGoalHours(parsed.goalHours);
      if (parsed?.generator) setGenerator(parsed.generator);
    } catch (err) {
      console.error("Failed to load timetable", err);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        items,
        selectedDay,
        goalHours,
        generator,
      })
    );
  }, [items, selectedDay, goalHours, generator]);

  const dayItems = useMemo(
    () => items.filter((item) => item.day === selectedDay).sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)),
    [items, selectedDay]
  );

  const completedMinutes = useMemo(
    () => dayItems.filter((item) => item.completed).reduce((sum, item) => sum + getDurationMinutes(item.start, item.end), 0),
    [dayItems]
  );

  const totalMinutes = useMemo(
    () => dayItems.reduce((sum, item) => sum + getDurationMinutes(item.start, item.end), 0),
    [dayItems]
  );

  const conflictCount = useMemo(() => {
    let conflicts = 0;
    for (let i = 0; i < dayItems.length; i += 1) {
      for (let j = i + 1; j < dayItems.length; j += 1) {
        if (overlaps(dayItems[i], dayItems[j])) conflicts += 1;
      }
    }
    return conflicts;
  }, [dayItems]);

  const focusScore = useMemo(() => {
    const goalMinutes = goalHours * 60;
    if (goalMinutes === 0) return 0;
    return Math.min(100, Math.round((completedMinutes / goalMinutes) * 100));
  }, [completedMinutes, goalHours]);

  const handleAdd = () => {
    setError(null);
    if (!formState.title.trim()) {
      setError("Add a title for the session.");
      return;
    }
    if (timeToMinutes(formState.end) <= timeToMinutes(formState.start)) {
      setError("End time must be after start time.");
      return;
    }
    const candidate: ScheduleItem = {
      id: generateId(),
      day: selectedDay,
      completed: false,
      ...formState,
    };
    const hasConflict = dayItems.some((item) => overlaps(item, candidate));
    if (hasConflict) {
      setError("This session overlaps another. Adjust the time or keep it anyway.");
    }
    setItems((prev) => [...prev, candidate]);
    setFormState((prev) => ({
      ...prev,
      title: "",
      subject: "",
      location: "",
      notes: "",
    }));
  };

  const handleDelete = (id: string) => setItems((prev) => prev.filter((item) => item.id !== id));

  const handleToggle = (id: string) =>
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)));

  const handleDuplicate = (item: ScheduleItem) =>
    setItems((prev) => [...prev, { ...item, id: generateId(), completed: false }]);

  const handleUpdate = (id: string, patch: Partial<ScheduleItem>) =>
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const handleApplyTemplate = () => {
    const templateItems = TEMPLATE_LIBRARY[templateName] || [];
    const stamped = templateItems.map((entry) => ({
      ...entry,
      id: generateId(),
      day: selectedDay,
    }));
    setItems((prev) => [...prev, ...stamped]);
  };

  const handleGenerateBlocks = () => {
    const startMinutes = timeToMinutes(generator.startTime);
    const endMinutes = timeToMinutes(generator.endTime);
    const targetMinutes = generator.targetHours * 60;
    const session = Math.max(10, generator.sessionMinutes);
    const breakGap = Math.max(5, generator.breakMinutes);
    if (startMinutes >= endMinutes || targetMinutes === 0) return;

    const planned: ScheduleItem[] = [];
    let cursor = startMinutes;
    let allocated = 0;

    while (cursor + session <= endMinutes && allocated < targetMinutes) {
      const sessionStart = cursor;
      const sessionEnd = Math.min(cursor + session, endMinutes);
      planned.push({
        id: generateId(),
        day: selectedDay,
        title: "Focus Block",
        subject: "Goal Work",
        start: minutesToTime(sessionStart),
        end: minutesToTime(sessionEnd),
        location: "",
        notes: "Generated focus block.",
        type: "Study",
        priority: "High",
        completed: false,
      });
      allocated += sessionEnd - sessionStart;
      cursor = sessionEnd + breakGap;
    }

    setItems((prev) => [...prev, ...planned]);
  };

  const selectedItem = selectedId ? items.find((item) => item.id === selectedId) || null : null;

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-[var(--theme-bg)]">
      <header className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/20">
              <CalendarClock className="h-6 w-6 text-teal-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[var(--theme-text)]">Your Daily Timetable</h1>
              <p className="text-[var(--theme-text-secondary)]">
                Plan, balance, and track your study sessions with smart insights.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] px-4 py-2 text-sm text-[var(--theme-text-secondary)]">
              Goal: <span className="font-semibold text-[var(--theme-text)]">{goalHours}h</span>
            </div>
            <button
              onClick={() => setItems(DEFAULT_ITEMS)}
              className="flex items-center gap-2 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] px-4 py-2 text-sm font-semibold text-[var(--theme-text)] transition hover:border-teal-400/40"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1.8fr_1fr]">
        <section className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  selectedDay === day
                    ? "bg-teal-500 text-white shadow-lg shadow-teal-500/30"
                    : "bg-[var(--theme-card-bg)] text-[var(--theme-text)] border border-[var(--theme-border)] hover:border-teal-400/40"
                }`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[var(--theme-text)]">{selectedDay} Plan</h2>
                <p className="text-sm text-[var(--theme-text-secondary)]">
                  {dayItems.length} sessions · {Math.round(totalMinutes / 60)}h {totalMinutes % 60}m scheduled
                </p>
              </div>
              {conflictCount > 0 && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  {conflictCount} overlap{conflictCount > 1 ? "s" : ""}
                </div>
              )}
            </div>

            <div className="mt-6 space-y-3">
              {dayItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--theme-border)] p-8 text-center">
                  <p className="text-sm text-[var(--theme-text-secondary)]">No sessions planned yet. Add one below.</p>
                </div>
              ) : (
                dayItems.map((item) => (
                  <div
                    key={item.id}
                    className={`group rounded-2xl border p-4 transition ${
                      item.completed
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : "border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] hover:border-teal-400/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggle(item.id)}
                          className="mt-1 text-emerald-400 hover:text-emerald-300"
                        >
                          {item.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                        </button>
                        <div>
                          <p className="text-sm font-semibold text-[var(--theme-text-secondary)]">
                            {item.start} - {item.end} · {getDurationMinutes(item.start, item.end)}m
                          </p>
                          <h3 className="text-lg font-bold text-[var(--theme-text)]">{item.title}</h3>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="rounded-full bg-teal-500/10 px-2 py-1 text-teal-300">{item.type}</span>
                            {item.subject && (
                              <span className="rounded-full bg-indigo-500/10 px-2 py-1 text-indigo-300">{item.subject}</span>
                            )}
                            <span className="rounded-full bg-slate-500/10 px-2 py-1 text-slate-300">{item.priority}</span>
                          </div>
                          {item.notes && (
                            <p className="mt-2 text-sm text-[var(--theme-text-secondary)] line-clamp-2">{item.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
                        <button
                          onClick={() => setSelectedId(item.id)}
                          className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-2 text-[var(--theme-text)] hover:border-teal-400/40"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(item)}
                          className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-2 text-[var(--theme-text)] hover:border-teal-400/40"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2 text-rose-300 hover:border-rose-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-[var(--theme-text)]">Add Session</h3>
                <p className="text-sm text-[var(--theme-text-secondary)]">Capture what you plan to focus on today.</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--theme-text-secondary)]">
                <Sparkles className="h-4 w-4 text-teal-300" />
                Smart planning
              </div>
            </div>

            {error && <p className="mt-4 text-sm font-semibold text-amber-400">{error}</p>}

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-[var(--theme-text-secondary)]">Session title</label>
                <input
                  value={formState.title}
                  onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="e.g., Calculus problem set"
                  className="mt-2 w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-3 text-sm text-[var(--theme-text)] focus:border-teal-400/60 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--theme-text-secondary)]">Subject</label>
                <input
                  value={formState.subject}
                  onChange={(event) => setFormState((prev) => ({ ...prev, subject: event.target.value }))}
                  placeholder="Physics, History"
                  className="mt-2 w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-3 text-sm text-[var(--theme-text)] focus:border-teal-400/60 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--theme-text-secondary)]">Location</label>
                <input
                  value={formState.location}
                  onChange={(event) => setFormState((prev) => ({ ...prev, location: event.target.value }))}
                  placeholder="Library, Home desk"
                  className="mt-2 w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-3 text-sm text-[var(--theme-text)] focus:border-teal-400/60 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--theme-text-secondary)]">Start</label>
                <input
                  type="time"
                  value={formState.start}
                  onChange={(event) => setFormState((prev) => ({ ...prev, start: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-3 text-sm text-[var(--theme-text)] focus:border-teal-400/60 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--theme-text-secondary)]">End</label>
                <input
                  type="time"
                  value={formState.end}
                  onChange={(event) => setFormState((prev) => ({ ...prev, end: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-3 text-sm text-[var(--theme-text)] focus:border-teal-400/60 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--theme-text-secondary)]">Type</label>
                <select
                  value={formState.type}
                  onChange={(event) => setFormState((prev) => ({ ...prev, type: event.target.value as SessionType }))}
                  className="mt-2 w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-3 text-sm text-[var(--theme-text)]"
                >
                  {["Study", "Revision", "Project", "Exam", "Break", "Exercise", "Reading", "Other"].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--theme-text-secondary)]">Priority</label>
                <select
                  value={formState.priority}
                  onChange={(event) => setFormState((prev) => ({ ...prev, priority: event.target.value as Priority }))}
                  className="mt-2 w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-3 text-sm text-[var(--theme-text)]"
                >
                  {["Low", "Medium", "High"].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-[var(--theme-text-secondary)]">Notes</label>
                <textarea
                  value={formState.notes}
                  onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Focus topic, resources, reminders..."
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-3 text-sm text-[var(--theme-text)] focus:border-teal-400/60 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 rounded-2xl bg-teal-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/30 transition hover:bg-teal-400"
              >
                <Plus className="h-4 w-4" />
                Add session
              </button>
              <button
                onClick={() =>
                  setFormState({
                    title: "",
                    subject: "",
                    start: "08:00",
                    end: "09:00",
                    location: "",
                    notes: "",
                    type: "Study",
                    priority: "Medium",
                  })
                }
                className="rounded-2xl border border-[var(--theme-border)] px-4 py-3 text-sm font-semibold text-[var(--theme-text)]"
              >
                Clear
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[var(--theme-text)]">Daily Insights</h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-3">
                <div>
                  <p className="text-xs text-[var(--theme-text-secondary)]">Completed</p>
                  <p className="text-lg font-bold text-[var(--theme-text)]">
                    {Math.round(completedMinutes / 60)}h {completedMinutes % 60}m
                  </p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-3">
                <div>
                  <p className="text-xs text-[var(--theme-text-secondary)]">Focus score</p>
                  <p className="text-lg font-bold text-[var(--theme-text)]">{focusScore}%</p>
                </div>
                <Flame className="h-5 w-5 text-orange-400" />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-3">
                <div>
                  <p className="text-xs text-[var(--theme-text-secondary)]">Scheduled</p>
                  <p className="text-lg font-bold text-[var(--theme-text)]">
                    {Math.round(totalMinutes / 60)}h {totalMinutes % 60}m
                  </p>
                </div>
                <Clock className="h-5 w-5 text-sky-400" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-[var(--theme-text)]">Targets & Settings</h3>
              <Target className="h-5 w-5 text-teal-300" />
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--theme-text-secondary)]">Daily goal (hours)</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={goalHours}
                  onChange={(event) => setGoalHours(Number(event.target.value) || 0)}
                  className="mt-2 w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-2 text-sm text-[var(--theme-text)]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--theme-text-secondary)]">Template library</label>
                <div className="mt-2 flex gap-2">
                  <select
                    value={templateName}
                    onChange={(event) => setTemplateName(event.target.value)}
                    className="w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-2 text-sm text-[var(--theme-text)]"
                  >
                    {Object.keys(TEMPLATE_LIBRARY).map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleApplyTemplate}
                    className="rounded-2xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-[var(--theme-text)]">Auto Plan Focus Blocks</h3>
              <Sparkles className="h-5 w-5 text-teal-300" />
            </div>
            <p className="mt-2 text-sm text-[var(--theme-text-secondary)]">Generate sessions based on your goal hours.</p>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--theme-text-secondary)]">Target hours</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={generator.targetHours}
                    onChange={(event) =>
                      setGenerator((prev) => ({ ...prev, targetHours: Number(event.target.value) || 0 }))
                    }
                    className="mt-2 w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-2 text-sm text-[var(--theme-text)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--theme-text-secondary)]">Session length</label>
                  <input
                    type="number"
                    min={25}
                    max={120}
                    value={generator.sessionMinutes}
                    onChange={(event) =>
                      setGenerator((prev) => ({ ...prev, sessionMinutes: Number(event.target.value) || 0 }))
                    }
                    className="mt-2 w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-2 text-sm text-[var(--theme-text)]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--theme-text-secondary)]">Break length</label>
                  <input
                    type="number"
                    min={5}
                    max={30}
                    value={generator.breakMinutes}
                    onChange={(event) =>
                      setGenerator((prev) => ({ ...prev, breakMinutes: Number(event.target.value) || 0 }))
                    }
                    className="mt-2 w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-2 text-sm text-[var(--theme-text)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--theme-text-secondary)]">Start time</label>
                  <input
                    type="time"
                    value={generator.startTime}
                    onChange={(event) => setGenerator((prev) => ({ ...prev, startTime: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-2 text-sm text-[var(--theme-text)]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--theme-text-secondary)]">End time</label>
                <input
                  type="time"
                  value={generator.endTime}
                  onChange={(event) => setGenerator((prev) => ({ ...prev, endTime: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-2 text-sm text-[var(--theme-text)]"
                />
              </div>
              <button
                onClick={handleGenerateBlocks}
                className="w-full rounded-2xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/30 transition hover:bg-teal-400"
              >
                Generate focus blocks
              </button>
            </div>
          </div>

          {selectedItem && (
            <div className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[var(--theme-text)]">Edit Session</h3>
                <button
                  onClick={() => setSelectedId(null)}
                  className="text-sm font-semibold text-[var(--theme-text-secondary)]"
                >
                  Close
                </button>
              </div>
              <div className="mt-4 space-y-3">
                <input
                  value={selectedItem.title}
                  onChange={(event) => handleUpdate(selectedItem.id, { title: event.target.value })}
                  className="w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-2 text-sm text-[var(--theme-text)]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={selectedItem.start}
                    onChange={(event) => handleUpdate(selectedItem.id, { start: event.target.value })}
                    className="w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-2 text-sm text-[var(--theme-text)]"
                  />
                  <input
                    type="time"
                    value={selectedItem.end}
                    onChange={(event) => handleUpdate(selectedItem.id, { end: event.target.value })}
                    className="w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-2 text-sm text-[var(--theme-text)]"
                  />
                </div>
                <textarea
                  value={selectedItem.notes}
                  onChange={(event) => handleUpdate(selectedItem.id, { notes: event.target.value })}
                  rows={3}
                  className="w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-2 text-sm text-[var(--theme-text)]"
                />
                <button
                  onClick={() => setSelectedId(null)}
                  className="w-full rounded-2xl border border-[var(--theme-border)] px-4 py-2 text-sm font-semibold text-[var(--theme-text)]"
                >
                  Done editing
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
