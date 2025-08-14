import { query, mutation, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("updates")
      .withIndex("by_published", (q) => q.eq("published", true))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    type: v.union(v.literal("github_release"), v.literal("device_update")),
    imageUrl: v.optional(v.string()),
    githubReleaseData: v.optional(v.object({
      version: v.string(),
      releaseUrl: v.string(),
      tagName: v.string(),
      publishedAt: v.string(),
    })),
    published: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("updates", args);
  },
});

export const createInternal = internalMutation({
  args: {
    title: v.string(),
    content: v.string(),
    type: v.union(v.literal("github_release"), v.literal("device_update")),
    imageUrl: v.optional(v.string()),
    githubReleaseData: v.optional(v.object({
      version: v.string(),
      releaseUrl: v.string(),
      tagName: v.string(),
      publishedAt: v.string(),
    })),
    published: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("updates", args);
  },
});

// GitHub webhook handler for automatic release updates
export const createGitHubRelease = action({
  args: {
    tagName: v.string(),
    name: v.string(),
    body: v.string(),
    htmlUrl: v.string(),
    publishedAt: v.string(),
  },
  handler: async (ctx, args) => {
    // Create a new GitHub release update
    await ctx.runMutation(internal.updates.createInternal, {
      title: `${args.name} Released`,
      content: args.body || `New release ${args.tagName} is now available with exciting updates and improvements.`,
      type: "github_release",
      githubReleaseData: {
        version: args.tagName,
        releaseUrl: args.htmlUrl,
        tagName: args.tagName,
        publishedAt: args.publishedAt,
      },
      published: true,
    });
  },
});

// Manual function to add device updates
export const createDeviceUpdate = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("updates", {
      title: args.title,
      content: args.content,
      type: "device_update",
      imageUrl: args.imageUrl,
      published: true,
    });
  },
});

// Internal query to get all updates (for GitHub sync)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("updates").collect();
  },
});
