import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const profileValidator = v.object({
  _id: v.id("userProfiles"),
  userId: v.id("users"),
  name: v.string(),
  role: v.string(),
  _creationTime: v.number(),
});

export const getMyProfile = query({
  args: {},
  returns: v.union(v.null(), profileValidator),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    return await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const upsertProfile = mutation({
  args: {
    name: v.string(),
    role: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const trimmedName = args.name.trim();
    const trimmedRole = args.role.trim();
    if (trimmedName.length < 2) {
      throw new Error("Name must be at least 2 characters long");
    }
    if (trimmedRole.length === 0) {
      throw new Error("Role is required");
    }

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: trimmedName,
        role: trimmedRole,
      });
    } else {
      await ctx.db.insert("userProfiles", {
        userId,
        name: trimmedName,
        role: trimmedRole,
      });
    }

    return null;
  },
});

const adminListValidator = v.array(
  v.object({
    userId: v.id("users"),
    name: v.string(),
    role: v.string(),
    email: v.union(v.null(), v.string()),
    image: v.union(v.null(), v.string()),
    createdAt: v.number(),
  })
);

export const listProfiles = query({
  args: {},
  returns: v.union(v.null(), adminListValidator),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || profile.role.toLowerCase() !== "admin") {
      return null;
    }

    const profiles = await ctx.db.query("userProfiles").collect();

    const results = [];
    for (const entry of profiles) {
      const user = await ctx.db.get(entry.userId);
      results.push({
        userId: entry.userId,
        name: entry.name,
        role: entry.role,
        email: user?.email ?? null,
        image: user?.image ?? null,
        createdAt: user?._creationTime ?? entry._creationTime,
      });
    }
    return results;
  },
});
