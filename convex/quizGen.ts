"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import JSZip from "jszip";
import type { Id } from "./_generated/dataModel";

const QUIZ_GEN_MODEL = "mistralai/devstral-2512:free";

let pdfiumModulePromise: Promise<any> | null = null;
let pdfiumLibraryInitialized = false;

async function getPdfiumModule(): Promise<any> {
  if (!pdfiumModulePromise) {
    pdfiumModulePromise = (async () => {
      const imported: any = await import("pdfium-wasm");
      const pdfium: any = imported?.default ?? imported;

      if (pdfium?.calledRun) return pdfium;

      await new Promise<void>((resolve) => {
        const prev = pdfium.onRuntimeInitialized;
        pdfium.onRuntimeInitialized = () => {
          try {
            if (typeof prev === "function") prev();
          } finally {
            resolve();
          }
        };

        if (pdfium?.calledRun) resolve();
      });

      return pdfium;
    })();
  }
  return pdfiumModulePromise;
}

function safeParseJson(input: string): any {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function basename(value: string): string {
  const unified = normalizePath(value);
  const parts = unified.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? unified;
}

async function extractPdfTextSnippet(pdfBuffer: Buffer, maxPages: number): Promise<string> {
  const pdfium = await getPdfiumModule();
  const cwrap = pdfium.cwrap.bind(pdfium);

  const FPDF_InitLibrary = cwrap("FPDF_InitLibrary", null, []);
  const createDocFromBuffer = cwrap("createDocFromBuffer", "number", ["number", "number"]);
  const FPDFAvail_GetDocument = cwrap("FPDFAvail_GetDocument", "number", ["number", "number"]);
  const FPDFAvail_Destroy = cwrap("FPDFAvail_Destroy", null, ["number"]);
  const FPDF_GetPageCount = cwrap("FPDF_GetPageCount", "number", ["number"]);
  const FPDF_LoadPage = cwrap("FPDF_LoadPage", "number", ["number", "number"]);
  const FPDF_ClosePage = cwrap("FPDF_ClosePage", null, ["number"]);
  const FPDF_CloseDocument = cwrap("FPDF_CloseDocument", null, ["number"]);

  const FPDFText_LoadPage = cwrap("FPDFText_LoadPage", "number", ["number"]);
  const FPDFText_ClosePage = cwrap("FPDFText_ClosePage", null, ["number"]);
  const FPDFText_CountChars = cwrap("FPDFText_CountChars", "number", ["number"]);
  const FPDFText_GetText = cwrap("FPDFText_GetText", "number", ["number", "number", "number", "number"]);

  if (!pdfiumLibraryInitialized) {
    FPDF_InitLibrary();
    pdfiumLibraryInitialized = true;
  }

  const wasmPtr = pdfium._malloc(pdfBuffer.length);
  pdfium.HEAPU8.set(pdfBuffer, wasmPtr);

  const pdfAvail = createDocFromBuffer(wasmPtr, pdfBuffer.length);
  const doc = FPDFAvail_GetDocument(pdfAvail, 0);

  let text = "";
  try {
    const pageCount = doc ? FPDF_GetPageCount(doc) : 0;
    const pagesToRead = Math.min(Math.max(0, pageCount), Math.max(1, maxPages));

    for (let i = 0; i < pagesToRead; i++) {
      const page = FPDF_LoadPage(doc, i);
      if (!page) continue;

      try {
        const textPage = FPDFText_LoadPage(page);
        if (!textPage) continue;

        try {
          const count = FPDFText_CountChars(textPage);
          if (!count || count <= 0) continue;

          const bufferLen = (count + 1) * 2;
          const outPtr = pdfium._malloc(bufferLen);
          try {
            const written = FPDFText_GetText(textPage, 0, count, outPtr);
            const bytes = pdfium.HEAPU8.subarray(outPtr, outPtr + written * 2);
            const decoder = new TextDecoder("utf-16le");
            const pageText = decoder.decode(bytes);
            text += `\n\n[Page ${i + 1}]\n${pageText}`;
          } finally {
            pdfium._free(outPtr);
          }
        } finally {
          FPDFText_ClosePage(textPage);
        }
      } finally {
        FPDF_ClosePage(page);
      }

      if (text.length > 15000) break;
    }
  } finally {
    if (doc) FPDF_CloseDocument(doc);
    if (pdfAvail) FPDFAvail_Destroy(pdfAvail);
    pdfium._free(wasmPtr);
  }

  return text.slice(0, 15000);
}

async function openRouterChat(args: {
  apiKey: string;
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
  maxTokens?: number;
  temperature?: number;
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

    const zipUrl = book.url;
    const zipResponse = await fetch(zipUrl);
    if (!zipResponse.ok) throw new Error("Failed to download ZIP for quiz generation");

    const zipBuffer = Buffer.from(await zipResponse.arrayBuffer());
    const zip = await JSZip.loadAsync(zipBuffer);

    const wanted = normalizePath(chapter.pdfPath);
    const wantedBase = basename(wanted).toLowerCase();

    let entry = zip.file(wanted);
    if (!entry) {
      // Fallback: try to find by basename.
      const candidates = Object.keys(zip.files)
        .filter((k) => !zip.files[k]?.dir)
        .filter((k) => k.toLowerCase().endsWith(".pdf"))
        .filter((k) => basename(k).toLowerCase() === wantedBase);
      if (candidates.length > 0) {
        entry = zip.file(candidates[0]) ?? null;
      }
    }

    if (!entry) throw new Error(`PDF not found in ZIP: ${chapter.pdfPath}`);

    const pdfArrayBuffer = await entry.async("arraybuffer");
    const pdfText = await extractPdfTextSnippet(Buffer.from(pdfArrayBuffer), 5);

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OpenRouter API key is not configured");

    const prompt = `Generate a short multiple-choice quiz (8 questions) from the chapter content below.

Return ONLY valid JSON with this shape:
{
  "title": string,
  "description": string,
  "passingScore": number,
  "questions": [
    {
      "question": string,
      "options": [string, string, string, string],
      "correctAnswer": string,
      "explanation": string
    }
  ]
}

Rules:
- Exactly 8 questions.
- 4 options per question.
- correctAnswer must exactly match one of the options.
- Keep questions factual and based on the provided text.

Chapter path: ${chapter.pdfPath}
Grade: ${chapter.grade}

CHAPTER TEXT:
${pdfText || "(No text extracted; generate a simple quiz based on the chapter path and grade.)"}`;

    const response = await openRouterChat({
      apiKey,
      model: QUIZ_GEN_MODEL,
      messages: [
        { role: "system", content: "You are a quiz generator. Return only valid JSON." },
        { role: "user", content: prompt },
      ],
      maxTokens: 1400,
      temperature: 0.2,
    });

    const content: string = response?.choices?.[0]?.message?.content ?? "";
    const parsed = safeParseJson(content);
    if (!parsed || !Array.isArray(parsed.questions)) {
      throw new Error("Quiz generation failed: model did not return valid JSON");
    }

    const questions = parsed.questions
      .slice(0, 8)
      .map((q: any) => ({
        question: String(q.question ?? "").trim(),
        type: "multiple_choice" as const,
        options: Array.isArray(q.options) ? q.options.map((o: any) => String(o)) : [],
        correctAnswer: String(q.correctAnswer ?? "").trim(),
        explanation: String(q.explanation ?? "").trim(),
        points: 100,
      }))
      .filter((q: any) => q.question && Array.isArray(q.options) && q.options.length === 4 && q.correctAnswer);

    if (questions.length < 4) {
      throw new Error("Quiz generation failed: insufficient valid questions");
    }

    // Ensure correctAnswer is one of the options.
    const fixedQuestions = questions.map((q: any) => {
      const match = q.options.find((o: string) => o.trim() === q.correctAnswer);
      return match ? q : { ...q, correctAnswer: q.options[0] };
    });

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
