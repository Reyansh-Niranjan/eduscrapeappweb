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
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
              <p className="text-gray-600 mt-2">
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
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                  title="Cancel"
                >
                  <X className="h-6 w-6" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          {/* Current User Email */}
          {user?.email && (
            <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Account Email</p>
                  <p className="text-sm text-gray-900">{user.email}</p>
                </div>
              </div>
            </div>
          )}

          {!isEditing ? (
            /* View Mode - Display Profile Info */
            <div className="space-y-6">
              {/* Name Display */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <User className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-semibold text-gray-700">Full Name</span>
                </div>
                <p className="text-lg font-medium text-gray-900 ml-8">
                  {formData.name || "Not set"}
                </p>
              </div>

              {/* Grade Display */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <GraduationCap className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-semibold text-gray-700">Grade/Class</span>
                </div>
                <p className="text-lg font-medium text-gray-900 ml-8">
                  {formData.grade ? formData.grade.replace('Class', 'Class ') : "Not set"}
                </p>
              </div>

              {/* Role Display */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <Briefcase className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-semibold text-gray-700">Role</span>
                </div>
                <p className="text-lg font-medium text-gray-900 ml-8 capitalize">
                  {formData.role}
                </p>
              </div>
            </div>
          ) : (
            /* Edit Mode - Editable Form */
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-purple-600" />
                    Full Name *
                  </div>
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  placeholder="Enter your full name"
                  required
                  minLength={2}
                />
                <p className="mt-1 text-xs text-gray-500">This name will be displayed across the platform</p>
              </div>

              {/* Grade Field */}
              <div>
                <label htmlFor="grade" className="block text-sm font-semibold text-gray-900 mb-2">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-purple-600" />
                    Grade/Class *
                  </div>
                </label>
                <select
                  id="grade"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
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
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-purple-500 hover:text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-900">Profile Information</h3>
              <p className="text-sm text-blue-800 mt-1">
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
