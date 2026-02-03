import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const createUserBook = mutation({
  args: {
    fileId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    const bookId = await ctx.db.insert("userBooks", {
      userId,
      fileId: args.fileId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      title: args.title,
      uploadedAt: now,
    });

    const fileUrl = await ctx.storage.getUrl(args.fileId);

    return { bookId, fileUrl };
  },
});

export const listMyBooks = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const books = await ctx.db
      .query("userBooks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const results = [] as Array<{
      _id: any;
      title: string;
      fileName: string;
      fileSize: number;
      uploadedAt: number;
      fileUrl: string | null;
      job: null | {
        status: "running" | "completed" | "paused";
        totalPages: number;
        nextPageNumber: number;
        lastError?: string;
        lastPrimaryModel?: string;
        lastUsedModel?: string;
        fallbackActive?: boolean;
        updatedAt: number;
      };
    }>;

    for (const book of books) {
      const fileUrl = await ctx.storage.getUrl(book.fileId);
      const job = await ctx.db
        .query("userBookTextJobs")
        .withIndex("by_book", (q) => q.eq("bookId", book._id))
        .order("desc")
        .first();

      results.push({
        _id: book._id,
        title: book.title,
        fileName: book.fileName,
        fileSize: book.fileSize,
        uploadedAt: book.uploadedAt,
        fileUrl,
        job: job
          ? {
            status: job.status,
            totalPages: job.totalPages,
            nextPageNumber: job.nextPageNumber,
            lastError: job.lastError,
            lastPrimaryModel: job.lastPrimaryModel,
            lastUsedModel: job.lastUsedModel,
            fallbackActive: job.fallbackActive,
            updatedAt: job.updatedAt,
          }
          : null,
      });
    }

    return results;
  },
});

export const getMyBookContext = query({
  args: { maxChars: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return "";

    const books = await ctx.db
      .query("userBooks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    if (books.length === 0) return "";

    const perBookMax = Math.max(800, Math.min(4000, Math.floor((args.maxChars ?? 8000) / Math.max(1, books.length))));
    let context = "";

    for (const book of books) {
      const pages = await ctx.db
        .query("userBookPageTexts")
        .withIndex("by_book", (q) => q.eq("bookId", book._id))
        .order("asc")
        .take(8);

      const combined = pages.map((p) => p.content).join("\n").slice(0, perBookMax).trim();
      context += `\n- ${book.title} (${book.fileName})`;
      if (combined) {
        context += `\n  Extracted text (sample):\n${combined}\n`;
      } else {
        context += "\n  Extracted text: (pending)\n";
      }
    }

    return context.trim();
  },
});
