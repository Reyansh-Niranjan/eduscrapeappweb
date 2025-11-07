import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

const ROLE_OPTIONS = [
  "Admin",
  "Developer",
  "Designer",
  "Product Manager",
  "Marketing",
  "Contributor",
  "Student",
];

type ProfileState = {
  name: string;
  role: string;
};

export default function ProfileCompletionBanner() {
  const user = useQuery(api.auth.loggedInUser);
  const profile = useQuery(api.userProfiles.getMyProfile);
  const upsertProfile = useMutation(api.userProfiles.upsertProfile);

  const [form, setForm] = useState<ProfileState>({ name: "", role: "" });
  const [saving, setSaving] = useState(false);
  const needsProfile = useMemo(() => {
    if (!user) return false;
    if (!profile) return true;
    return profile.name.trim().length === 0 || profile.role.trim().length === 0;
  }, [user, profile]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({ name: profile.name, role: profile.role });
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.name.trim().length < 2) {
      toast.error("Please enter your full name.");
      return;
    }
    if (form.role.trim().length === 0) {
      toast.error("Please select a role.");
      return;
    }

    setSaving(true);
    try {
      await upsertProfile({ name: form.name.trim(), role: form.role.trim() });
      toast.success("Profile updated");
      setExpanded(false);
    } catch (error) {
      console.error("Failed to update profile", error);
      toast.error("We could not update your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto mb-12 w-full max-w-3xl">
      <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/60 to-teal-900/60 p-6 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {needsProfile ? "Complete your profile" : "Team profile"}
            </h3>
            <p className="text-sm text-gray-300">
              {needsProfile
                ? "Add your name and role so teammates know who is contributing."
                : "Keep your public profile up to date for the team directory."}
            </p>
          </div>
          {!needsProfile && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="rounded-lg border border-teal-400/60 px-4 py-2 text-sm font-semibold text-teal-200 transition hover:border-teal-300 hover:text-white"
            >
              {expanded ? "Cancel" : "Edit profile"}
            </button>
          )}
        </div>

        {expanded && (
          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
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
                Role
              </label>
              <select
                value={form.role}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, role: event.target.value }))
                }
                className="w-full rounded-lg border border-purple-500/40 bg-purple-950/60 px-4 py-2 text-sm text-white outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/40"
                required
              >
                <option value="" disabled>
                  Select your role
                </option>
                {ROLE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                {!ROLE_OPTIONS.includes(form.role) && form.role.trim().length > 0 && (
                  <option value={form.role}>{form.role}</option>
                )}
              </select>
            </div>

            <div className="md:col-span-2 flex items-center justify-between">
              <div className="text-xs text-gray-400">
                These details appear in the admin dashboard and public sections.
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
        )}
      </div>
    </section>
  );
}
