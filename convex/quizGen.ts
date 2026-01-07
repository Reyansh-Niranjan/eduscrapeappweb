"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

const QUIZ_GEN_MODEL = "mistralai/devstral-2512:free";

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
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: any;
}): Promise<any> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://eduscrapeapp.com",
      "X-Title": "EduScrapeApp",
    },
    body: JSON.stringify({
      model: args.model,
      messages: args.messages,
      // Ask for strict JSON (or JSON Schema) when the provider/model supports it.
      response_format: args.responseFormat ?? { type: "json_object" },
      max_tokens: args.maxTokens ?? 1200,
      temperature: args.temperature ?? 0.2,
    }),
  });

  const textBody = await response.text();
  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} ${textBody}`);
  }
  return JSON.parse(textBody);
}

export const generateQuizForChapter = action({
  args: { chapterId: v.id("chapters") },
  returns: v.object({ quizId: v.id("quizzes") }),
  handler: async (ctx, args): Promise<{ quizId: Id<"quizzes"> }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // If a quiz already exists, reuse it.
    const existing: any = await ctx.runQuery(api.quizzes.getQuizByChapter, { chapterId: args.chapterId });
    if (existing?.quiz?._id) return { quizId: existing.quiz._id };

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
      multiple_choice: 10,
      true_false: 5,
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

    Difficulty:
    - Make questions twisted/tricky and difficult for students (NEET/JEE exam-style).
    - Use plausible distractors that reflect common misconceptions.
    - Prefer multi-step reasoning or cross-linking two facts/definitions from the page.
    - Do NOT copy any real NEET/JEE questions verbatim; write ORIGINAL questions inspired by that style.
    - Still ensure every answer is supported by the PAGE TEXT (no outside knowledge required).

CHAPTER META: ${chapter.pdfPath} | Grade ${chapter.grade} | ${book.subject}
PAGE: ${pageNumber}

PAGE TEXT:
${clampText(pageText, 3500)}`;

      const response = await openRouterChat({
        apiKey,
        model: QUIZ_GEN_MODEL,
        messages: [
          { role: "system", content: "You generate difficult, tricky exam-style questions. Output JSON only." },
          { role: "user", content: prompt },
        ],
        maxTokens: 1400,
        temperature: 0,
        responseFormat: { type: "json_object" },
      });

      const content: string = response?.choices?.[0]?.message?.content ?? "";
      const parsed = parseCandidatePayload(content);
      const qs = Array.isArray(parsed?.questions) ? parsed.questions : [];
      return qs.map(normalizeCandidate).filter(Boolean) as QuizQuestionCandidate[];
    };

    // Pass 1: sweep pages and generate small batches per page.
    for (const page of pages) {
      const needNow = getNeed();
      if (needNow.multiple_choice + needNow.true_false + needNow.short_answer === 0) break;

      const plannedTypes = pickTypesForPage({ ...needNow }, 2);
      if (!page?.content) continue;

      try {
        const generated = await generateForPage(page.pageNumber, String(page.content), plannedTypes);
        for (const q of generated) {
          candidates.push(q);
        }
      } catch (e) {
        console.warn("[quizGen] page-by-page generation failed", { pageNumber: page.pageNumber, error: String(e) });
      }

      // Stop early if we already have plenty.
      if (candidates.length >= 60) break;
    }

    // Pass 2: targeted top-up for missing types (still page-by-page).
    let need = getNeed();
    if (need.multiple_choice + need.true_false + need.short_answer > 0) {
      for (const page of pages) {
        need = getNeed();
        if (need.multiple_choice + need.true_false + need.short_answer === 0) break;
        if (!page?.content) continue;

        const plannedTypes = pickTypesForPage({ ...need }, 2);
        try {
          const generated = await generateForPage(page.pageNumber, String(page.content), plannedTypes);
          for (const q of generated) {
            candidates.push(q);
          }
        } catch {
          // ignore and continue
        }
      }
    }

    const byType = {
      multiple_choice: candidates.filter((c) => c.type === "multiple_choice"),
      true_false: candidates.filter((c) => c.type === "true_false"),
      short_answer: candidates.filter((c) => c.type === "short_answer"),
    };

    if (
      byType.multiple_choice.length < targets.multiple_choice ||
      byType.true_false.length < targets.true_false ||
      byType.short_answer.length < targets.short_answer
    ) {
      throw new Error("Quiz generation failed: not enough page-by-page questions generated yet");
    }

    const fixedQuestions = (
      [
        ...byType.multiple_choice.slice(0, targets.multiple_choice),
        ...byType.true_false.slice(0, targets.true_false),
        ...byType.short_answer.slice(0, targets.short_answer),
      ]
        // Attach points and ensure shape matches DB mutation.
        .map((q) => ({
          question: q.question,
          type: q.type,
          options: q.type === "multiple_choice" ? q.options : undefined,
          correctAnswer: q.correctAnswer,
          explanation: clampText(q.explanation || "", 80),
          points: 100,
        }))
    );

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
