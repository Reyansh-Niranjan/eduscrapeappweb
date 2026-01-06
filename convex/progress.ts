import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const isSupplementaryPdfPath = (pdfPath: string) => {
  const lower = pdfPath.toLowerCase();
  const name = lower.split("/").pop() ?? lower;
  return (
    name.includes("index") ||
    name.includes("content") ||
    name.includes("contents") ||
    name.includes("preface") ||
    name.includes("foreword") ||
    name.includes("acknowled") ||
    name.includes("appendix")
  );
};

const titleFromBookPath = (bookPath: string) => {
  const parts = bookPath.replace(/\\/g, "/").split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? bookPath;
  return last.toLowerCase().endsWith(".zip") ? last.slice(0, -4) : last;
};

// Mark chapter as completed
export const markChapterCompleted = mutation({
  args: {
    chapterId: v.id("chapters"),
    timeSpent: v.number(), // seconds spent reading
    pagesRead: v.number(),
    totalPages: v.number()
  },
  returns: v.object({
    success: v.boolean(),
    xpEarned: v.number(),
    bookCompleted: v.optional(v.boolean())
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if chapter exists
    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter) {
      throw new Error("Chapter not found");
    }

    if (chapter.isSupplementary) {
      throw new Error("Cannot complete supplementary chapter");
    }

    // Check if already completed
    const existing = await ctx.db
      .query("chapterProgress")
      .withIndex("by_user_chapter", (q) => q.eq("userId", userId).eq("chapterId", args.chapterId))
      .unique();

    if (existing?.completed) {
      throw new Error("Chapter already completed");
    }

    // Update or create progress record
    const progressData = {
      userId,
      chapterId: args.chapterId,
      completed: true,
      completedAt: Date.now(),
      timeSpent: args.timeSpent,
      pagesRead: args.pagesRead,
      totalPages: args.totalPages,
    };

    if (existing) {
      await ctx.db.patch(existing._id, progressData);
    } else {
      await ctx.db.insert("chapterProgress", progressData);
    }

    // Award XP
    const xpEarned = 5000;
    const userProgress = await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (userProgress) {
      await ctx.db.patch(userProgress._id, {
        totalXP: userProgress.totalXP + xpEarned,
        chaptersCompleted: userProgress.chaptersCompleted + 1,
        lastActivity: Date.now(),
      });
    } else {
      await ctx.db.insert("userProgress", {
        userId,
        totalXP: xpEarned,
        booksCompleted: 0,
        chaptersCompleted: 1,
        quizzesPassed: 0,
        currentStreak: 1,
        longestStreak: 1,
        lastActivity: Date.now(),
      });
    }

    // Check if book is complete
    const bookChapters = await ctx.db
      .query("chapters")
      .withIndex("by_book", (q) => q.eq("bookPath", chapter.bookPath))
      .collect();

    const completedChapters = await ctx.db
      .query("chapterProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const bookCompletedChapterIds = completedChapters
      .filter(cp => cp.completed)
      .map(cp => cp.chapterId);

    const bookChapterIds = bookChapters
      .filter(c => !c.isSupplementary)
      .map(c => c._id);

    const bookCompleted = bookChapterIds.every(id => bookCompletedChapterIds.includes(id));

    if (bookCompleted) {
      // Update books completed count
      if (userProgress) {
        await ctx.db.patch(userProgress._id, {
          booksCompleted: userProgress.booksCompleted + 1,
        });
      }
    }

    return {
      success: true,
      xpEarned,
      bookCompleted: bookCompleted || undefined,
    };
  }
});

// Get user progress summary
export const getUserProgress = query({
  args: {},
  returns: v.object({
    totalXP: v.number(),
    booksCompleted: v.number(),
    chaptersCompleted: v.number(),
    quizzesPassed: v.number(),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastActivity: v.number(),
    completionPercentage: v.number()
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const progress = await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!progress) {
      return {
        totalXP: 0,
        booksCompleted: 0,
        chaptersCompleted: 0,
        quizzesPassed: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActivity: 0,
        completionPercentage: 0
      };
    }

    // Calculate completion percentage
    // For students, compute completion for their grade across non-supplementary chapters.
    // For non-students (no grade), keep this metric at 0.
    let completionPercentage = 0;
    const grade = userProfile?.grade;
    if (grade) {
      const chaptersForGrade = await ctx.db
        .query("chapters")
        .withIndex("by_grade", (q) => q.eq("grade", grade))
        .collect();

      const requiredChapterIds = new Set(
        chaptersForGrade.filter((c) => !c.isSupplementary).map((c) => c._id)
      );

      if (requiredChapterIds.size > 0) {
        const userChapterProgress = await ctx.db
          .query("chapterProgress")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();

        const completedCount = userChapterProgress.filter(
          (cp) => cp.completed && requiredChapterIds.has(cp.chapterId)
        ).length;

        completionPercentage = (completedCount / requiredChapterIds.size) * 100;
      }
    }

    return {
      totalXP: progress.totalXP,
      booksCompleted: progress.booksCompleted,
      chaptersCompleted: progress.chaptersCompleted,
      quizzesPassed: progress.quizzesPassed,
      currentStreak: progress.currentStreak,
      longestStreak: progress.longestStreak,
      lastActivity: progress.lastActivity,
      completionPercentage
    };
  }
});

// Get book progress for a user
export const getBookProgress = query({
  args: { bookPath: v.string() },
  returns: v.object({
    bookPath: v.string(),
    chaptersCompleted: v.number(),
    totalChapters: v.number(),
    completionPercentage: v.number(),
    chapters: v.array(v.object({
      chapterPath: v.string(),
      completed: v.boolean(),
      completedAt: v.optional(v.number()),
      timeSpent: v.number()
    }))
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get book info
    const book = await ctx.db
      .query("books")
      .withIndex("by_path", (q) => q.eq("path", args.bookPath))
      .unique();

    if (!book) {
      throw new Error("Book not found");
    }

    // Get chapters
    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_book", (q) => q.eq("bookPath", args.bookPath))
      .collect();

    // Get user progress for chapters
    const chapterIds = chapters.map(c => c._id);
    const progressRecords = await Promise.all(
      chapterIds.map(id =>
        ctx.db
          .query("chapterProgress")
          .withIndex("by_user_chapter", (q) => q.eq("userId", userId).eq("chapterId", id))
          .unique()
      )
    );

    const chaptersWithProgress = chapters.map((chapter, index) => {
      const progress = progressRecords[index];
      return {
        chapterPath: chapter.pdfPath,
        completed: progress?.completed || false,
        completedAt: progress?.completedAt,
        timeSpent: progress?.timeSpent || 0
      };
    });

    const chaptersCompleted = chaptersWithProgress.filter(c => c.completed).length;
    const totalChapters = chapters.filter(c => !c.isSupplementary).length;
    const completionPercentage = totalChapters > 0 ? (chaptersCompleted / totalChapters) * 100 : 0;

    return {
      bookPath: args.bookPath,
      chaptersCompleted,
      totalChapters,
      completionPercentage,
      chapters: chaptersWithProgress
    };
  }
});

// Get chapter by path
export const getChapterByPath = query({
  args: { bookPath: v.string(), pdfPath: v.string() },
  returns: v.object({
    chapter: v.optional(v.object({
      _creationTime: v.number(),
      _id: v.id("chapters"),
      bookPath: v.string(),
      pdfPath: v.string(),
      identifiedTitle: v.optional(v.string()),
      isSupplementary: v.boolean(),
      grade: v.string()
    }))
  }),
  handler: async (ctx, args) => {
    const normalize = (value: string) => {
      const unified = value.replace(/\\/g, "/").trim();
      // Normalize repeated slashes and drop leading ./
      return unified.replace(/\/+/g, "/").replace(/^\.\//, "").toLowerCase();
    };

    const basename = (value: string) => {
      const unified = value.replace(/\\/g, "/");
      const parts = unified.split("/").filter(Boolean);
      return (parts[parts.length - 1] ?? unified).toLowerCase();
    };

    const wantedFull = normalize(args.pdfPath);
    const wantedBase = basename(args.pdfPath);

    // Fetch chapters for the book and match in JS so we can do normalization.
    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_book", (q) => q.eq("bookPath", args.bookPath))
      .collect();

    const found =
      chapters.find((c) => normalize(c.pdfPath) === wantedFull) ||
      chapters.find((c) => basename(c.pdfPath) === wantedBase);

    return { chapter: found || undefined };
  }
});

// Get chapter progress
export const getChapterProgress = query({
  args: { chapterId: v.id("chapters") },
  returns: v.object({
    completed: v.boolean(),
    completedAt: v.optional(v.number()),
    timeSpent: v.number(),
    pagesRead: v.number(),
    totalPages: v.number(),
    completionPercentage: v.number()
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const progress = await ctx.db
      .query("chapterProgress")
      .withIndex("by_user_chapter", (q) => q.eq("userId", userId).eq("chapterId", args.chapterId))
      .unique();

    if (!progress) {
      return {
        completed: false,
        completedAt: undefined,
        timeSpent: 0,
        pagesRead: 0,
        totalPages: 0,
        completionPercentage: 0
      };
    }

    const completionPercentage = progress.totalPages > 0 ? (progress.pagesRead / progress.totalPages) * 100 : 0;

    return {
      completed: progress.completed,
      completedAt: progress.completedAt,
      timeSpent: progress.timeSpent,
      pagesRead: progress.pagesRead,
      totalPages: progress.totalPages,
      completionPercentage
    };
  }
});

// Ensure a book/chapter mapping exists for a ZIP.
// This lets the PDF viewer resolve chapterId and award XP / show quiz.
export const upsertBookAndChapters = mutation({
  args: {
    bookPath: v.string(),
    url: v.string(),
    pdfPaths: v.array(v.string()),
    grade: v.optional(v.string()),
    subject: v.optional(v.string()),
  },
  returns: v.object({
    bookCreated: v.boolean(),
    chaptersInserted: v.number(),
    chaptersExisting: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const normalizedBookPath = args.bookPath.replace(/\\/g, "/").replace(/^\/+/, "");

    const existingBook = await ctx.db
      .query("books")
      .withIndex("by_path", (q) => q.eq("path", normalizedBookPath))
      .unique();

    // Derive grade/subject from path if not provided.
    const pathParts = normalizedBookPath.split("/").filter(Boolean);
    const derivedGrade = args.grade ?? pathParts.find((p) => /^class\d+$/i.test(p)) ?? "Unknown";
    const derivedSubject = args.subject ?? pathParts[1] ?? "Unknown";

    let bookCreated = false;
    if (!existingBook) {
      await ctx.db.insert("books", {
        path: normalizedBookPath,
        grade: derivedGrade,
        subject: derivedSubject,
        title: titleFromBookPath(normalizedBookPath),
        totalChapters: args.pdfPaths.length,
        url: args.url,
      });
      bookCreated = true;
    } else {
      // Keep metadata fresh.
      await ctx.db.patch(existingBook._id, {
        url: args.url,
        grade: existingBook.grade || derivedGrade,
        subject: existingBook.subject || derivedSubject,
        totalChapters: Math.max(existingBook.totalChapters ?? 0, args.pdfPaths.length),
      });
    }

    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_book", (q) => q.eq("bookPath", normalizedBookPath))
      .collect();

    const existingSet = new Set(chapters.map((c) => c.pdfPath));

    let chaptersInserted = 0;
    let chaptersExisting = 0;
    for (const pdfPath of args.pdfPaths) {
      const normalizedPdfPath = pdfPath.replace(/\\/g, "/").replace(/^\/+/, "");
      if (existingSet.has(normalizedPdfPath)) {
        chaptersExisting++;
        continue;
      }

      await ctx.db.insert("chapters", {
        bookPath: normalizedBookPath,
        pdfPath: normalizedPdfPath,
        identifiedTitle: undefined,
        isSupplementary: isSupplementaryPdfPath(normalizedPdfPath),
        grade: derivedGrade,
      });
      chaptersInserted++;
      existingSet.add(normalizedPdfPath);
    }

    return { bookCreated, chaptersInserted, chaptersExisting };
  },
});