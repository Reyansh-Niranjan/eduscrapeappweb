import { query, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

// Get portfolio context for AI
export const getPortfolioContext = query({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    try {
      // Fetch all portfolio data
      const [projects, teamMembers, updates] = await Promise.all([
        ctx.db.query("projects").collect(),
        ctx.db.query("teamMembers").withIndex("by_order", (q) => q.gte("order", 0)).collect(),
        ctx.db.query("updates").withIndex("by_published", (q) => q.eq("published", true)).order("desc").take(5)
      ]);

      let context = "You are EduScrapeApp Assistant, helping schools understand how the EduScrapeApp platform gathers and organises learning resources. Here's the product information:\n\n";

      // Impact metrics
      const impactMetrics = teamMembers.length > 0 ? teamMembers : [
        {
          name: "Schools onboarded",
          role: "12 districts",
          bio: "Curriculum teams using EduScrapeApp for weekly planning.",
        },
        {
          name: "Educators empowered",
          role: "240+ teachers",
          bio: "Staff building playlists and sharing resources daily.",
        },
        {
          name: "Students supported",
          role: "18k learners",
          bio: "Receiving curated, standards-aligned materials.",
        },
        {
          name: "Automations live",
          role: "450+",
          bio: "Saved searches continuously pulling fresh content.",
        },
      ];

      context += "RESULTS SNAPSHOT:\n";
      impactMetrics.forEach((metric: any, index: number) => {
        context += `${index + 1}. ${metric.name} - ${metric.role}`;
        if (metric.bio) context += `: ${metric.bio}`;
        context += "\n";
      });

      // Projects information
      context += "\nPROJECTS:\n";
      projects.forEach((project: any, index: number) => {
        context += `${index + 1}. ${project.name} - ${project.description}`;
        context += `\n   Technologies: ${project.technologies.join(", ")}`;
        context += `\n   Repository: ${project.repositoryUrl}`;
        if (project.featured) context += " (Featured)";
        context += "\n";
      });

      // Recent updates
      context += "\nRECENT UPDATES:\n";
      updates.forEach((update: any, index: number) => {
        context += `${index + 1}. ${update.title} - ${update.content}`;
        if (update.type === "github_release" && update.githubReleaseData) {
          context += `\n   Version: ${update.githubReleaseData.version}`;
          context += `\n   Release URL: ${update.githubReleaseData.releaseUrl}`;
        }
        context += "\n";
      });

      context += "\nYou can answer questions about the team, projects, and updates. Be helpful and informative while staying professional.";

      return context;
    } catch (error) {
      console.error("Error building portfolio context:", error);
      return "I'm EduScrapeApp Assistant. I can help answer questions about the platform, key features, and product roadmap.";
    }
  },
});

// Send chat message to OpenRouter
export const sendChatMessage = action({
  args: {
    sessionId: v.string(),
    message: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    response: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{ success: boolean; response?: string; error?: string }> => {
    try {
      // Store user message
      await ctx.runMutation(internal.chatbot.storeMessage, {
        sessionId: args.sessionId,
        role: "user",
        content: args.message,
        timestamp: Date.now(),
      });

      // Get portfolio context
      const context: string = await ctx.runQuery(api.chatbot.getPortfolioContext);

      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error("OpenRouter API key is not configured. Add OPENROUTER_API_KEY in the Convex dashboard.");
      }

      const model = process.env.OPENROUTER_MODEL ?? "meta-llama/llama-4-maverick:free";

      // Call OpenRouter API
      const response: Response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://eduscrapeapp.com",
          "X-Title": "EduScrapeApp Product Site",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: context,
            },
            {
              role: "user",
              content: args.message,
            },
          ],
          max_tokens: Number(process.env.OPENROUTER_MAX_TOKENS ?? 256),
          temperature: 0.6,
        }),
      });

      const textBody = await response.text();

      if (!response.ok) {
        console.error("OpenRouter API error response:", textBody);
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      let data: any;
      try {
        data = JSON.parse(textBody);
      } catch (parseError) {
        console.error("Failed to parse OpenRouter response:", textBody);
        throw new Error("Invalid response from OpenRouter");
      }
      const rawResponse: string = data.choices[0]?.message?.content || "I apologize, but I couldn't generate a response at this time.";

      const cleanedResponse = (() => {
        let content = rawResponse.replace(/<\s*\/?s\s*>/gi, "").trim();
        const outMatch = content.match(/\[OUT\](.*)\[\/OUT\]/s);
        if (outMatch && outMatch[1]) {
          content = outMatch[1].trim();
        }
        return content;
      })();

      // Store AI response
      await ctx.runMutation(internal.chatbot.storeMessage, {
        sessionId: args.sessionId,
        role: "assistant",
        content: cleanedResponse,
        timestamp: Date.now(),
      });

      return {
        success: true,
        response: cleanedResponse,
      };
    } catch (error) {
      console.error("Chat error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      };
    }
  },
});

// Store chat message
export const storeMessage = internalMutation({
  args: {
    sessionId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    timestamp: v.number(),
  },
  returns: v.id("chatMessages"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("chatMessages", args);
  },
});

// Get chat history for a session
export const getChatHistory = query({
  args: {
    sessionId: v.string(),
  },
  returns: v.array(v.object({
    _id: v.id("chatMessages"),
    _creationTime: v.number(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    timestamp: v.number(),
  })),
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();
    
    return messages.map((msg: any) => ({
      _id: msg._id,
      _creationTime: msg._creationTime,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
    }));
  },
});

// Clear chat history for a session
export const clearChatHistory = action({
  args: {
    sessionId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    try {
      const messages = await ctx.runQuery(api.chatbot.getChatHistory, {
        sessionId: args.sessionId,
      });

      for (const message of messages) {
        await ctx.runMutation(internal.chatbot.deleteMessage, {
          messageId: message._id,
        });
      }

      return {
        success: true,
        message: "Chat history cleared successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to clear chat history",
      };
    }
  },
});

// Delete a chat message
export const deleteMessage = internalMutation({
  args: {
    messageId: v.id("chatMessages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.messageId);
    return null;
  },
});
