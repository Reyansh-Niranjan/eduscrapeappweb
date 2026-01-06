import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import JSZip from "jszip";

const QUIZ_GRADING_MODEL = process.env.QUIZ_GRADING_MODEL || "x-ai/grok-2-1212";

const SKIPPED_ANSWER = "__SKIPPED__";
const XP_PER_CORRECT = 100;
const XP_PER_WRONG = 30;
const XP_PER_SKIPPED = 0;

type ToolCall = {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
};

type OpenRouterResponse = {
  choices: Array<{
    message: {
      content: string | null;
      tool_calls?: ToolCall[];
    };
  }>;
};

type OpenRouterMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

async function openRouterChat(args: {
  apiKey: string;
  model: string;
  messages: OpenRouterMessage[];
  tools?: any;
  toolChoice?: "auto" | "none";
  maxTokens?: number;
  temperature?: number;
}): Promise<OpenRouterResponse> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://eduscrapeapp.com",
      "X-Title": "EduScrapeApp",
    },
    body: JSON.stringify({
      model: args.model,
      messages: args.messages,
      tools: args.tools,
      tool_choice: args.toolChoice,
      max_tokens: args.maxTokens ?? 900,
      temperature: args.temperature ?? 0.7,
    }),
  });

  const textBody = await response.text();

  if (!response.ok) {
    console.error("[ERROR] OpenRouter API error:", response.status, textBody);
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
  }

  const data = JSON.parse(textBody);
  return data;
}

