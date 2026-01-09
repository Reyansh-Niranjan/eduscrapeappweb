"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

const DEFAULT_QUIZ_MODELS = [
  "mistralai/devstral-2512:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
];

function getQuizGenModels(): string[] {
  const raw = process.env.OPENROUTER_QUIZ_MODELS;
  if (raw) {
    return raw.split(/[\n,]/g).map((s) => s.trim()).filter(Boolean);
  }
  return DEFAULT_QUIZ_MODELS;
}

type QuizQuestionCandidate = {
  question: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  options?: [string, string, string, string];
  correctAnswer: string;
  explanation: string;
};

const QUIZ_JSON_SCHEMA = {
  name: "chapter_quiz_v1",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "description", "passingScore", "questions"],
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      passingScore: { type: "number" },
      questions: {
        type: "array",
        minItems: 20,
        maxItems: 20,
        items: {
          oneOf: [
            {
              type: "object",
              additionalProperties: false,
              required: ["type", "question", "options", "correctAnswer", "explanation"],
              properties: {
                type: { const: "multiple_choice" },
                question: { type: "string" },
                options: {
                  type: "array",
                  minItems: 4,
                  maxItems: 4,
                  items: { type: "string" },
                },
                correctAnswer: { type: "string" },
                explanation: { type: "string" },
              },
            },
            {
              type: "object",
              additionalProperties: false,
              required: ["type", "question", "correctAnswer", "explanation"],
              properties: {
                type: { const: "true_false" },
                question: { type: "string" },
                correctAnswer: { enum: ["True", "False"] },
                explanation: { type: "string" },
              },
            },
            {
              type: "object",
              additionalProperties: false,
              required: ["type", "question", "correctAnswer", "explanation"],
              properties: {
                type: { const: "short_answer" },
                question: { type: "string" },
                correctAnswer: { type: "string" },
                explanation: { type: "string" },
              },
            },
          ],
        },
      },
    },
  },
} as const;

function safeParseJson(input: string): any {
  try {
    return JSON.parse(input);
  } catch {
    // Try a light repair pass (common model issue: trailing commas).
    try {
      const repaired = input.replace(/,\s*([}\]])/g, "$1");
      return JSON.parse(repaired);
    } catch {
      return null;
    }
  }
}

function stripMarkdownCodeFences(input: string): string {
  const trimmed = input.trim();
  // ```json\n{...}\n``` or ```\n{...}\n```
  if (trimmed.startsWith("```")) {
    const withoutStart = trimmed.replace(/^```[a-zA-Z0-9_-]*\s*/m, "");
    return withoutStart.replace(/```\s*$/m, "").trim();
  }
  return trimmed;
}

function extractFirstJsonObject(input: string): string | null {
  const text = stripMarkdownCodeFences(input);

  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return text.slice(first, last + 1);
}

function normalizeJsonLikeText(input: string): string {
  // Replace common “smart quotes” that can appear in model output.
  return input
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
}

function parseModelQuizPayload(rawContent: string): any {
  const direct = safeParseJson(normalizeJsonLikeText(stripMarkdownCodeFences(rawContent)));
  if (direct) return direct;

  const extracted = extractFirstJsonObject(rawContent);
  if (!extracted) return null;
  return safeParseJson(normalizeJsonLikeText(extracted));
}

function clampText(input: string, maxChars: number): string {
  const normalized = String(input ?? "").trim();
  if (normalized.length <= maxChars) return normalized;
  return normalized.slice(0, maxChars);
}

function parseCandidatePayload(rawContent: string): any {
  const direct = safeParseJson(normalizeJsonLikeText(stripMarkdownCodeFences(rawContent)));
  if (direct) return direct;

  const extracted = extractFirstJsonObject(rawContent);
  if (!extracted) return null;
  return safeParseJson(normalizeJsonLikeText(extracted));
}

