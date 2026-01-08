import { query } from "./_generated/server";

export const checkJobs = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("chapterTextJobs").collect();
    },
});

export const checkChapterStatus = query({
    args: {},
    handler: async (ctx) => {
        const chapters = await ctx.db.query("chapters").collect();
        const results = [];
        for (const c of chapters) {
            const pageTexts = await ctx.db.query("chapterPageTexts").withIndex("by_chapter", q => q.eq("chapterId", c._id)).collect();
            const pageNotes = await ctx.db.query("chapterPageNotes").withIndex("by_chapter", q => q.eq("chapterId", c._id)).collect();
            const finalNotes = await ctx.db.query("chapterNotes").withIndex("by_chapter", q => q.eq("chapterId", c._id)).unique();
            const jobs = await ctx.db.query("chapterTextJobs").withIndex("by_chapter", q => q.eq("chapterId", c._id)).collect();

            results.push({
                id: c._id,
                title: c.identifiedTitle || c.pdfPath,
                pageTexts: pageTexts.length,
                pageNotes: pageNotes.length,
                hasFinalNotes: !!finalNotes,
                jobs: jobs.map(j => ({ status: j.status, nextPage: j.nextPageNumber, totalPages: j.totalPages, error: j.lastError }))
            });
        }
        return results;
    }
});
