import { action, internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

const NOTES_MODEL = "mistralai/devstral-2512:free";

async function openRouterChat(args: {
    apiKey: string;
    model: string;
    messages: Array<{ role: "system" | "user"; content: string }>;
    maxTokens?: number;
    temperature?: number;
}): Promise<any> {
    const maxAttempts = 3;
    let lastError: any = new Error("Failed after max attempts");

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
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
                    max_tokens: args.maxTokens ?? 2000,
                    temperature: args.temperature ?? 0.3,
                }),
            });

            const textBody = await response.text();
            if (!response.ok) {
                const errorText = `OpenRouter API error: ${response.status} ${response.statusText} ${textBody}`;
                lastError = new Error(errorText);

                // If rate limited, wait and retry
                if (response.status === 429) {
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
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
    throw lastError;
}

export const generatePageNotes = internalAction({
    args: {
        chapterId: v.id("chapters"),
        pageNumber: v.number(),
        content: v.string(),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) return;

        // Check if notes already exist for this page
        const existing = await ctx.runQuery((internal as any).notes.getPageNotesInternal, {
            chapterId: args.chapterId,
            pageNumber: args.pageNumber
        });
        if (existing) return;

        const isFirstPage = args.pageNumber === 1;
        const prompt = `You are an expert tutor creating detailed, high-quality study notes for a student.
Based on the following textbook page text, generate comprehensive and well-structured notes.
Use markdown formatting, including headings, bullet points, and bold text for key terms.
If there are diagrams described, incorporate their explanations into the notes.
${isFirstPage ? 'CRITICAL: Since this is the first page, identify the ACTUAL CHAPTER TITLE (e.g. "The Cell Cycle") and include it on the very first line as "TITLE: [Title]" followed by a horizontal rule "---".' : ''}
Page Number: ${args.pageNumber}
Text Content:
${args.content}`;

        try {
            console.log(`Generating notes for page ${args.pageNumber} using ${NOTES_MODEL}`);
            const response = await openRouterChat({
                apiKey,
                model: NOTES_MODEL,
                messages: [
                    { role: "system", content: "You are a helpful education assistant that creates perfect study notes." },
                    { role: "user", content: prompt },
                ],
            });

            let notes = response?.choices?.[0]?.message?.content ?? "";
            if (!notes) {
                console.warn(`No notes generated for page ${args.pageNumber}. Response:`, JSON.stringify(response));
            }

            if (notes) {
                if (isFirstPage && notes.includes("TITLE:")) {
                    const lines = notes.split('\n');
                    const titleLine = lines.find((l: string) => l.includes("TITLE:"));
                    if (titleLine) {
                        const title = titleLine.replace("TITLE:", "").trim();
                        await ctx.runMutation(internal.chapterText.updateChapterTitleInternal, {
                            chapterId: args.chapterId,
                            title,
                        });
                        // Clean up title from notes if it's there
                        notes = notes.replace(titleLine, "").trim();
                        if (notes.startsWith("---")) notes = notes.replace("---", "").trim();
                    }
                }

                await ctx.runMutation((internal as any).notes.upsertPageNotesInternal, {
                    chapterId: args.chapterId,
                    pageNumber: args.pageNumber,
                    notes,
                    userId: args.userId,
                    model: NOTES_MODEL,
                });
            }
        } catch (e: any) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            console.error(`Failed to generate page notes for page ${args.pageNumber}: ${errorMessage}`, e);

            // If it's a persistent error with one model, we could try a fallback here eventually
            // For now, just retry after 30 seconds
            await ctx.scheduler.runAfter(30000, (internal as any).notes.generatePageNotes, {
                chapterId: args.chapterId,
                pageNumber: args.pageNumber,
                content: args.content,
                userId: args.userId,
            });
        }
    },
});