function normalizeCandidate(q: any): QuizQuestionCandidate | null {
  const type = String(q?.type ?? "").trim();
  const question = String(q?.question ?? "").trim();
  const correctAnswerRaw = String(q?.correctAnswer ?? "").trim();
  const explanation = String(q?.explanation ?? "").trim();

  if (!question) return null;

  if (type === "multiple_choice") {
    const opts = Array.isArray(q?.options)
      ? q.options.map((o: any) => String(o).trim()).filter(Boolean).slice(0, 4)
      : [];
    if (opts.length !== 4) return null;
    if (!correctAnswerRaw || !opts.includes(correctAnswerRaw)) return null;
    return {
      question,
      type: "multiple_choice",
      options: opts as [string, string, string, string],
      correctAnswer: correctAnswerRaw,
      explanation: explanation || "",
    };
  }

  if (type === "true_false") {
    const lc = correctAnswerRaw.toLowerCase();
    const ca = lc === "true" ? "True" : lc === "false" ? "False" : "";
    if (!ca) return null;
    return {
      question,
      type: "true_false",
      correctAnswer: ca,
      explanation: explanation || "",
    };
  }

  if (type === "short_answer") {
    if (!correctAnswerRaw) return null;
    return {
      question,
      type: "short_answer",
      correctAnswer: correctAnswerRaw,
      explanation: explanation || "",
    };
  }

  return null;
}

function pickTypesForPage(need: Record<QuizQuestionCandidate["type"], number>, count: number): QuizQuestionCandidate["type"][] {
  const types: QuizQuestionCandidate["type"][] = [];
  const order: QuizQuestionCandidate["type"][] = ["multiple_choice", "true_false", "short_answer"];
  for (let i = 0; i < count; i++) {
    const next = order
      .filter((t) => need[t] > 0)
      .sort((a, b) => need[b] - need[a])[0];
    types.push(next ?? "multiple_choice");
    if (next) need[next] = Math.max(0, need[next] - 1);
  }
  return types;
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function basename(value: string): string {
  const unified = normalizePath(value);
  const parts = unified.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? unified;
}

async function openRouterChat(args: {
  apiKey: string;
  models: string[];
  messages: Array<{ role: "system" | "user"; content: string }>;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: any;
}): Promise<any> {
  const maxAttempts = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const isFallback = args.models.length > 1;
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${args.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://eduscrapeapp.com",
          "X-Title": "EduScrapeApp",
        },
        body: JSON.stringify({
          ...(isFallback ? { models: args.models, route: "fallback" } : { model: args.models[0] }),
          messages: args.messages,
          response_format: args.responseFormat, // remove default json_object if not provided
          max_tokens: args.maxTokens ?? 1200,
          temperature: args.temperature ?? 0.2,
        }),
      });

      const textBody = await response.text();
      if (!response.ok) {
        const errorText = `OpenRouter API error: ${response.status} ${response.statusText} ${textBody}`;
        lastError = new Error(errorText);

        if (response.status === 429) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        console.error("[quizGen] OpenRouter call failed:", errorText);
        throw lastError;
      }
      return JSON.parse(textBody);
    } catch (e) {
      lastError = e;
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw lastError ?? new Error("Failed after max attempts");
}

