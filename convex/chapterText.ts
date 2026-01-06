import { action, internalQuery, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

const VISION_MODEL = "qwen/qwen-2.5-vl-7b-instruct:free";

async function openRouterChat(args: {
  apiKey: string;
  model: string;
  messages: any[];
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
      max_tokens: args.maxTokens ?? 1600,
      temperature: args.temperature ?? 0.2,
    }),
  });

  const textBody = await response.text();
  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} ${textBody}`);
  }
  return JSON.parse(textBody);
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
    if (!apiKey) throw new Error("OpenRouter API key is not configured");

    const prompt = `You are reading a single page of a school textbook PDF.

Task:
- TRANSCRIBE all visible text exactly (keep headings, bullet points, formulas).
- If the page includes diagrams/images/graphs, describe them EXTREMELY DETAILED and explain what they show.
- If there are labels in a diagram, include the labels and what they point to.
- Output plain text only (no JSON, no markdown fences).

Page number: ${args.pageNumber}
Be thorough.`;

    const response = await openRouterChat({
      apiKey,
      model: VISION_MODEL,
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

    const content: string = response?.choices?.[0]?.message?.content ?? "";
    const cleaned = clampText(content, 12000);

    await ctx.runMutation(internal.chapterText.upsertChapterPageTextInternal, {
      chapterId: args.chapterId,
      pageNumber: args.pageNumber,
      content: cleaned,
      model: VISION_MODEL,
      userId,
    });

    return { ok: true };
  },
});