export const combineChapterNotes = internalAction({
    args: {
        chapterId: v.id("chapters"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) return;

        const allPageNotes = await ctx.runQuery((internal as any).notes.getAllPageNotesInternal, {
            chapterId: args.chapterId,
        });

        if (!allPageNotes || allPageNotes.length === 0) return;

        // Sort by page number
        allPageNotes.sort((a: any, b: any) => (a.pageNumber as number) - (b.pageNumber as number));

        const combinedText = allPageNotes.map((n: any) => `--- Page ${n.pageNumber} ---\n${n.notes}`).join("\n\n");

        const prompt = `You are an expert editor. You have a collection of study notes generated page-by-page from a textbook chapter.
Your task is to combine these into a single, cohesive, and perfectly formatted set of chapter notes.

CRITICAL INSTRUCTIONS:
1. Identify the ACTUAL CHAPTER TITLE from the content (e.g., "The Cell Cycle", not "chapter1.pdf").
2. Start your response with exactly this format on the first line:
TITLE: [The Identified Chapter Title]
3. Then follow with a horizontal rule (---) and the full cohesive notes.
4. Organize with clear headings (H2 for main sections).
5. Remove redundancies and ensure smooth transitions.
6. Keep all important facts, definitions, and explanations.
7. Make it look premium and professional.

Combined Page Notes:
${combinedText}`;

        try {
            const response = await openRouterChat({
                apiKey,
                model: NOTES_MODEL,
                messages: [
                    { role: "system", content: "You are an expert editor creating professional study guides. You always identify the real chapter title." },
                    { role: "user", content: prompt },
                ],
                maxTokens: 4000,
            });

            let finalNotes = response?.choices?.[0]?.message?.content ?? "";
            if (finalNotes) {
                // Extract title if present
                let identifiedTitle = "";
                if (finalNotes.startsWith("TITLE:")) {
                    const firstLineEnd = finalNotes.indexOf("\n");
                    const titleLine = finalNotes.slice(0, firstLineEnd).replace("TITLE:", "").trim();
                    identifiedTitle = titleLine;
                    // Remove the title line and horizontal rule if exists from the displayed content
                    finalNotes = finalNotes.slice(firstLineEnd).trim();
                    if (finalNotes.startsWith("---")) {
                        finalNotes = finalNotes.replace(/^---/, "").trim();
                    }
                }

                if (identifiedTitle) {
                    await ctx.runMutation(internal.chapterText.updateChapterTitleInternal, {
                        chapterId: args.chapterId,
                        title: identifiedTitle,
                    });
                }

                await ctx.runMutation((internal as any).notes.upsertChapterNotesInternal, {
                    chapterId: args.chapterId,
                    content: finalNotes,
                    userId: args.userId,
                    model: NOTES_MODEL,
                });
            }
        } catch (e) {
            console.error("Failed to combine chapter notes", e);
        }
    },
});

export const getPageNotesInternal = internalQuery({
    args: { chapterId: v.id("chapters"), pageNumber: v.number() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("chapterPageNotes")
            .withIndex("by_chapter_page", (q) => q.eq("chapterId", args.chapterId).eq("pageNumber", args.pageNumber))
            .unique();
    }
});

export const getAllPageNotesInternal = internalQuery({
    args: { chapterId: v.id("chapters") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("chapterPageNotes")
            .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
            .collect();
    },
});

export const upsertPageNotesInternal = internalMutation({
    args: {
        chapterId: v.id("chapters"),
        pageNumber: v.number(),
        notes: v.string(),
        userId: v.id("users"),
        model: v.string(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("chapterPageNotes")
            .withIndex("by_chapter_page", (q) => q.eq("chapterId", args.chapterId).eq("pageNumber", args.pageNumber))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, { notes: args.notes, model: args.model });
        } else {
            await ctx.db.insert("chapterPageNotes", {
                chapterId: args.chapterId,
                pageNumber: args.pageNumber,
                notes: args.notes,
                userId: args.userId,
                model: args.model,
                createdAt: Date.now(),
            });
        }
    },
});

