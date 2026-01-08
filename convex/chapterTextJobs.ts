import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getJobStatusByChapter = query({
  args: { chapterId: v.id("chapters") },
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
      .query("chapterTextJobs")
      .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
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

export const getJobByChapterInternal = internalQuery({
  args: { chapterId: v.id("chapters") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chapterTextJobs")
      .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
      .order("desc")
      .first();
  },
});

export const upsertJobInternal = internalMutation({
  args: {
    chapterId: v.id("chapters"),
    pdfUrl: v.string(),
    totalPages: v.number(),
    userId: v.id("users"),
    forceRestart: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("chapterTextJobs")
      .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
      .order("desc")
      .first();

    const now = Date.now();

    // If a job is already running or completed and forceRestart is not set, keep it.
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

    const jobId = await ctx.db.insert("chapterTextJobs", {
      chapterId: args.chapterId,
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
    jobId: v.id("chapterTextJobs"),
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
  args: { jobId: v.id("chapterTextJobs") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const job = await ctx.db.get(args.jobId);

    await ctx.db.patch(args.jobId, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
      lastError: undefined,
    });

    if (job) {
      // Schedule combining all page notes into a final chapter summary
      await ctx.scheduler.runAfter(0, (internal as any).notes.combineChapterNotes, {
        chapterId: job.chapterId,
        userId: job.userId,
      });
    }
  },
});

export const setJobPausedInternal = internalMutation({
  args: { jobId: v.id("chapterTextJobs"), error: v.string() },
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
    jobId: v.id("chapterTextJobs"),
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
    jobId: v.id("chapterTextJobs"),
    delayMs: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(args.delayMs, internal.chapterTextWorker.processJobBatch, {
      jobId: args.jobId,
    });
  },
});

export const getJobInternal = internalQuery({
  args: { jobId: v.id("chapterTextJobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});
