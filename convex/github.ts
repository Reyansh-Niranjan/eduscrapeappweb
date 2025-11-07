import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";

// Direct GitHub API integration - fetch releases without webhooks
export const fetchReleases = action({
  args: {
    owner: v.string(),
    repo: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    releases: v.optional(v.array(v.object({
      name: v.string(),
      tag_name: v.string(),
      published_at: v.string(),
      html_url: v.string()
    }))),
    error: v.optional(v.string())
  }),
  handler: async (ctx, args) => {
    try {
      const limit = args.limit || 5;
      const url = `https://api.github.com/repos/${args.owner}/${args.repo}/releases?per_page=${limit}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Team-Portfolio-App',
          ...(process.env.GITHUB_TOKEN && {
            'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
          })
        }
      });

      if (!response.ok) {
        const errorMessage = `GitHub API error: ${response.status} ${response.statusText}`;
        console.error(errorMessage);
        return {
          success: false,
          message: errorMessage,
          error: errorMessage
        };
      }

      const releases = await response.json();
      
      // Process and store new releases
      const existingUpdates = await ctx.runQuery(api.updates.listAll);
      const existingReleaseIds = new Set(
        existingUpdates
          .filter((u: any) => u.type === 'github_release' && u.githubReleaseData)
          .map((u: any) => u.githubReleaseData!.tagName)
      );

      let newReleasesCount = 0;
      
      for (const release of releases) {
        if (!existingReleaseIds.has(release.tag_name) && !release.draft) {
          await ctx.runMutation(internal.updates.createInternal, {
            title: `${release.name || release.tag_name} Released`,
            content: release.body || `New release ${release.tag_name} is now available.`,
            type: "github_release",
            githubReleaseData: {
              version: release.tag_name,
              releaseUrl: release.html_url,
              tagName: release.tag_name,
              publishedAt: release.published_at,
            },
            published: true,
          });
          newReleasesCount++;
        }
      }

      return {
        success: true,
        message: `Fetched ${releases.length} releases, added ${newReleasesCount} new ones`,
        releases: releases.map((r: any) => ({
          name: r.name || r.tag_name,
          tag_name: r.tag_name,
          published_at: r.published_at,
          html_url: r.html_url
        }))
      };
    } catch (error) {
      const errorMessage = `Failed to fetch GitHub releases: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('GitHub API fetch error:', error);
      return {
        success: false,
        message: errorMessage,
        error: errorMessage
      };
    }
  },
});

// Get repository information
export const fetchRepoInfo = action({
  args: {
    owner: v.string(),
    repo: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const url = `https://api.github.com/repos/${args.owner}/${args.repo}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Team-Portfolio-App',
          ...(process.env.GITHUB_TOKEN && {
            'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
          })
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const repo = await response.json();
      
      return {
        name: repo.name,
        description: repo.description,
        html_url: repo.html_url,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        created_at: repo.created_at,
        updated_at: repo.updated_at,
        topics: repo.topics || []
      };
    } catch (error) {
      console.error('GitHub repo info fetch error:', error);
      throw new Error(`Failed to fetch repository info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Sync project data from GitHub repository
export const syncProjectFromRepo = action({
  args: {
    owner: v.string(),
    repo: v.string(),
    featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      // Fetch repo info
      const repoInfo: any = await ctx.runAction(api.github.fetchRepoInfo, {
        owner: args.owner,
        repo: args.repo,
      });

      // Fetch languages
      const languagesResponse = await fetch(`https://api.github.com/repos/${args.owner}/${args.repo}/languages`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Team-Portfolio-App',
          ...(process.env.GITHUB_TOKEN && {
            'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
          })
        }
      });

      let technologies = [repoInfo.language].filter(Boolean);
      
      if (languagesResponse.ok) {
        const languages = await languagesResponse.json();
        technologies = Object.keys(languages);
      }

      // Add topics as technologies
      if (repoInfo.topics.length > 0) {
        technologies = [...new Set([...technologies, ...repoInfo.topics])];
      }

      // Check if project already exists
      const existingProjects: any = await ctx.runQuery(api.projects.listAll);
      const existingProject: any = existingProjects.find((p: any) => p.repositoryUrl === repoInfo.html_url);

      if (existingProject) {
        return {
          success: true,
          message: `Project ${repoInfo.name} already exists`,
          project: existingProject
        };
      }

      // Create new project
      const projectId: any = await ctx.runMutation(api.projects.create, {
        name: repoInfo.name,
        description: repoInfo.description || `A ${repoInfo.language || 'software'} project with ${repoInfo.stargazers_count} stars`,
        technologies,
        repositoryUrl: repoInfo.html_url,
        featured: args.featured || false,
      });

      return {
        success: true,
        message: `Successfully synced project ${repoInfo.name}`,
        projectId,
        repoInfo
      };
    } catch (error) {
      console.error('Project sync error:', error);
      throw new Error(`Failed to sync project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});