export const upsertChapterNotesInternal = internalMutation({
    args: {
        chapterId: v.id("chapters"),
        content: v.string(),
        userId: v.id("users"),
        model: v.string(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("chapterNotes")
            .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
            .unique();

        const now = Date.now();
        if (existing) {
            await ctx.db.patch(existing._id, {
                content: args.content,
                model: args.model,
                updatedAt: now,
            });
        } else {
            await ctx.db.insert("chapterNotes", {
                chapterId: args.chapterId,
                content: args.content,
                userId: args.userId,
                model: args.model,
                createdAt: now,
                updatedAt: now,
            });
        }
    },
});

export const getMyNotes = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const notes = await ctx.db
            .query("chapterNotes")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        // Attach chapter/book info
        const enriched = await Promise.all(
            notes.map(async (n: any) => {
                const chapter = await ctx.db.get(n.chapterId) as any;
                if (!chapter) return null;
                const book = await ctx.db
                    .query("books")
                    .withIndex("by_path", (q) => q.eq("path", chapter.bookPath))
                    .unique() as any;
                return {
                    ...n,
                    chapterTitle: chapter.identifiedTitle || chapter.pdfPath,
                    bookTitle: book?.title || "Unknown Book",
                    subject: book?.subject || "Unknown Subject",
                };
            })
        );

        return enriched.filter(Boolean);
    },
});

export const syncNotesForChapter = action({
    args: { chapterId: v.id("chapters") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        // 1. Get all extracted text for this chapter
        const texts = await ctx.runQuery(internal.chapterText.getChapterPageTextsForQuiz, {
            chapterId: args.chapterId,
            maxPages: 2000,
            maxCharsPerPage: 12000,
        });

        if (!texts || texts.pages.length === 0) return;

        // 2. Schedule page note generation for each page that has text
        // Use a staggered delay to avoid hitting OpenRouter rate limits
        let delay = 0;
        for (const page of texts.pages) {
            await ctx.scheduler.runAfter(delay, (internal as any).notes.generatePageNotes, {
                chapterId: args.chapterId,
                pageNumber: page.pageNumber,
                content: page.content,
                userId,
            });
            delay += 2000; // 2 second delay between requests
        }

        // 3. Schedule combination
        // Wait longer to allow all staggered page notes to finish
        const finalDelay = delay + 5000;
        await ctx.scheduler.runAfter(finalDelay, (internal as any).notes.combineChapterNotes, {
            chapterId: args.chapterId,
            userId,
        });
    },
});

export const getChapterNotes = query({
    args: { chapterId: v.id("chapters") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        return await ctx.db
            .query("chapterNotes")
            .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
            .unique();
    }
});
export const getNoteStatus = query({
    args: { chapterId: v.id("chapters") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const chapterNotes = await ctx.db
            .query("chapterNotes")
            .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
            .unique();

        if (chapterNotes) return { status: "completed" };

        const pageTexts = await ctx.db
            .query("chapterPageTexts")
            .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
            .collect();

        if (pageTexts.length === 0) return { status: "waiting_for_text" };

        const pageNotes = await ctx.db
            .query("chapterPageNotes")
            .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
            .collect();

        if (pageNotes.length < pageTexts.length) {
            return {
                status: "generating_pages",
                progress: Math.floor((pageNotes.length / pageTexts.length) * 100),
                current: pageNotes.length,
                total: pageTexts.length,
            };
        }

        return { status: "combining" };
    },
});

export const getProcessingNotes = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        // Find chapters where user has extracted text but no final chapterNotes
        const pageTexts = await ctx.db
            .query("chapterPageTexts")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        const chapterIdsWithText = Array.from(new Set(pageTexts.map((pt) => pt.chapterId)));

        const processing = [];
        for (const cid of chapterIdsWithText) {
            const hasFinalNotes = await ctx.db
                .query("chapterNotes")
                .withIndex("by_chapter", (q) => q.eq("chapterId", cid))
                .unique();

            if (!hasFinalNotes) {
                const chapter = await ctx.db.get(cid) as any;
                if (!chapter) continue;

                const book = await ctx.db
                    .query("books")
                    .withIndex("by_path", (q) => q.eq("path", chapter.bookPath))
                    .unique() as any;

                processing.push({
                    chapterId: cid,
                    chapterTitle: chapter.identifiedTitle || chapter.pdfPath,
                    bookTitle: book?.title || "Unknown Book",
                    subject: book?.subject || "Unknown Subject",
                });
            }
        }
        return processing;
    },
});