function safeParseJson(input: string): any {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

export const createGeneratedQuizInternal = internalMutation({
  args: {
    chapterId: v.id("chapters"),
    title: v.string(),
    description: v.optional(v.string()),
    passingScore: v.number(),
    timeLimit: v.optional(v.number()),
    maxAttempts: v.optional(v.number()),
    questions: v.array(
      v.object({
        question: v.string(),
        type: v.union(
          v.literal("multiple_choice"),
          v.literal("true_false"),
          v.literal("short_answer")
        ),
        options: v.optional(v.array(v.string())),
        correctAnswer: v.string(),
        explanation: v.optional(v.string()),
        points: v.number(),
      })
    ),
  },
  returns: v.object({ quizId: v.id("quizzes") }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("quizzes")
      .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
      .unique();

    if (existing) {
      return { quizId: existing._id };
    }

    const quizId = await ctx.db.insert("quizzes", {
      chapterId: args.chapterId,
      title: args.title,
      description: args.description,
      passingScore: args.passingScore,
      timeLimit: args.timeLimit,
      maxAttempts: args.maxAttempts,
    });

    for (const q of args.questions) {
      await ctx.db.insert("quizQuestions", {
        quizId,
        question: q.question,
        type: q.type,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        points: q.points,
      });
    }

    return { quizId };
  },
});

// Start quiz attempt
export const startQuizAttempt = mutation({
  args: { quizId: v.id("quizzes") },
  returns: v.object({
    attemptId: v.id("quizAttempts"),
    attemptNumber: v.number(),
    questions: v.array(v.object({
      questionId: v.id("quizQuestions"),
      question: v.string(),
      type: v.string(),
      options: v.optional(v.array(v.string()))
    }))
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check quiz exists
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) {
      throw new Error("Quiz not found");
    }

    // Check max attempts
    const existingAttempts = await ctx.db
      .query("quizAttempts")
      .withIndex("by_user_quiz", (q) => q.eq("userId", userId).eq("quizId", args.quizId))
      .collect();

    const attemptNumber = existingAttempts.length + 1;

    if (quiz.maxAttempts && attemptNumber > quiz.maxAttempts) {
      throw new Error("Maximum attempts reached");
    }

    // Check for incomplete attempt
    const incompleteAttempt = existingAttempts.find(a => !a.completedAt);
    if (incompleteAttempt) {
      throw new Error("Complete your previous attempt first");
    }

    // Create new attempt
    const attemptId = await ctx.db.insert("quizAttempts", {
      userId,
      quizId: args.quizId,
      attemptNumber,
      startedAt: Date.now(),
    });

    // Get questions
    const questions = await ctx.db
      .query("quizQuestions")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
      .collect();

    const questionData = questions.map(q => ({
      questionId: q._id,
      question: q.question,
      type: q.type,
      options: q.options
    }));

    return {
      attemptId,
      attemptNumber,
      questions: questionData
    };
  }
});

// Submit quiz answer
export const submitQuizAnswer = mutation({
  args: {
    attemptId: v.id("quizAttempts"),
    questionId: v.id("quizQuestions"),
    answer: v.string(),
    timeSpent: v.optional(v.number())
  },
  returns: v.object({
    correct: v.boolean(),
    pointsEarned: v.number(),
    explanation: v.optional(v.string())
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Validate attempt
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt || attempt.userId !== userId) {
      throw new Error("Invalid attempt");
    }

    if (attempt.completedAt) {
      throw new Error("Attempt already completed");
    }

    // Validate question
    const question = await ctx.db.get(args.questionId);
    if (!question) {
      throw new Error("Question not found");
    }

    // Check if question belongs to quiz
    const quiz = await ctx.db.get(attempt.quizId);
    if (!quiz || question.quizId !== quiz._id) {
      throw new Error("Question does not belong to this quiz");
    }

    // Check if answer already submitted
    const existingAnswers = await ctx.db
      .query("quizAnswers")
      .withIndex("by_attempt", (q) => q.eq("attemptId", args.attemptId))
      .collect();

    const existingAnswer = existingAnswers.find(a => a.questionId === args.questionId);

    if (existingAnswer) {
      throw new Error("Answer already submitted");
    }

    const normalize = (s: string) => String(s ?? "").trim().toLowerCase();

    // Default grading outcomes.
    let isCorrect = false;
    let pointsEarned = 0;
    let feedback: string | undefined = undefined;

    // Skip grading for explicitly skipped questions.
    if (typeof args.answer === "string" && args.answer === SKIPPED_ANSWER) {
      isCorrect = false;
      pointsEarned = XP_PER_SKIPPED;
      feedback = "Skipped";
    } else if (question.type === "multiple_choice" || question.type === "true_false") {
      isCorrect = normalize(question.correctAnswer) === normalize(args.answer);
      pointsEarned = isCorrect ? XP_PER_CORRECT : XP_PER_WRONG;
      feedback = question.explanation;
    } else {
      // short_answer: use LLM grading for reasonable variations.
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        // Fallback without LLM.
        isCorrect = normalize(question.correctAnswer) === normalize(args.answer);
        pointsEarned = isCorrect ? XP_PER_CORRECT : XP_PER_WRONG;
        feedback = question.explanation;
      } else {
        try {
          // Context for the grader.
          const chapter = await ctx.db.get(quiz.chapterId);
          const book = chapter
            ? await ctx.db
                .query("books")
                .withIndex("by_path", (q) => q.eq("path", chapter.bookPath))
                .unique()
            : null;

          const chapterContext = `${book?.subject || "Unknown"} - ${chapter?.grade || ""} - ${chapter?.identifiedTitle || "Chapter"}`;

          const prompt = `You are a strict quiz grader. Evaluate the student's answer for correctness.

Question: ${question.question}
Correct Answer: ${question.correctAnswer}
Student's Answer: ${args.answer}
Chapter Context: ${chapterContext}

Instructions:
- Determine if the student's answer is correct or incorrect.
- Be strict but allow reasonable variations in wording.
- Respond with ONLY JSON: {"correct": boolean, "reason": "brief explanation"}`;

          const response = await openRouterChat({
            apiKey,
            model: QUIZ_GRADING_MODEL,
            messages: [
              { role: "system", content: "You are a quiz grader. Respond only with valid JSON." },
              { role: "user", content: prompt },
            ],
            maxTokens: 200,
            temperature: 0,
          });

          const content = response?.choices?.[0]?.message?.content;
          const parsed = content ? safeParseJson(content) : null;
          isCorrect = parsed?.correct === true;
          pointsEarned = isCorrect ? XP_PER_CORRECT : XP_PER_WRONG;
          feedback = typeof parsed?.reason === "string" ? parsed.reason : question.explanation;
        } catch (error) {
          // Fallback to simple string matching.
          console.error("AI grading failed, using fallback:", error);
          isCorrect = normalize(question.correctAnswer) === normalize(args.answer);
          pointsEarned = isCorrect ? XP_PER_CORRECT : XP_PER_WRONG;
          feedback = question.explanation;
        }
      }
    }

    // Record answer with immediate grading.
    await ctx.db.insert("quizAnswers", {
      attemptId: args.attemptId,
      questionId: args.questionId,
      userAnswer: args.answer,
      isCorrect,
      pointsEarned,
      timeSpent: args.timeSpent,
      feedback,
      gradedAt: Date.now(),
    });

    return {
      correct: isCorrect,
      pointsEarned,
      explanation: feedback ?? question.explanation,
    };
  }
});

