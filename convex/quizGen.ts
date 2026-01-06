"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

const QUIZ_GEN_MODEL = "mistralai/devstral-2512:free";

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

    // Pull previously extracted per-page chapter text (generated via Qwen-VL from page images).
    const extracted: { text: string } = await ctx.runQuery(internal.chapterText.getChapterTextForQuiz, {
      chapterId: args.chapterId,
      maxChars: 30000,
    });

    const chapterText = (extracted?.text ?? "").trim();
    if (chapterText.length < 500) {
      throw new Error(
        "Chapter text is not prepared yet. Open the PDF and wait for page text extraction to finish, then generate the quiz again."
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OpenRouter API key is not configured");

    const prompt = `Return ONLY valid JSON (no markdown/code fences/commentary). Output MUST be compact/minified.

JSON shape:
{"title":string,"description":string,"passingScore":number,"questions":[{"type":"multiple_choice"|"true_false"|"short_answer","question":string,"options"?:[string,string,string,string],"correctAnswer":string,"explanation":string}]}

Rules:
- Exactly 20 questions: 10 multiple_choice, 5 true_false, 5 short_answer.
- Multiple choice: exactly 4 short options.
- True/False: omit options; correctAnswer must be exactly "True" or "False".
- Short answer: omit options; correctAnswer concise.
- explanation may be "" (empty) or <= 80 chars.
- Do NOT repeat keys (e.g. do not include passingScore twice).
- Strictly grounded in CHAPTER TEXT.

CHAPTER META: ${chapter.pdfPath} | Grade ${chapter.grade} | ${book.subject}

CHAPTER TEXT:
${chapterText}`;

    const response = await openRouterChat({
      apiKey,
      model: QUIZ_GEN_MODEL,
      messages: [
        { role: "system", content: "You are a quiz generator. Return only valid JSON." },
        { role: "user", content: prompt },
      ],
      // Headroom + compact output reduces truncation into invalid JSON.
      maxTokens: 4200,
      temperature: 0,
      responseFormat: { type: "json_schema", json_schema: QUIZ_JSON_SCHEMA },
    });

    const content: string = response?.choices?.[0]?.message?.content ?? "";
    let parsed = parseModelQuizPayload(content);

    // One repair attempt if the model returned extra text / invalid JSON.
    if (!parsed || !Array.isArray(parsed.questions)) {
      console.warn(
        "[quizGen] Model did not return valid JSON on first attempt. Retrying with repair prompt.",
        { preview: String(content).slice(0, 400) }
      );

      const repair = await openRouterChat({
        apiKey,
        model: QUIZ_GEN_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You will be given a malformed or non-JSON response. Convert it to ONLY valid JSON that matches the required schema. Output JSON only.",
          },
          {
            role: "user",
            content:
              `Convert the following into valid JSON ONLY (no markdown, no commentary). Required shape is the same as before.\n\nRAW:\n${content}`,
          },
        ],
        maxTokens: 4200,
        temperature: 0,
        responseFormat: { type: "json_schema", json_schema: QUIZ_JSON_SCHEMA },
      });

      const repairedContent: string = repair?.choices?.[0]?.message?.content ?? "";
      parsed = parseModelQuizPayload(repairedContent);
    }

    // Final strict retry: regenerate from scratch but keep the output compact.
    if (!parsed || !Array.isArray(parsed.questions)) {
      console.warn("[quizGen] JSON repair failed; retrying with strict compact prompt.");

      const strictPrompt = `Return ONLY valid minified JSON. Start with { and end with }. No other characters.

Template (fill values, keep keys exactly once):
{"title":"...","description":"...","passingScore":70,"questions":[{"type":"multiple_choice","question":"...","options":["A","B","C","D"],"correctAnswer":"A","explanation":""}]}

Rules:
- Exactly 20 questions: 10 multiple_choice, 5 true_false, 5 short_answer.
- explanation must be "" unless <= 80 chars.
- No duplicate keys.
- Strictly grounded in CHAPTER TEXT.

CHAPTER TEXT:
${chapterText}`;

      const strict = await openRouterChat({
        apiKey,
        model: QUIZ_GEN_MODEL,
        messages: [
          { role: "system", content: "Return only valid JSON. No extra text." },
          { role: "user", content: strictPrompt },
        ],
        maxTokens: 4200,
        temperature: 0,
        responseFormat: { type: "json_schema", json_schema: QUIZ_JSON_SCHEMA },
      });

      const strictContent: string = strict?.choices?.[0]?.message?.content ?? "";
      parsed = parseModelQuizPayload(strictContent);
    }

    if (!parsed || !Array.isArray(parsed.questions)) {
      throw new Error("Quiz generation failed: model did not return valid JSON");
    }

    const normalizedQuestions = parsed.questions
      .slice(0, 30)
      .map((q: any) => {
        const type = String(q.type ?? "").trim();
        const question = String(q.question ?? "").trim();
        const correctAnswerRaw = String(q.correctAnswer ?? "").trim();
        const explanation = String(q.explanation ?? "").trim();

        if (!question) return null;

        if (type === "multiple_choice") {
          const opts = Array.isArray(q.options) ? q.options.map((o: any) => String(o).trim()).slice(0, 4) : [];
          if (opts.length !== 4) return null;
          if (!correctAnswerRaw || !opts.includes(correctAnswerRaw)) return null;
          return {
            question,
            type: "multiple_choice" as const,
            options: opts as [string, string, string, string],
            correctAnswer: correctAnswerRaw,
            explanation: explanation || "",
            points: 100,
          };
        }

        if (type === "true_false") {
          const lc = correctAnswerRaw.toLowerCase();
          const ca = lc === "true" ? "True" : lc === "false" ? "False" : "";
          if (!ca) return null;
          return {
            question,
            type: "true_false" as const,
            options: undefined,
            correctAnswer: ca,
            explanation: explanation || "",
            points: 100,
          };
        }

        if (type === "short_answer") {
          if (!correctAnswerRaw) return null;
          return {
            question,
            type: "short_answer" as const,
            options: undefined,
            correctAnswer: correctAnswerRaw,
            explanation: explanation || "",
            points: 100,
          };
        }

        return null;
      })
      .filter(Boolean) as Array<any>;

    const validQuestions = normalizedQuestions.filter((q: any) => {
      if (!q.question || !q.correctAnswer) return false;
      if (q.type === "multiple_choice") {
        if (!Array.isArray(q.options) || q.options.length !== 4) return false;
        const match = q.options.find((o: string) => String(o).trim() === q.correctAnswer);
        if (!match) {
          q.correctAnswer = q.options[0];
        }
      }
      if (q.type === "true_false") {
        if (q.correctAnswer !== "True" && q.correctAnswer !== "False") return false;
      }
      return true;
    });

    if (validQuestions.length < 20) {
      throw new Error("Quiz generation failed: expected 20-30 valid questions");
    }

    const fixedQuestions = validQuestions.slice(0, 30);

    const created: { quizId: Id<"quizzes"> } = await ctx.runMutation(
      internal.quizzes.createGeneratedQuizInternal,
      {
      chapterId: args.chapterId,
      title: String(parsed.title ?? basename(chapter.pdfPath)).slice(0, 120),
      description: String(parsed.description ?? "Generated quiz").slice(0, 240),
      passingScore: Number.isFinite(parsed.passingScore) ? Number(parsed.passingScore) : 60,
      timeLimit: undefined,
      maxAttempts: undefined,
      questions: fixedQuestions,
      }
    );

    return { quizId: created.quizId };
  },
});
