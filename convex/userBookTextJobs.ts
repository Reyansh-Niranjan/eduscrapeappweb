import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

const internalApi = internal as any;

export const getJobStatusByBook = query({
  args: { bookId: v.id("userBooks") },
  returns: v.union(
    v.null(),
    v.object({
      status: v.union(v.literal("running"), v.literal("completed"), v.literal("paused")),
      totalPages: v.number(),
      nextPageNumber: v.number(),
      lastError: v.optional(v.string()),
      lastPrimaryModel: v.optional(v.string()),
      lastUsedModel: v.optional(v.string()),
      fallbackActive: v.optional(v.boolean()),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const job = await ctx.db
      .query("userBookTextJobs")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .order("desc")
      .first();

    if (!job) return null;
    if (job.userId !== userId) return null;

    return {
      status: job.status,
      totalPages: job.totalPages,
      nextPageNumber: job.nextPageNumber,
      lastError: job.lastError,
      lastPrimaryModel: job.lastPrimaryModel,
      lastUsedModel: job.lastUsedModel,
      fallbackActive: job.fallbackActive,
      updatedAt: job.updatedAt,
    };
  },
});

export const getJobByBookInternal = internalQuery({
  args: { bookId: v.id("userBooks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userBookTextJobs")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .order("desc")
      .first();
  },
});

export const upsertJobInternal = internalMutation({
  args: {
    bookId: v.id("userBooks"),
    pdfUrl: v.string(),
    totalPages: v.number(),
    userId: v.id("users"),
    forceRestart: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userBookTextJobs")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .order("desc")
      .first();

    const now = Date.now();

    if (existing && !args.forceRestart && (existing.status === "running" || existing.status === "completed")) {
      return { jobId: existing._id };
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        pdfUrl: args.pdfUrl,
        totalPages: args.totalPages,
        nextPageNumber: 1,
        status: "running",
        lastError: undefined,
        userId: args.userId,
        updatedAt: now,
        startedAt: now,
        completedAt: undefined,
      });
      return { jobId: existing._id };
    }

    const jobId = await ctx.db.insert("userBookTextJobs", {
      bookId: args.bookId,
      pdfUrl: args.pdfUrl,
      totalPages: args.totalPages,
      nextPageNumber: 1,
      status: "running",
      lastError: undefined,
      userId: args.userId,
      createdAt: now,
      updatedAt: now,
      startedAt: now,
      completedAt: undefined,
    });

    return { jobId };
  },
});

export const setJobProgressInternal = internalMutation({
  args: {
    jobId: v.id("userBookTextJobs"),
    nextPageNumber: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      nextPageNumber: args.nextPageNumber,
      updatedAt: Date.now(),
    });
  },
});

export const setJobCompletedInternal = internalMutation({
  args: { jobId: v.id("userBookTextJobs") },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.jobId, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
      lastError: undefined,
    });
  },
});

export const setJobPausedInternal = internalMutation({
  args: { jobId: v.id("userBookTextJobs"), error: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.jobId, {
      status: "paused",
      lastError: args.error,
      updatedAt: now,
    });
  },
});

export const setJobModelInfoInternal = internalMutation({
  args: {
    jobId: v.id("userBookTextJobs"),
    lastPrimaryModel: v.string(),
    lastUsedModel: v.string(),
    fallbackActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      lastPrimaryModel: args.lastPrimaryModel,
      lastUsedModel: args.lastUsedModel,
      fallbackActive: args.fallbackActive,
      updatedAt: Date.now(),
    });
  },
});

export const scheduleJobBatchInternal = internalMutation({
  args: {
    jobId: v.id("userBookTextJobs"),
    delayMs: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(args.delayMs, internalApi.userBookTextWorker.processJobBatch, {
      jobId: args.jobId,
    });
  },
});

export const getJobInternal = internalQuery({
  args: { jobId: v.id("userBookTextJobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});
