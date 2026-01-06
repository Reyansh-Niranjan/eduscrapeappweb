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
    githubReleaseData: v.optional(
      v.object({
        version: v.string(),
        releaseUrl: v.string(),
        tagName: v.string(),
        publishedAt: v.string(),
      })
    ),
    published: v.boolean(),
  }).index("by_published", ["published"]),

  teamMembers: defineTable({
    name: v.string(),
    role: v.string(),
    bio: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    socialLinks: v.optional(
      v.object({
        github: v.optional(v.string()),
        linkedin: v.optional(v.string()),
        twitter: v.optional(v.string()),
      })
    ),
    order: v.number(),
  }).index("by_order", ["order"]),

  chatMessages: defineTable({
    sessionId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    timestamp: v.number(),
  }).index("by_session", ["sessionId"]),

  userProfiles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    role: v.string(),
    grade: v.optional(v.string()), // Student's grade (Class1-Class12)
  })
    .index("by_user", ["userId"])
    .index("by_role", ["role"]),

  // Progress tracking tables
  books: defineTable({
    path: v.string(), // ZIP file path (e.g., "Class10/Maths/Maths.zip")
    grade: v.string(), // Class1-Class12
    subject: v.string(), // Maths, Science, English, etc.
    title: v.string(), // Derived from filename (e.g., "Maths")
    totalChapters: v.number(), // Populated after scanning ZIP
    estimatedReadTime: v.optional(v.number()), // minutes
    url: v.string(), // Full Firebase URL
  })
    .index("by_grade", ["grade"])
    .index("by_path", ["path"])
    .index("by_grade_subject", ["grade", "subject"]),

  chapters: defineTable({
    bookPath: v.string(), // Reference to books.path
    pdfPath: v.string(), // Path within ZIP (e.g., "Chapter1.pdf")
    identifiedTitle: v.optional(v.string()), // AI-identified chapter title
    isSupplementary: v.boolean(), // AI-determined: exclude index/PS files
    grade: v.string(), // Inherited from book
  })
    .index("by_book", ["bookPath"])
    .index("by_grade", ["grade"]),

  userProgress: defineTable({
    userId: v.id("users"),
    totalXP: v.number(),
    booksCompleted: v.number(),
    chaptersCompleted: v.number(),
    quizzesPassed: v.number(),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastActivity: v.number(), // timestamp
  })
    .index("by_user", ["userId"]),

  chapterProgress: defineTable({
    userId: v.id("users"),
    chapterId: v.id("chapters"),
    completed: v.boolean(),
    completedAt: v.optional(v.number()),
    timeSpent: v.number(), // seconds
    pagesRead: v.number(),
    totalPages: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_chapter", ["chapterId"])
    .index("by_user_chapter", ["userId", "chapterId"]),

  // Quiz tables
  quizzes: defineTable({
    chapterId: v.id("chapters"),
    title: v.string(),
    description: v.optional(v.string()),
    passingScore: v.number(), // percentage 0-100
    timeLimit: v.optional(v.number()), // minutes
    maxAttempts: v.optional(v.number()),
  })
    .index("by_chapter", ["chapterId"]),

  quizQuestions: defineTable({
    quizId: v.id("quizzes"),
    question: v.string(),
    type: v.union(v.literal("multiple_choice"), v.literal("true_false"), v.literal("short_answer")),
    options: v.optional(v.array(v.string())), // for multiple choice
    correctAnswer: v.string(),
    explanation: v.optional(v.string()),
    points: v.number(),
  })
    .index("by_quiz", ["quizId"]),

  quizAttempts: defineTable({
    userId: v.id("users"),
    quizId: v.id("quizzes"),
    attemptNumber: v.number(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    score: v.optional(v.number()), // percentage
    totalPoints: v.optional(v.number()),
    earnedPoints: v.optional(v.number()),
    passed: v.optional(v.boolean()),
    timeSpent: v.optional(v.number()), // seconds
  })
    .index("by_user", ["userId"])
    .index("by_quiz", ["quizId"])
    .index("by_user_quiz", ["userId", "quizId"]),

  quizAnswers: defineTable({
    attemptId: v.id("quizAttempts"),
    questionId: v.id("quizQuestions"),
    userAnswer: v.string(),
    isCorrect: v.boolean(),
    pointsEarned: v.number(),
    timeSpent: v.optional(v.number()), // seconds on this question
  })
    .index("by_attempt", ["attemptId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
