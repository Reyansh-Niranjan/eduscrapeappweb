import { useState } from 'react';
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import { useFormValidation } from '../hooks/useFormValidation';

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Form states for updates
  const [updateForm, setUpdateForm] = useState({
    title: '',
    content: '',
    type: 'device_update' as 'github_release' | 'device_update',
    imageUrl: '',
  });

  // Form states for projects
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    technologies: '',
    repositoryUrl: '',
    imageUrl: '',
    videoUrl: '',
    featured: false,
  });

  // Form states for team members
  const [teamForm, setTeamForm] = useState({
    name: '',
    role: '',
    bio: '',
    imageUrl: '',
    order: 1,
  });

  // Form states for GitHub integration
  const [githubForm, setGithubForm] = useState({
    owner: 'Reyansh-Niranjan',
    repo: 'EduScrapeApp',
    limit: 5,
  });

  const [githubSyncForm, setGithubSyncForm] = useState({
    owner: 'Reyansh-Niranjan',
    repo: 'EduScrapeApp',
    featured: false,
  });

  const createUpdate = useMutation(api.updates.createDeviceUpdate);
  const createProject = useMutation(api.projects.create);
  const createTeamMember = useMutation(api.team.create);
  const fetchGitHubReleases = useAction(api.github.fetchReleases);
  const syncProjectFromRepo = useAction(api.github.syncProjectFromRepo);
  const validateAdminPassword = useAction(api.admin.validateAdminPassword);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Server-side password validation using Convex environment variable
      const isValid = await validateAdminPassword({ password });
      if (isValid) {
        setIsAuthenticated(true);
        toast.success('Admin access granted');
      } else {
        toast.error('Invalid password');
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUpdate({
        title: updateForm.title,
        content: updateForm.content,
        imageUrl: updateForm.imageUrl || undefined,
      });
      toast.success('Update created successfully');
      setUpdateForm({ title: '', content: '', type: 'device_update', imageUrl: '' });
    } catch (error) {
      toast.error('Failed to create update');
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProject({
        name: projectForm.name,
        description: projectForm.description,
        technologies: projectForm.technologies.split(',').map(t => t.trim()),
        repositoryUrl: projectForm.repositoryUrl,
        imageUrl: projectForm.imageUrl || undefined,
        videoUrl: projectForm.videoUrl || undefined,
        featured: projectForm.featured,
      });
      toast.success('Project created successfully');
      setProjectForm({
        name: '',
        description: '',
        technologies: '',
        repositoryUrl: '',
        imageUrl: '',
        videoUrl: '',
        featured: false,
      });
    } catch (error) {
      toast.error('Failed to create project');
    }
  };

  const handleCreateTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTeamMember({
        name: teamForm.name,
        role: teamForm.role,
        bio: teamForm.bio || undefined,
        imageUrl: teamForm.imageUrl || undefined,
        order: teamForm.order,
      });
      toast.success('Team member created successfully');
      setTeamForm({
        name: '',
        role: '',
        bio: '',
        imageUrl: '',
        order: 1,
      });
    } catch (error) {
      toast.error('Failed to create team member');
    }
  };

  const handleFetchGitHubReleases = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await fetchGitHubReleases({
        owner: githubForm.owner,
        repo: githubForm.repo,
        limit: githubForm.limit,
      });
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message || 'Failed to fetch GitHub releases');
      }
    } catch (error) {
      toast.error('Failed to fetch GitHub releases');
      console.error('GitHub releases fetch error:', error);
    }
  };

  const handleSyncProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await syncProjectFromRepo({
        owner: githubSyncForm.owner,
        repo: githubSyncForm.repo,
        featured: githubSyncForm.featured,
      });
      toast.success(result.message);
    } catch (error) {
      toast.error('Failed to sync project from GitHub');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-teal-900 flex items-center justify-center p-6">
        <div className="bg-gradient-to-br from-purple-800/20 to-teal-800/20 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-teal-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
            <p className="text-gray-300">Enter password to access admin panel</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="mb-6">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-teal-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-teal-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50"
            >
              {isLoading ? 'Authenticating...' : 'Access Admin Panel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-teal-900 p-6">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Admin <span className="bg-gradient-to-r from-teal-400 to-purple-500 bg-clip-text text-transparent">Panel</span>
          </h1>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-gray-300 hover:text-red-400 transition-colors"
          >
            Logout
          </button>
        </div>

        <div className="grid gap-8">
          {/* GitHub Integration */}
          <div className="bg-gradient-to-br from-purple-800/20 to-teal-800/20 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">🔗 GitHub Integration</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Fetch Releases */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Fetch Releases</h3>
                <form onSubmit={handleFetchGitHubReleases} className="space-y-4">
                  <input
                    type="text"
                    value={githubForm.owner}
                    onChange={(e) => setGithubForm({ ...githubForm, owner: e.target.value })}
                    placeholder="Owner (e.g., Reyansh-Niranjan)"
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none"
                    required
                  />
                  <input
                    type="text"
                    value={githubForm.repo}
                    onChange={(e) => setGithubForm({ ...githubForm, repo: e.target.value })}
                    placeholder="Repository (e.g., EduScrapeApp)"
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:from-green-600 hover:to-blue-700 transition-all duration-300"
                  >
                    Fetch Releases
                  </button>
                </form>
              </div>

              {/* Sync Project */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Sync Project</h3>
                <form onSubmit={handleSyncProject} className="space-y-4">
                  <input
                    type="text"
                    value={githubSyncForm.owner}
                    onChange={(e) => setGithubSyncForm({ ...githubSyncForm, owner: e.target.value })}
                    placeholder="Owner"
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none"
                    required
                  />
                  <input
                    type="text"
                    value={githubSyncForm.repo}
                    onChange={(e) => setGithubSyncForm({ ...githubSyncForm, repo: e.target.value })}
                    placeholder="Repository"
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none"
                    required
                  />
                  <label className="flex items-center text-white">
                    <input
                      type="checkbox"
                      checked={githubSyncForm.featured}
                      onChange={(e) => setGithubSyncForm({ ...githubSyncForm, featured: e.target.checked })}
                      className="mr-2"
                    />
                    Featured Project
                  </label>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
                  >
                    Sync Project
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Create Update */}
          <div className="bg-gradient-to-br from-purple-800/20 to-teal-800/20 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">📢 Create Update</h2>
            <form onSubmit={handleCreateUpdate} className="space-y-4">
              <input
                type="text"
                value={updateForm.title}
                onChange={(e) => setUpdateForm({ ...updateForm, title: e.target.value })}
                placeholder="Update title"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none"
                required
              />
              <textarea
                value={updateForm.content}
                onChange={(e) => setUpdateForm({ ...updateForm, content: e.target.value })}
                placeholder="Update content"
                rows={4}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none"
                required
              />
              <input
                type="url"
                value={updateForm.imageUrl}
                onChange={(e) => setUpdateForm({ ...updateForm, imageUrl: e.target.value })}
                placeholder="Image URL (optional)"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-teal-500 to-purple-600 text-white py-2 px-6 rounded-lg font-semibold hover:from-teal-600 hover:to-purple-700 transition-all duration-300"
              >
                Create Update
              </button>
            </form>
          </div>

          {/* Create Project */}
          <div className="bg-gradient-to-br from-purple-800/20 to-teal-800/20 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">🚀 Create Project</h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <input
                type="text"
                value={projectForm.name}
                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                placeholder="Project name"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none"
                required
              />
              <textarea
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                placeholder="Project description"
                rows={3}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none"
                required
              />
              <input
                type="text"
                value={projectForm.technologies}
                onChange={(e) => setProjectForm({ ...projectForm, technologies: e.target.value })}
                placeholder="Technologies (comma separated)"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none"
                required
              />
              <input
                type="url"
                value={projectForm.repositoryUrl}
                onChange={(e) => setProjectForm({ ...projectForm, repositoryUrl: e.target.value })}
                placeholder="Repository URL"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none"
                required
              />
              <label className="flex items-center text-white">
                <input
                  type="checkbox"
                  checked={projectForm.featured}
                  onChange={(e) => setProjectForm({ ...projectForm, featured: e.target.checked })}
                  className="mr-2"
                />
                Featured Project
              </label>
              <button
                type="submit"
                className="bg-gradient-to-r from-teal-500 to-purple-600 text-white py-2 px-6 rounded-lg font-semibold hover:from-teal-600 hover:to-purple-700 transition-all duration-300"
              >
                Create Project
              </button>
            </form>
          </div>

          {/* Create Team Member */}
          <div className="bg-gradient-to-br from-purple-800/20 to-teal-800/20 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">👥 Create Team Member</h2>
            <form onSubmit={handleCreateTeamMember} className="space-y-4">
              <input
                type="text"
                value={teamForm.name}
                onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                placeholder="Name"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none"
                required
              />
              <input
                type="text"
                value={teamForm.role}
                onChange={(e) => setTeamForm({ ...teamForm, role: e.target.value })}
                placeholder="Role"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none"
                required
              />
              <textarea
                value={teamForm.bio}
                onChange={(e) => setTeamForm({ ...teamForm, bio: e.target.value })}
                placeholder="Bio (optional)"
                rows={3}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none"
              />
              <input
                type="url"
                value={teamForm.imageUrl}
                onChange={(e) => setTeamForm({ ...teamForm, imageUrl: e.target.value })}
                placeholder="Image URL (optional)"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none"
              />
              <input
                type="number"
                value={teamForm.order}
                onChange={(e) => setTeamForm({ ...teamForm, order: parseInt(e.target.value) })}
                placeholder="Display order"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none"
                required
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-teal-500 to-purple-600 text-white py-2 px-6 rounded-lg font-semibold hover:from-teal-600 hover:to-purple-700 transition-all duration-300"
              >
                Create Team Member
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
