import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { User, Mail, GraduationCap, Briefcase, Save, X, Edit2 } from "lucide-react";
import { toast } from "sonner";

interface ProfileEditProps {
  onCancel?: () => void;
}

export default function ProfileEdit({ onCancel }: ProfileEditProps) {
  const profile = useQuery(api.userProfiles.getMyProfile);
  const upsertProfile = useMutation(api.userProfiles.upsertProfile);
  const user = useQuery(api.auth.loggedInUser);

  const [formData, setFormData] = useState({
    name: "",
    role: "student",
    grade: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name ?? "",
        role: "student", // Force role to student
        grade: profile.grade ?? "Class1", // Default grade to Class1
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please wait for authentication to complete.");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    // Default to Class1 if somehow empty, though initialization handles it.
    const gradeToSubmit = formData.grade || "Class1";

    setIsSubmitting(true);

    try {
      await upsertProfile({
        name: formData.name.trim(),
        role: "student", // Force role to student
        grade: gradeToSubmit,
      });

      toast.success("Profile updated successfully!");
      setIsEditing(false);
      // Don't call onCancel here - just stay in view mode
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      if (errorMessage.includes('authenticated')) {
        toast.error("Session expired. Please sign in again.");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading only if we're still fetching (undefined), not if profile doesn't exist (null)
  if (profile === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4" style={{ color: 'var(--theme-text-secondary)' }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 overflow-y-auto max-h-[80vh]">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="rounded-xl shadow-sm p-6 mb-6" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--theme-text)' }}>Profile</h1>
              <p className="mt-2" style={{ color: 'var(--theme-text-secondary)' }}>
                {isEditing ? "Update your personal information" : "View your profile details"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                  title="Edit Profile"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
              )}
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                  style={{ color: 'var(--theme-text-secondary)' }}
                  title="Cancel"
                >
                  <X className="h-6 w-6" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="rounded-xl shadow-sm p-8" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-border)' }}>
          {/* Current User Email */}
          {user?.email && (
            <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--theme-text-secondary)' }}>Account Email</p>
                  <p className="text-sm" style={{ color: 'var(--theme-text)' }}>{user.email}</p>
                </div>
              </div>
            </div>
          )}

          {!isEditing ? (
            /* View Mode - Display Profile Info */
            <div className="space-y-6">
              {/* Name Display */}
              <div className="p-4 rounded-lg" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border)' }}>
                <div className="flex items-center gap-3 mb-2">
                  <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>Full Name</span>
                </div>
                <p className="text-lg font-medium ml-8" style={{ color: 'var(--theme-text)' }}>
                  {formData.name || "Not set"}
                </p>
              </div>

              {/* Grade Display */}
              <div className="p-4 rounded-lg" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border)' }}>
                <div className="flex items-center gap-3 mb-2">
                  <GraduationCap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>Grade/Class</span>
                </div>
                <p className="text-lg font-medium ml-8" style={{ color: 'var(--theme-text)' }}>
                  {formData.grade ? formData.grade.replace('Class', 'Class ') : "Not set"}
                </p>
              </div>

              {/* Role Display */}
              <div className="p-4 rounded-lg" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border)' }}>
                <div className="flex items-center gap-3 mb-2">
                  <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>Role</span>
                </div>
                <p className="text-lg font-medium ml-8 capitalize" style={{ color: 'var(--theme-text)' }}>
                  {formData.role}
                </p>
              </div>
            </div>
          ) : (
            /* Edit Mode - Editable Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold mb-2" style={{ color: 'var(--theme-text)' }}>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    Full Name *
                  </div>
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  style={{ background: 'var(--theme-input-bg)', border: '1px solid var(--theme-border)', color: 'var(--theme-text)' }}
                  placeholder="Enter your full name"
                  required
                  minLength={2}
                />
                <p className="mt-1 text-xs" style={{ color: 'var(--theme-text-secondary)' }}>This name will be displayed across the platform</p>
              </div>

              {/* Grade Field */}
              <div>
                <label htmlFor="grade" className="block text-sm font-semibold mb-2" style={{ color: 'var(--theme-text)' }}>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    Grade/Class *
                  </div>
                </label>
                <select
                  id="grade"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  style={{ background: 'var(--theme-input-bg)', border: '1px solid var(--theme-border)', color: 'var(--theme-text)' }}
                  required
                >
                  <option value="">Select your grade</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={`Class${num}`}>
                      Class {num}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Save Changes
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    // Reset form to original values
                    if (profile) {
                      setFormData({
                        name: profile.name ?? "",
                        role: "student",
                        grade: profile.grade ?? "Class1",
                      });
                    }
                  }}
                  disabled={isSubmitting}
                  className="px-6 py-3 border-2 rounded-lg font-semibold hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-secondary)' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300">Profile Information</h3>
              <p className="text-sm text-blue-800 dark:text-blue-400 mt-1">
                Your profile information helps us personalize your experience and provide relevant content.
                Your grade determines which materials you can access in the library.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
