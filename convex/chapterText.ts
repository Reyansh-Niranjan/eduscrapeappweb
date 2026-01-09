import { action, internalQuery, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";

const VISION_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free";
const FALLBACK_VISION_MODEL = "qwen/qwen-2.5-vl-7b-instruct:free";

function getVisionModels(): string[] {
  const raw = process.env.OPENROUTER_VISION_MODELS;
  const envSingle = process.env.OPENROUTER_VISION_MODEL;

  const parts = (raw
    ? raw.split(/[\n,]/g)
    : envSingle
      ? [envSingle]
      : [
        VISION_MODEL,
        FALLBACK_VISION_MODEL,
      ])
    .map((s) => s.trim())
    .filter(Boolean);

  // Dedupe, preserve order.
  const seen = new Set<string>();
  const models: string[] = [];
  for (const m of parts) {
    if (seen.has(m)) continue;
    seen.add(m);
    models.push(m);
  }

  return models.length > 0 ? models : [VISION_MODEL, FALLBACK_VISION_MODEL];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function openRouterChatSafe(args: {
  apiKey: string;
  models: string[];
  messages: any[];
  maxTokens?: number;
  temperature?: number;
}): Promise<{ ok: true; json: any } | { ok: false; error: string }> {
  const url = "https://openrouter.ai/api/v1/chat/completions";
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${args.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://eduscrapeapp.com",
          "X-Title": "EduScrapeApp",
        },
        body: JSON.stringify({
          ...(args.models.length > 1
            ? { models: args.models, route: "fallback" as const }
            : { model: args.models[0] }),
          messages: args.messages,
          max_tokens: args.maxTokens ?? 1600,
          temperature: args.temperature ?? 0.2,
        }),
      });

      const textBody = await response.text();
      if (response.ok) return { ok: true, json: JSON.parse(textBody) };

      // Retry transient upstream/provider failures.
      const retryableStatuses = new Set([429, 500, 502, 503, 504]);
      if (retryableStatuses.has(response.status) && attempt < maxAttempts) {
        // High backoff for rate limits, smaller for others
        const backoffMs = response.status === 429
          ? Math.min(10000, 2000 * Math.pow(2, attempt - 1))
          : Math.min(2500, 300 * Math.pow(2, attempt - 1));
        await sleep(backoffMs);
        continue;
      }

      return {
        ok: false,
        error: `OpenRouter API error: ${response.status} ${response.statusText} ${textBody}`,
      };
    } catch (e) {
      // Network errors / fetch exceptions are also retryable.
      if (attempt < maxAttempts) {
        const backoffMs = Math.min(2500, 300 * Math.pow(2, attempt - 1));
        await sleep(backoffMs);
        continue;
      }
      return { ok: false, error: `OpenRouter request failed: ${String(e)}` };
    }
  }

  return { ok: false, error: "OpenRouter API error: exceeded retries" };
}

function clampText(input: string, maxChars: number): string {
  const normalized = String(input ?? "").trim();
  if (normalized.length <= maxChars) return normalized;
  return normalized.slice(0, maxChars);
}

export const getExtractedPages = query({
  args: { chapterId: v.id("chapters") },
  returns: v.object({ pages: v.array(v.number()) }),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("chapterPageTexts")
      .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
      .collect();

    const pages = rows.map((r) => r.pageNumber).sort((a, b) => a - b);
    return { pages };
  },
});

export const getChapterTextForQuiz = internalQuery({
  args: {
    chapterId: v.id("chapters"),
    maxChars: v.optional(v.number()),
  },
  returns: v.object({ text: v.string() }),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("chapterPageTexts")
      .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
      .collect();

    rows.sort((a, b) => a.pageNumber - b.pageNumber);

    const maxChars = Math.max(2000, Math.min(80000, args.maxChars ?? 30000));
    let out = "";
    for (const row of rows) {
      if (out.length >= maxChars) break;
      const chunk = `\n\n[Page ${row.pageNumber}]\n${row.content}`;
      out += chunk;
    }

    return { text: out.slice(0, maxChars) };
  },
});

