import { CalendarClock } from "lucide-react";

export default function DailyTimeTable() {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="card border border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20">
              <CalendarClock className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--theme-text)]">Your Daily TimeTable</h1>
              <p className="text-sm text-[var(--theme-text-secondary)]">
                Build daily study routines and AI-optimized schedules.
              </p>
            </div>
          </div>
        </div>

        <div className="card border border-dashed border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-10 text-center">
          <p className="text-lg font-semibold text-[var(--theme-text)]">COMING SOON!</p>
          <p className="mt-2 text-sm text-[var(--theme-text-secondary)]">
            We’re crafting a smart timetable planner with reminders and auto-balancing.
          </p>
        </div>
      </div>
    </div>
  );
}
