import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("projects").collect();
  },
});

export const getFeatured = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("projects")
      .filter((q) => q.eq(q.field("featured"), true))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    technologies: v.array(v.string()),
    imageUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    repositoryUrl: v.string(),
    featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projects", args);
  },
});

export const seedProjects = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("projects").collect();
    if (existing.length > 0) return { message: "Already seeded" };
    
    await ctx.db.insert("projects", {
      name: "EduScrapeApp",
      description: "An innovative educational mobile application built with modern Android development tools. Features user authentication, real-time data synchronization, and an intuitive interface for enhanced learning experiences.",
      technologies: ["Java", "Android Studio", "Firebase", "XML", "Material Design"],
      repositoryUrl: "https://github.com/Reyansh-Niranjan/EduScrapeApp",
      featured: true,
    });
    
    return { success: true };
  },
});

// Internal query to get all projects (for GitHub sync)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("projects").collect();
  },
});