// Internal query to get quiz attempt data for completion
export const getQuizAttemptDataInternal = internalQuery({
  args: { attemptId: v.id("quizAttempts") },
  returns: v.object({
    attempt: v.object({
      _id: v.id("quizAttempts"),
      userId: v.id("users"),
      quizId: v.id("quizzes"),
      completedAt: v.optional(v.number()),
    }),
    answers: v.array(v.object({
      _id: v.id("quizAnswers"),
      questionId: v.id("quizQuestions"),
      userAnswer: v.string(),
      isCorrect: v.boolean(),
      pointsEarned: v.number(),
      timeSpent: v.optional(v.number()),
      feedback: v.optional(v.string()),
    })),
    quiz: v.object({
      _id: v.id("quizzes"),
      chapterId: v.id("chapters"),
      passingScore: v.number(),
    }),
    questions: v.array(v.object({
      _id: v.id("quizQuestions"),
      question: v.string(),
      type: v.string(),
      correctAnswer: v.string(),
      points: v.number(),
    })),
    chapter: v.object({
      _id: v.id("chapters"),
      identifiedTitle: v.optional(v.string()),
      grade: v.string(),
      subject: v.string(), // from book
    }),
  }),
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) throw new Error("Attempt not found");

    const answers = await ctx.db
      .query("quizAnswers")
      .withIndex("by_attempt", (q) => q.eq("attemptId", args.attemptId))
      .collect();

    const quiz = await ctx.db.get(attempt.quizId);
    if (!quiz) throw new Error("Quiz not found");

    const questions = await ctx.db
      .query("quizQuestions")
      .withIndex("by_quiz", (q) => q.eq("quizId", quiz._id))
      .collect();

    const chapter = await ctx.db.get(quiz.chapterId);
    if (!chapter) throw new Error("Chapter not found");

    const book = await ctx.db
      .query("books")
      .withIndex("by_path", (q) => q.eq("path", chapter.bookPath))
      .unique();

    return {
      attempt: {
        _id: attempt._id,
        userId: attempt.userId,
        quizId: attempt.quizId,
        completedAt: attempt.completedAt,
      },
      answers: answers.map(a => ({
        _id: a._id,
        questionId: a.questionId,
        userAnswer: a.userAnswer,
        isCorrect: a.isCorrect,
        pointsEarned: a.pointsEarned,
        timeSpent: a.timeSpent,
        feedback: (a as any).feedback,
      })),
      quiz: {
        _id: quiz._id,
        chapterId: quiz.chapterId,
        passingScore: quiz.passingScore,
      },
      questions: questions.map(q => ({
        _id: q._id,
        question: q.question,
        type: q.type,
        correctAnswer: q.correctAnswer,
        points: q.points,
      })),
      chapter: {
        _id: chapter._id,
        identifiedTitle: chapter.identifiedTitle,
        grade: chapter.grade,
        subject: book?.subject || "Unknown",
      },
    };
  }
});

// Internal mutation to update quiz answers with AI grading
export const updateQuizAnswersInternal = internalMutation({
  args: {
    answers: v.array(v.object({
      answerId: v.id("quizAnswers"),
      isCorrect: v.boolean(),
      pointsEarned: v.number(),
    }))
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const answer of args.answers) {
      await ctx.db.patch(answer.answerId, {
        isCorrect: answer.isCorrect,
        pointsEarned: answer.pointsEarned,
      });
    }
  }
});

