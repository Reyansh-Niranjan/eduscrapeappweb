import { query, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// Type definitions for Firebase structure
interface BookInfo {
  name: string;
  path?: string;
}

type FolderContent = BookInfo[] | FirebaseStructure;

interface FirebaseStructure {
  [key: string]: FolderContent;
}

interface SearchResult {
  title: string;
  path: string;
}

const debugLog = (..._args: any[]) => {
  // Intentionally no-op: avoid server-side console logging in production.
};

const TOOL_MODEL = process.env.OPENROUTER_TOOL_MODEL || "mistralai/devstral-2512:free";
const WRITER_MODEL = process.env.OPENROUTER_WRITER_MODEL || "mistralai/devstral-2512:free";

// Lightweight in-memory cache for the library structure.json.
// This is best-effort (Convex isolates may be recycled), but it reduces repeated fetches under load.
const STRUCTURE_URL = "https://eduscrape-host.web.app/structure.json";
const STRUCTURE_TTL_MS = 5 * 60 * 1000;
let cachedStructure:
  | {
    fetchedAt: number;
    data: FirebaseStructure;
  }
  | null = null;

async function getCachedStructure(): Promise<FirebaseStructure> {
  const now = Date.now();
  if (cachedStructure && now - cachedStructure.fetchedAt < STRUCTURE_TTL_MS) {
    return cachedStructure.data;
  }
  const response = await fetch(STRUCTURE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch structure: ${response.status}`);
  }
  const structure = (await response.json()) as FirebaseStructure;
  cachedStructure = { fetchedAt: now, data: structure };
  return structure;
}

function safeParseJson(input: string): any {
  try {
    // Remove markdown code blocks if present
    const cleaned = input.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}\n\n[truncated]`;
}

type ToolCall = {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
};

type OpenRouterResponse = {
  choices: Array<{
    message: {
      content: string | null;
      tool_calls?: ToolCall[];
    };
  }>;
};

type OpenRouterMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

async function openRouterChat(args: {
  apiKey: string;
  model: string;
  messages: OpenRouterMessage[];
  tools?: any;
  toolChoice?: "auto" | "none";
  maxTokens?: number;
  temperature?: number;
}): Promise<OpenRouterResponse> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://eduscrapeapp.com",
      "X-Title": "EduScrapeApp",
    },
    body: JSON.stringify({
      model: args.model,
      messages: args.messages,
      tools: args.tools,
      tool_choice: args.toolChoice,
      max_tokens: args.maxTokens ?? 900,
      temperature: args.temperature ?? 0.7,
    }),
  });

  const textBody = await response.text();
  debugLog("openrouter", {
    model: args.model,
    status: response.status,
    bodyLength: textBody.length,
  });

  if (!response.ok) {
    // Avoid logging full response bodies (may include sensitive content).
    console.error("[ERROR] OpenRouter API error:", response.status, response.statusText);
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
  }

  const data = safeParseJson(textBody);
  if (!data) {
    throw new Error("Invalid response from OpenRouter");
  }
  return data;
}



// Define tool types
const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for current information, news, or general knowledge. Use this when the user asks about topics outside the library or needs current information.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to look up on the web"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "book_search",
      description: "Search through the available educational books and materials in the library. Returns matching books, chapters, and subjects from the user's grade level and all available content.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query for book titles, subjects, chapters, or topics"
          },
          grade: {
            type: "string",
            description: "Filter by grade level (e.g., 'Class1', 'Class2', etc.)"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "open_chapter",
      description: "Open a specific book or chapter for the user to read. Use this when the user wants to view, read, or open any educational material.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The full path to the book/chapter (e.g., 'Class1/Mathematics/Chapter1.zip')"
          },
          bookName: {
            type: "string",
            description: "The name of the book/chapter to open"
          }
        },
        required: ["path", "bookName"]
      }
    }
  }
];