export const generateQuizForChapter = action({
  args: { chapterId: v.id("chapters") },
  returns: v.object({ quizId: v.id("quizzes") }),
  handler: async (ctx, args): Promise<{ quizId: Id<"quizzes"> }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // If a quiz already exists, reuse it.
    const existing: any = await ctx.runQuery(api.quizzes.getQuizByChapter, { chapterId: args.chapterId });
    if (existing?.quiz?._id) {
      const count = await ctx.runQuery(internal.quizzes.getQuizQuestionCountInternal, { chapterId: args.chapterId });
      if (count >= 20) return { quizId: existing.quiz._id };

      // Too few questions, clear it to allow fresh generation
      await ctx.runMutation(internal.quizzes.deleteQuizInternal, { chapterId: args.chapterId });
    }

    const { chapter, book } = await ctx.runQuery(api.progress.getChapterWithBook, { chapterId: args.chapterId });
    if (!chapter) throw new Error("Chapter not found");
    if (!book) throw new Error("Book record not found for chapter");

    // Pull previously extracted per-page chapter text.
    const extracted = await ctx.runQuery(internal.chapterText.getChapterPageTextsForQuiz, {
      chapterId: args.chapterId,
      maxPages: 2000,
      maxCharsPerPage: 3500,
    });

    const pages = extracted?.pages ?? [];
    const totalChars = pages.reduce((sum: number, p: any) => sum + String(p?.content ?? "").length, 0);
    if (totalChars < 500 || pages.length === 0) {
      throw new Error(
        "Chapter text is not prepared yet. Open the PDF and wait for page text extraction to finish, then generate the quiz again."
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OpenRouter API key is not configured");

    const targets: Record<QuizQuestionCandidate["type"], number> = {
      multiple_choice: 15,
      true_false: 10,
      short_answer: 5,
    };

    const candidates: QuizQuestionCandidate[] = [];

    const getNeed = () => {
      const counts: Record<QuizQuestionCandidate["type"], number> = {
        multiple_choice: 0,
        true_false: 0,
        short_answer: 0,
      };
      for (const c of candidates) counts[c.type] += 1;
      return {
        multiple_choice: Math.max(0, targets.multiple_choice - counts.multiple_choice),
        true_false: Math.max(0, targets.true_false - counts.true_false),
        short_answer: Math.max(0, targets.short_answer - counts.short_answer),
      };
    };

    const generateForPage = async (pageNumber: number, pageText: string, types: QuizQuestionCandidate["type"][]) => {
      const wants = types.reduce((acc: Record<string, number>, t) => {
        acc[t] = (acc[t] ?? 0) + 1;
        return acc;
      }, {});

      const prompt = `Return ONLY valid JSON (no markdown, no commentary).

Shape:
{"questions":[{"type":"multiple_choice"|"true_false"|"short_answer","question":string,"options"?:[string,string,string,string],"correctAnswer":string,"explanation":string}]}

Rules:
- Generate EXACTLY ${types.length} questions.
- Required counts by type: ${JSON.stringify(wants)}
- multiple_choice must have exactly 4 short options and correctAnswer must match one option.
- true_false correctAnswer must be exactly "True" or "False".
- explanation must be "" unless <= 80 chars.
- Strictly grounded in the PAGE TEXT only.
- NEVER use or refer to questions that may already exist in the textbook page.
- Do NOT generate questions like "What is the answer to question 5?" - instead, turn the content into original questions.
- CRITICAL: NEVER refer to diagrams, figures, images, or "what you see" on the page. 
- AVOID phrases like "In the diagram...", "As shown in the figure...", "Look at the image...", or "The picture illustrates...". 
- Questions must be text-only and stand alone without needing to see the original textbook layout or visuals.

    Difficulty:
    - Make questions twisted/tricky and difficult for students (NEET/JEE exam-style).
    - Use plausible distractors that reflect common misconceptions.
    - Prefer multi-step reasoning or cross-linking two facts/definitions from the page.
    - Do NOT copy any real NEET/JEE questions verbatim; write ORIGINAL questions inspired by that style.
    - Ensure every question is unique and independent.
    - Still ensure every answer is supported by the PAGE TEXT (no outside knowledge required).

CHAPTER META: ${chapter.pdfPath} | Grade ${chapter.grade} | ${book.subject}
PAGE: ${pageNumber}

PAGE TEXT:
${clampText(pageText, 3500)}`;

      const response = await openRouterChat({
        apiKey,
        models: getQuizGenModels(),
        messages: [
          { role: "system", content: "You generate difficult, tricky exam-style questions. Output JSON ONLY." },
          { role: "user", content: prompt },
        ],
        maxTokens: 1400,
        temperature: 0.1,
        responseFormat: { type: "json_object" },
      });

      const content: string = response?.choices?.[0]?.message?.content ?? "";
      const parsed = parseCandidatePayload(content);
      const qs = Array.isArray(parsed?.questions) ? parsed.questions : [];
      const valid = qs.map(normalizeCandidate).filter(Boolean) as QuizQuestionCandidate[];
      if (valid.length < types.length) {
        console.warn(`[quizGen] Page ${pageNumber}: Only ${valid.length}/${types.length} questions were valid. Model: ${response?.model}`);
      }
      return valid;
    };

    const totalPages = pages.length;
    // Calculate how many questions to ask for per page to hit our goal of 30+.
    // We aim for 45 potential candidates to pick the best 30.
    const questionsNeeded = 45;
    const perPage = Math.max(3, Math.ceil(questionsNeeded / Math.max(1, totalPages)));
    const batchSize = Math.min(10, perPage);

    // Pass 1: sweep pages and generate batches per page.
    for (const page of pages) {
      const needNow = getNeed();
      if (needNow.multiple_choice + needNow.true_false + needNow.short_answer === 0) break;

      const plannedTypes = pickTypesForPage({ ...needNow }, batchSize);
      if (!page?.content) continue;

      try {
        const generated = await generateForPage(page.pageNumber, String(page.content), plannedTypes);
        for (const q of generated) {
          // Dedupe by question text
          if (!candidates.find(c => c.question === q.question)) {
            candidates.push(q);
          }
        }
      } catch (e) {
        console.warn("[quizGen] page-by-page generation failed", { pageNumber: page.pageNumber, error: String(e) });
      }

      // Stop early if we have reached our total target of 30.
      if (candidates.length >= 30) break;
    }

    // Pass 2: targeted top-up for missing types if still short.
    let need = getNeed();
    if (need.multiple_choice + need.true_false + need.short_answer > 0) {
      console.log(`[quizGen] Pass 1 only got ${candidates.length} questions. Starting Pass 2...`);
      for (const page of pages) {
        need = getNeed();
        if (need.multiple_choice + need.true_false + need.short_answer === 0) break;
        if (!page?.content) continue;

        const plannedTypes = pickTypesForPage({ ...need }, 5);
        try {
          const generated = await generateForPage(page.pageNumber, String(page.content), plannedTypes);
          for (const q of generated) {
            // Dedupe by question text
            if (!candidates.find(c => c.question === q.question)) {
              candidates.push(q);
            }
          }
        } catch {
          // ignore and continue
        }
        if (candidates.length >= 35) break;
      }
    }

    const byType = {
      multiple_choice: candidates.filter((c) => c.type === "multiple_choice"),
      true_false: candidates.filter((c) => c.type === "true_false"),
      short_answer: candidates.filter((c) => c.type === "short_answer"),
    };

    let sortedCandidates = [
      ...byType.multiple_choice.slice(0, targets.multiple_choice),
      ...byType.true_false.slice(0, targets.true_false),
      ...byType.short_answer.slice(0, targets.short_answer),
    ];

    // Safety net: if we are still short of 20 (e.g. model failed to give enough of one type),
    // fill with ANY other valid unique questions we have.
    if (sortedCandidates.length < 20 && candidates.length >= 20) {
      const alreadyUsed = new Set(sortedCandidates.map(c => c.question));
      const extras = candidates.filter(c => !alreadyUsed.has(c.question));
      const needed = 20 - sortedCandidates.length;
      sortedCandidates = [...sortedCandidates, ...extras.slice(0, needed)];
    }

    const totalGenerated = sortedCandidates.length;
    if (totalGenerated < 20) {
      throw new Error(`Quiz generation failed: only ${totalGenerated} questions were generated, which is not enough (minimum 20 requested). Please ensure the chapter text is fully extracted and try again.`);
    }

    const fixedQuestions = sortedCandidates
      // Attach points and ensure shape matches DB mutation.
      .map((q) => ({
        question: q.question,
        type: q.type,
        options: q.type === "multiple_choice" ? q.options : undefined,
        correctAnswer: q.correctAnswer,
        explanation: clampText(q.explanation || "", 80),
        points: 100,
      }));

    const created: { quizId: Id<"quizzes"> } = await ctx.runMutation(
      internal.quizzes.createGeneratedQuizInternal,
      {
        chapterId: args.chapterId,
        title: String(chapter.identifiedTitle ?? basename(chapter.pdfPath)).slice(0, 120),
        description: "Generated quiz (page-by-page)",
        passingScore: 70,
        timeLimit: undefined,
        maxAttempts: undefined,
        questions: fixedQuestions,
      }
    );

    return { quizId: created.quizId };
  },
});