// Internal mutation to update quiz attempt and progress
export const updateQuizAttemptInternal = internalMutation({
  args: {
    attemptId: v.id("quizAttempts"),
    score: v.number(),
    totalPoints: v.number(),
    earnedPoints: v.number(),
    passed: v.boolean(),
    timeSpent: v.number(),
    userId: v.id("users"),
    xpEarned: v.number()
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Update attempt
    await ctx.db.patch(args.attemptId, {
      completedAt: Date.now(),
      score: args.score,
      totalPoints: args.totalPoints,
      earnedPoints: args.earnedPoints,
      passed: args.passed,
      timeSpent: args.timeSpent
    });

    // Update user progress
    const userProgress = await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (userProgress) {
      await ctx.db.patch(userProgress._id, {
        totalXP: userProgress.totalXP + args.xpEarned,
        quizzesPassed: userProgress.quizzesPassed + (args.passed ? 1 : 0),
        lastActivity: Date.now(),
      });
    } else {
      await ctx.db.insert("userProgress", {
        userId: args.userId,
        totalXP: args.xpEarned,
        booksCompleted: 0,
        chaptersCompleted: 0,
        quizzesPassed: args.passed ? 1 : 0,
        currentStreak: 1,
        longestStreak: 1,
        lastActivity: Date.now(),
      });
    }
  }
});

// Complete quiz attempt
export const completeQuizAttempt = action({
  args: { attemptId: v.id("quizAttempts") },
  returns: v.object({
    score: v.number(), // percentage
    passed: v.boolean(),
    xpEarned: v.number(),
    totalPoints: v.number(),
    earnedPoints: v.number(),
    chapterId: v.id("chapters")
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get attempt data
    const data: any = await ctx.runQuery(internal.quizzes.getQuizAttemptDataInternal, { attemptId: args.attemptId });

    if (data.attempt.userId !== userId) {
      throw new Error("Invalid attempt");
    }

    if (data.attempt.completedAt) {
      throw new Error("Attempt already completed");
    }

    if (data.answers.length !== data.questions.length) {
      throw new Error("Not all questions answered");
    }

    // Answers are graded at submission time.
    const correctCount = data.answers.filter((a: any) => a.isCorrect === true).length;

    // Calculate scores
    const totalPoints: number = data.questions.length * XP_PER_CORRECT;
    const earnedPoints: number = data.answers.reduce((sum: number, a: any) => sum + (a.pointsEarned ?? 0), 0);
    const score: number = data.questions.length > 0 ? (correctCount / data.questions.length) * 100 : 0;
    const passed: boolean = score >= data.quiz.passingScore;

    // Calculate time spent
    const timeSpent: number = data.answers.reduce((sum: number, a: any) => sum + (a.timeSpent || 0), 0);

    // Update attempt and progress
    await ctx.runMutation(internal.quizzes.updateQuizAttemptInternal, {
      attemptId: args.attemptId,
      score,
      totalPoints,
      earnedPoints,
      passed,
      timeSpent,
      userId: data.attempt.userId,
      xpEarned: earnedPoints
    });

    return {
      score,
      passed,
      xpEarned: earnedPoints,
      totalPoints,
      earnedPoints,
      chapterId: data.quiz.chapterId
    };
  }
});

// Get quiz by chapter
export const getQuizByChapter = query({
  args: { chapterId: v.id("chapters") },
  returns: v.object({
    quiz: v.optional(v.object({
      _creationTime: v.number(),
      _id: v.id("quizzes"),
      chapterId: v.id("chapters"),
      title: v.string(),
      description: v.optional(v.string()),
      passingScore: v.number(),
      timeLimit: v.optional(v.number()),
      maxAttempts: v.optional(v.number())
    }))
  }),
  handler: async (ctx, args) => {
    const quiz = await ctx.db
      .query("quizzes")
      .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
      .unique();

    return { quiz: quiz || undefined };
  }
});

// Get quiz results
export const getQuizResults = query({
  args: { quizId: v.id("quizzes") },
  returns: v.object({
    bestScore: v.number(),
    attempts: v.array(v.object({
      attemptNumber: v.number(),
      score: v.number(),
      passed: v.boolean(),
      completedAt: v.number(),
      timeSpent: v.number()
    }))
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const attempts = await ctx.db
      .query("quizAttempts")
      .withIndex("by_user_quiz", (q) => q.eq("userId", userId).eq("quizId", args.quizId))
      .collect();

    const completedAttempts = attempts
      .filter(a => a.completedAt)
      .map(a => ({
        attemptNumber: a.attemptNumber,
        score: a.score || 0,
        passed: a.passed || false,
        completedAt: a.completedAt!,
        timeSpent: a.timeSpent || 0
      }))
      .sort((a, b) => b.completedAt - a.completedAt);

    const bestScore = completedAttempts.length > 0 ? Math.max(...completedAttempts.map(a => a.score)) : 0;

    return {
      bestScore,
      attempts: completedAttempts
    };
  }
});