export const getChapterPageTextsForQuiz = internalQuery({
  args: {
    chapterId: v.id("chapters"),
    maxPages: v.optional(v.number()),
    maxCharsPerPage: v.optional(v.number()),
  },
  returns: v.object({
    pages: v.array(
      v.object({
        pageNumber: v.number(),
        content: v.string(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("chapterPageTexts")
      .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
      .collect();

    rows.sort((a, b) => a.pageNumber - b.pageNumber);

    const maxPages = Math.max(1, Math.min(5000, Math.floor(args.maxPages ?? 2000)));
    const maxCharsPerPage = Math.max(200, Math.min(12000, Math.floor(args.maxCharsPerPage ?? 3500)));

    const pages = rows.slice(0, maxPages).map((r) => ({
      pageNumber: r.pageNumber,
      content: clampText(r.content, maxCharsPerPage),
    }));

    return { pages };
  },
});

export const isPageExtractedInternal = internalQuery({
  args: {
    chapterId: v.id("chapters"),
    pageNumber: v.number(),
  },
  returns: v.object({ exists: v.boolean() }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("chapterPageTexts")
      .withIndex("by_chapter_page", (q) => q.eq("chapterId", args.chapterId).eq("pageNumber", args.pageNumber))
      .unique();
    return { exists: !!existing };
  },
});

export const upsertChapterPageTextInternal = internalMutation({
  args: {
    chapterId: v.id("chapters"),
    pageNumber: v.number(),
    content: v.string(),
    model: v.string(),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("chapterPageTexts")
      .withIndex("by_chapter_page", (q) => q.eq("chapterId", args.chapterId).eq("pageNumber", args.pageNumber))
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

    await ctx.db.insert("chapterPageTexts", {
      chapterId: args.chapterId,
      pageNumber: args.pageNumber,
      content: args.content,
      model: args.model,
      userId: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Schedule note generation for this page
    await ctx.scheduler.runAfter(0, (internal as any).notes.generatePageNotes, {
      chapterId: args.chapterId,
      pageNumber: args.pageNumber,
      content: args.content,
      userId: args.userId,
    });

    return null;
  },
});

export const extractChapterPageText = action({
  args: {
    chapterId: v.id("chapters"),
    pageNumber: v.number(),
    imageDataUrl: v.string(),
    force: v.optional(v.boolean()),
  },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // If already present and not forcing, skip work.
    if (!args.force) {
      const existing = await ctx.runQuery(internal.chapterText.isPageExtractedInternal, {
        chapterId: args.chapterId,
        pageNumber: args.pageNumber,
      });
      if (existing?.exists) return { ok: true };
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      // Fail gracefully so the PDF viewer doesn't crash.
      return { ok: false };
    }

    const prompt = `You are reading a single page of a school textbook PDF.

Task:
- TRANSCRIBE all visible text exactly (keep headings, bullet points, formulas).
- If the page includes diagrams/images/graphs, describe them EXTREMELY DETAILED and explain what they show.
- If there are labels in a diagram, include the labels and what they point to.
- Output plain text only (no JSON, no markdown fences).

Page number: ${args.pageNumber}
Be thorough.`;

    const models = getVisionModels();

    const result = await openRouterChatSafe({
      apiKey,
      models,
      messages: [
        { role: "system", content: "You are an OCR + study-note agent." },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: args.imageDataUrl } },
          ],
        },
      ],
      maxTokens: 1800,
      temperature: 0.2,
    });

    if (!result.ok) {
      console.error("OpenRouter extraction failed", {
        chapterId: args.chapterId,
        pageNumber: args.pageNumber,
        error: result.error,
      });
      return { ok: false };
    }

    const response = result.json;
    const content: string = response?.choices?.[0]?.message?.content ?? "";
    const cleaned = clampText(content, 12000);
    const usedModel = String(response?.model ?? models[0] ?? VISION_MODEL);

    await ctx.runMutation(internal.chapterText.upsertChapterPageTextInternal, {
      chapterId: args.chapterId,
      pageNumber: args.pageNumber,
      content: cleaned,
      model: usedModel,
      userId,
    });

    return { ok: true };
  },
});

// Start a server-side extraction job that continues page-by-page even if the user leaves.
// The client should provide the PDF's public URL and the total page count.
export const startChapterTextJob = action({
  args: {
    chapterId: v.id("chapters"),
    pdfUrl: v.string(),
    totalPages: v.number(),
    forceRestart: v.optional(v.boolean()),
  },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const totalPages = Math.max(1, Math.min(2000, Math.floor(args.totalPages)));

    const { jobId } = await ctx.runMutation(internal.chapterTextJobs.upsertJobInternal, {
      chapterId: args.chapterId,
      pdfUrl: args.pdfUrl,
      totalPages,
      userId,
      forceRestart: args.forceRestart,
    });

    // Run immediately.
    await ctx.runMutation(internal.chapterTextJobs.scheduleJobBatchInternal, {
      jobId,
      delayMs: 0,
    });

    // Also trigger note sync in case text already exists
    await ctx.scheduler.runAfter(0, (api as any).notes.syncNotesForChapter, {
      chapterId: args.chapterId,
    });

    return { ok: true };
  },
});

export const resetChapterExtraction = internalMutation({
  args: { chapterId: v.id("chapters") },
  handler: async (ctx, args) => {
    // Delete all text
    const texts = await ctx.db
      .query("chapterPageTexts")
      .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
      .collect();
    for (const t of texts) await ctx.db.delete(t._id);

    // Delete all page notes
    const pageNotes = await ctx.db
      .query("chapterPageNotes")
      .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
      .collect();
    for (const n of pageNotes) await ctx.db.delete(n._id);

    // Delete chapter notes
    const chapterNotes = await ctx.db
      .query("chapterNotes")
      .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
      .collect();
    for (const n of chapterNotes) await ctx.db.delete(n._id);

    // Delete jobs
    const jobs = await ctx.db
      .query("chapterTextJobs")
      .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
      .collect();
    for (const j of jobs) await ctx.db.delete(j._id);
  },
});

export const updateChapterTitleInternal = internalMutation({
  args: { chapterId: v.id("chapters"), title: v.string() },
  handler: async (ctx, args) => {
    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter) return;
    // Only update if not already set or if it looks like a filename
    const current = chapter.identifiedTitle;
    const looksLikeFile = !current || current.toLowerCase().endsWith(".pdf");
    if (looksLikeFile) {
      await ctx.db.patch(args.chapterId, { identifiedTitle: args.title });
    }
  },
});
