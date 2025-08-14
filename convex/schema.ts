import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  projects: defineTable({
    name: v.string(),
    description: v.string(),
    technologies: v.array(v.string()),
    imageUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    repositoryUrl: v.string(),
    featured: v.optional(v.boolean()),
  }),
  
  updates: defineTable({
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
  }).index("by_published", ["published"]),
  
  teamMembers: defineTable({
    name: v.string(),
    role: v.string(),
    bio: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    socialLinks: v.optional(v.object({
      github: v.optional(v.string()),
      linkedin: v.optional(v.string()),
      twitter: v.optional(v.string()),
    })),
    order: v.number(),
  }).index("by_order", ["order"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