// Web search using DuckDuckGo (no API key needed)
async function webSearch(query: string): Promise<string> {
  debugLog("web_search", { query });
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    const html = await response.text();

    // Parse simple results from DuckDuckGo HTML
    const results: string[] = [];
    const resultRegex = /<a class="result__a"[^>]*>([^<]+)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([^<]+)<\/a>/g;
    let match;
    let count = 0;

    while ((match = resultRegex.exec(html)) !== null && count < 5) {
      results.push(`${match[1]}: ${match[2]}`);
      count++;
    }

    if (results.length === 0) {
      return `No web results found for "${query}". This might be a topic better suited for the educational library.`;
    }

    return `Web search results for "${query}":\n\n${results.join('\n\n')}`;
  } catch (error) {
    return `Unable to perform web search at this time. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// Book search delegated to Node runtime action
async function bookSearch(ctx: any, query: string): Promise<string> {
  try {
    const result = await ctx.runAction(api.deepsearch.searchBooks, { query });
    return result;
  } catch (error) {
    return `Unable to search books. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// Get portfolio context for AI with user context
export const getPortfolioContext = query({
  args: {
    userContext: v.optional(v.object({
      grade: v.optional(v.string()),
      currentPage: v.optional(v.string()),
      currentBook: v.optional(v.string()),
      currentFolder: v.optional(v.string()),
    })),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    try {
      const userId = await getAuthUserId(ctx);
      let userProfile = null;

      if (userId) {
        userProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .first();
      }

      // Fetch all portfolio data
      const [projects, teamMembers, updates] = await Promise.all([
        ctx.db.query("projects").collect(),
        ctx.db.query("teamMembers").withIndex("by_order", (q) => q.gte("order", 0)).collect(),
        ctx.db.query("updates").withIndex("by_published", (q) => q.eq("published", true)).order("desc").take(5)
      ]);

      let context = "You are EduScrapeApp AI Assistant, an intelligent helper for students and educators.\n\n";

      context += "YOUR CAPABILITIES:\n";
      context += "1. 🌐 Web Search - Search the internet for current information and general knowledge\n";
      context += "2. 📚 Book Search - Find educational books, chapters, and materials in our library\n";
      context += "3. 📖 Open Chapter - Directly open any book or chapter for the user to read\n\n";

      // Add user context
      if (userProfile || args.userContext) {
        context += "USER CONTEXT:\n";
        if (userProfile) {
          context += `- Student Name: ${userProfile.name || 'Not set'}\n`;
          context += `- Grade: ${userProfile.grade || args.userContext?.grade || 'Not set'}\n`;
        }
        if (args.userContext?.currentPage) {
          context += `- Current Page: ${args.userContext.currentPage}\n`;
        }
        if (args.userContext?.currentBook) {
          context += `- Viewing Book: ${args.userContext.currentBook}\n`;
        }
        if (args.userContext?.currentFolder) {
          context += `- Current Folder: ${args.userContext.currentFolder}\n`;
        }
        context += "\n";
      }

      context += "INSTRUCTIONS:\n";
      context += "- When users ask about topics, use web_search for general knowledge or current events\n";
      context += "- Use book_search to find educational materials in our library\n";
      context += "- Use open_chapter when users want to read or view any book/chapter\n";
      context += "- Be proactive: if a user asks about a subject, search for relevant books and offer to open them\n";
      context += "- Prioritize educational content from the user's grade level\n";
      context += "- Be helpful, friendly, and educational in your responses\n\n";

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

// Send chat message to OpenRouter with tools
export const sendChatMessage = action({
  args: {
    sessionId: v.string(),
    message: v.string(),
    userContext: v.optional(v.object({
      grade: v.optional(v.string()),
      currentPage: v.optional(v.string()),
      currentBook: v.optional(v.string()),
      currentFolder: v.optional(v.string()),
    })),
  },
  returns: v.object({
    success: v.boolean(),
    response: v.optional(v.string()),
    error: v.optional(v.string()),
    toolCalls: v.optional(v.array(v.object({
      name: v.string(),
      result: v.string(),
    }))),
    bookToOpen: v.optional(v.object({
      path: v.string(),
      name: v.string(),
    })),
    resultObject: v.optional(
      v.object({
        needsTools: v.boolean(),
        toolModel: v.string(),
        writerModel: v.string(),
        tools: v.array(
          v.object({
            name: v.string(),
            args: v.optional(v.string()),
            result: v.string(),
          })
        ),
      })
    ),
  }),
  handler: async (ctx, args) => {
    debugLog("sendChatMessage", {
      sessionId: args.sessionId,
      messageLength: args.message.length,
      userContext: args.userContext,
    });
    try {
      // Store user message
      console.log(`[DEBUG] sendChatMessage: Processing message from session ${args.sessionId}`);
      console.log(`[DEBUG] User Message: "${args.message}"`);

      await ctx.runMutation(internal.chatbot.storeMessage, {
        sessionId: args.sessionId,
        role: "user",
        content: args.message,
        timestamp: Date.now(),
      });

      // Get context with user info
      const context: string = await ctx.runQuery(api.chatbot.getPortfolioContext, {
        userContext: args.userContext,
      });

      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error("OpenRouter API key is not configured. Add OPENROUTER_API_KEY in the Convex dashboard.");
      }

      // Get recent chat history
      const history = await ctx.runQuery(api.chatbot.getChatHistory, { sessionId: args.sessionId });
      const recentMessages = history.slice(-8).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      }));

      // --- STANDARD TOOL CALLING LOOP ---

      // 1. Prepare messages with System Context + History + Current User Message
      const messages: OpenRouterMessage[] = [
        { role: "system", content: context },
        ...recentMessages.slice(0, -1).map((m: any) => ({ role: m.role, content: m.content } as OpenRouterMessage)),
        { role: "user", content: args.message },
      ];

      // 2. First call to the model - let it decide to use tools
      console.log(`[DEBUG] Call 1 (Devstral): Sending ${messages.length} messages to ${TOOL_MODEL}`);

      const firstResponse = await openRouterChat({
        apiKey,
        model: TOOL_MODEL,
        messages,
        tools: toolDefinitions,
        toolChoice: "auto",
        maxTokens: 900,
        temperature: 0.3, // Lower temp for reliable tool calling
      });

      const firstMessage = firstResponse.choices?.[0]?.message;
      console.log(`[DEBUG] Call 1 Response:`, JSON.stringify(firstMessage, null, 2));

      let finalResponse = "";
      const executedTools: Array<{ name: string; result: string; args?: string }> = [];
      let bookToOpen: { path: string; name: string } | undefined;

      const toolCalls = firstMessage?.tool_calls;

      if (toolCalls && toolCalls.length > 0) {
        // --- TOOLS REQUESTED ---

        // Append the assistant's "call intent" message to history
        // IMPORTANT: We must include the original tool_calls in this message
        messages.push({
          role: "assistant",
          content: firstMessage.content,
          tool_calls: toolCalls
        });

        // Loop through and execute tools
        console.log(`[DEBUG] Tool Loop: Processing ${toolCalls.length} tool calls`);

        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;
          const rawArgs = toolCall.function.arguments;
          console.log(`[DEBUG] Tool Exec: ${functionName} with args:`, rawArgs);

          const functionArgs = rawArgs ? safeParseJson(rawArgs) : null;

          let toolResult = "";

          if (!functionName || !functionArgs) {
            console.log(`[DEBUG] Tool Error: Invalid args for ${functionName}`);
            toolResult = "Error: Invalid tool args";
            // Still need to append result or loop breaks
          } else {
            if (functionName === "web_search") {
              toolResult = await webSearch(String(functionArgs.query ?? ""));
            } else if (functionName === "book_search") {
              toolResult = await bookSearch(
                ctx, // Pass context for action call
                String(functionArgs.query ?? "")
              );
            } else if (functionName === "open_chapter") {
              const path = String(functionArgs.path ?? "");
              const bookName = String(functionArgs.bookName ?? "");
              if (path && bookName) {
                bookToOpen = { path, name: bookName };
                toolResult = `Opening "${bookName}" for you now...`;
              } else {
                toolResult = "Missing path or bookName.";
              }
            } else {
              toolResult = `Unknown tool: ${functionName}`;
            }
          }

          console.log(`[DEBUG] Tool Result (${functionName}):`, toolResult.slice(0, 100) + "...");

          executedTools.push({ name: functionName, args: rawArgs, result: toolResult });

          // Append the TOOL RESULT message
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: truncate(toolResult, 4000) // Safety truncate
          });
        }

        // 3. Second call to the model - Final Answer based on Tool Results
        console.log(`[DEBUG] Call 2 (Writer): Sending updated history with tool results...`);

        const secondResponse = await openRouterChat({
          apiKey,
          model: WRITER_MODEL,
          messages,
          tools: toolDefinitions, // Keep tools available (required by strict APIs)
          toolChoice: "auto", // Or 'none' if we want to force stop, but 'auto' is standard
          maxTokens: 900,
          temperature: 0.7,
        });

        finalResponse = secondResponse.choices?.[0]?.message?.content || "";
        console.log(`[DEBUG] Call 2 Response:`, finalResponse.slice(0, 100) + "...");

      } else {
        // --- NO TOOLS REQUESTED ---
        finalResponse = firstMessage?.content || "";
      }

      if (!finalResponse) {
        finalResponse = "I apologize, but I couldn't generate a response.";
      }

      // Store AI response
      await ctx.runMutation(internal.chatbot.storeMessage, {
        sessionId: args.sessionId,
        role: "assistant",
        content: finalResponse,
        timestamp: Date.now(),
      });

      return {
        success: true,
        response: finalResponse,
        toolCalls: executedTools.length > 0 ? executedTools.map((t) => ({ name: t.name, result: t.result })) : undefined,
        bookToOpen,
        resultObject: {
          needsTools: executedTools.length > 0,
          toolModel: TOOL_MODEL,
          writerModel: WRITER_MODEL,
          tools: executedTools.map((t) => ({
            name: t.name,
            args: typeof t.args === "string" ? truncate(t.args, 1200) : undefined,
            result: truncate(t.result, 4000),
          })),
        }
      };
    } catch (error) {
      console.error('[ERROR] Chat error:', error instanceof Error ? error.message : error);
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
    // Bound history for performance; callers can request more later if needed.
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .take(40);

    messages.reverse();

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
