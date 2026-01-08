import { mutation } from "./_generated/server";
import { authTables } from "@convex-dev/auth/server";

export const clearData = mutation({
    args: {},
    handler: async (ctx) => {
        const authTableNames = Object.keys(authTables);
        const tables = [
            "projects",
            "updates",
            "teamMembers",
            "chatMessages",
            "userProfiles",
            "books",
            "chapters",
            "userProgress",
            "chapterProgress",
            "chapterPageTexts",
            "chapterPageNotes",
            "chapterNotes",
            "chapterTextJobs",
            "quizzes",
            "quizQuestions",
            "quizAttempts",
            "quizAnswers",
            ...authTableNames
        ];

        console.log("Clearing tables:", tables);

        for (const table of tables) {
            try {
                const docs = await ctx.db.query(table as any).collect();
                if (docs.length > 0) {
                    console.log(`Deleting ${docs.length} records from ${table}`);
                    for (const doc of docs) {
                        await ctx.db.delete(doc._id);
                    }
                }
            } catch (error) {
                console.error(`Failed to clear table ${table}:`, error);
            }
        }

        console.log("Database cleared");
    },
});
