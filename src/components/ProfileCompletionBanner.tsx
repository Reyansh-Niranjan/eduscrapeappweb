import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";



const GRADE_OPTIONS = Array.from({ length: 12 }, (_, i) => `Class${i + 1}`);

type ProfileState = {
  name: string;
  role: string;
  grade: string;
};

export default function ProfileCompletionBanner() {
  const user = useQuery(api.auth.loggedInUser);
  const profile = useQuery(api.userProfiles.getMyProfile);
  const upsertProfile = useMutation(api.userProfiles.upsertProfile);

  const [form, setForm] = useState<ProfileState>({ name: "", role: "student", grade: "" });
  const [saving, setSaving] = useState(false);

  // Only show banner if profile is incomplete (missing name or role)
  // Once profile is set, this banner never shows again - users must use Profile Edit page
  const needsProfile = useMemo(() => {
    if (!user) return false;
    if (!profile) return true;
    return profile.name.trim().length === 0 || profile.role.trim().length === 0;
  }, [user, profile]);

  const [_expanded, _setExpanded] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({ name: profile.name, role: profile.role || "student", grade: profile.grade || "" });
      setExpanded(false);
    }
  }, [profile]);

  useEffect(() => {
    if (needsProfile) {
      setExpanded(true);
    }
  }, [needsProfile]);

  if (!user) {
    return null;
  }

  // Don't show banner at all if profile is complete - user must use Profile Edit page
  if (!needsProfile) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!user) {
      toast.error("Please wait for authentication to complete.");
      return;
    }
    
    if (form.name.trim().length < 2) {
      toast.error("Please enter your full name.");
      return;
    }

    if (form.grade.trim().length === 0) {
      toast.error("Please select your grade.");
      return;
    }

    setSaving(true);
    try {
      await upsertProfile({
        name: form.name.trim(),
        role: "student",
        grade: form.grade
      });
      toast.success("Profile updated");
      setExpanded(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('authenticated')) {
        toast.error("Session expired. Please refresh and try again.");
      } else {
        toast.error(`Could not update profile: ${errorMessage}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto mb-12 w-full max-w-3xl">
      <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/60 to-teal-900/60 p-6 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Complete your EduScrapeApp profile
            </h3>
            <p className="text-sm text-gray-300">
              Set up your profile once - you can update it later from the dashboard.
              Your grade selection helps us provide the right content for you.
            </p>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-1">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-300">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              className="w-full rounded-lg border border-purple-500/40 bg-purple-950/60 px-4 py-2 text-sm text-white outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/40"
              placeholder="Your full name"
              required
            />
          </div>

          <div className="md:col-span-1">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-300">
              Grade
            </label>
            <select
              value={form.grade}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, grade: event.target.value }))
              }
              className="w-full rounded-lg border border-purple-500/40 bg-purple-950/60 px-4 py-2 text-sm text-white outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/40"
              required
            >
              <option value="" disabled>
                Select your grade
              </option>
              {GRADE_OPTIONS.map((grade) => (
                <option key={grade} value={grade}>
                  {grade.replace('Class', 'Class ')}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex items-center justify-between">
            <div className="text-xs text-gray-400">
              These details appear in the EduScrapeApp admin console and shared dashboards.
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-teal-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-teal-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save profile"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
