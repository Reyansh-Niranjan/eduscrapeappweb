import { action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

const internalApi = internal as any;

export const isPageExtractedInternal = internalQuery({
  args: { bookId: v.id("userBooks"), pageNumber: v.number() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userBookPageTexts")
      .withIndex("by_book_page", (q) => q.eq("bookId", args.bookId).eq("pageNumber", args.pageNumber))
      .unique();
    return { exists: !!existing };
  },
});

export const upsertUserBookPageTextInternal = internalMutation({
  args: {
    bookId: v.id("userBooks"),
    pageNumber: v.number(),
    content: v.string(),
    model: v.string(),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userBookPageTexts")
      .withIndex("by_book_page", (q) => q.eq("bookId", args.bookId).eq("pageNumber", args.pageNumber))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        model: args.model,
        updatedAt: now,
      });
      return null;
    }

    await ctx.db.insert("userBookPageTexts", {
      bookId: args.bookId,
      pageNumber: args.pageNumber,
      content: args.content,
      model: args.model,
      userId: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    return null;
  },
});

export const startUserBookTextJob = action({
  args: {
    bookId: v.id("userBooks"),
    pdfUrl: v.string(),
    totalPages: v.number(),
    forceRestart: v.optional(v.boolean()),
  },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const totalPages = Math.max(1, Math.min(2000, Math.floor(args.totalPages)));

    const { jobId } = await ctx.runMutation(internalApi.userBookTextJobs.upsertJobInternal, {
      bookId: args.bookId,
      pdfUrl: args.pdfUrl,
      totalPages,
      userId,
      forceRestart: args.forceRestart,
    });

    await ctx.runMutation(internalApi.userBookTextJobs.scheduleJobBatchInternal, {
      jobId,
      delayMs: 0,
    });

    return { ok: true };
  },
});
