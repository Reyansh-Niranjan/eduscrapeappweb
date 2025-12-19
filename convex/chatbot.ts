import { query, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

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
  console.log('[DEBUG] Web Search called with query:', query);
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    console.log('[DEBUG] Fetching from:', url);
    const response = await fetch(url);
    console.log('[DEBUG] Web search response status:', response.status);
    const html = await response.text();
    console.log('[DEBUG] HTML length:', html.length);
    
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

// Book search through Firebase structure
async function bookSearch(query: string, userGrade?: string): Promise<string> {
  try {
    const response = await fetch('https://eduscrape-host.web.app/structure.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch structure: ${response.status}`);
    }
    const structure = await response.json() as FirebaseStructure;
    
    const queryLower = query.toLowerCase();
    const results: string[] = [];
    
    // Search through structure with proper typing
    function searchStructure(obj: FirebaseStructure | BookInfo[], path: string[] = []): void {
      if (Array.isArray(obj)) {
        // This is a list of books
        for (const book of obj) {
          if (typeof book === 'object' && 'name' in book) {
            const bookName = book.name?.toLowerCase() ?? '';
            if (bookName.includes(queryLower) || 
                path.join('/').toLowerCase().includes(queryLower)) {
              results.push(`📚 ${book.name} - Path: ${path.join('/')}/${book.name}`);
            }
          }
        }
      } else if (typeof obj === 'object' && obj !== null) {
        // This is a folder structure
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = [...path, key];
          searchStructure(value, currentPath);
        }
      }
    }
    
    // If user grade specified, prioritize that grade
    if (userGrade && structure[userGrade]) {
      searchStructure(structure[userGrade], [userGrade]);
    }
    
    // Also search other grades
    searchStructure(structure, []);
    
    if (results.length === 0) {
      return `No books found matching "${query}". Try searching for subjects like "Mathematics", "Science", "English", or chapter names.`;
    }
    
    const uniqueResults = [...new Set(results)].slice(0, 10);
    return `Found ${uniqueResults.length} book(s) matching "${query}":\n\n${uniqueResults.join('\n')}`;
  } catch (error) {
    return `Unable to search books at this time. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
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
      const identity = await ctx.auth.getUserIdentity();
      let userProfile = null;
      
      if (identity) {
        userProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", identity.subject as any))
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
  }),
  handler: async (ctx, args) => {
    console.log('[DEBUG] sendChatMessage called');
    console.log('[DEBUG] Session:', args.sessionId);
    console.log('[DEBUG] Message:', args.message);
    console.log('[DEBUG] User context:', JSON.stringify(args.userContext));
    try {
      // Store user message
      console.log('[DEBUG] Storing user message...');
      await ctx.runMutation(internal.chatbot.storeMessage, {
        sessionId: args.sessionId,
        role: "user",
        content: args.message,
        timestamp: Date.now(),
      });
      console.log('[DEBUG] User message stored');

      // Get context with user info
      const context: string = await ctx.runQuery(api.chatbot.getPortfolioContext, {
        userContext: args.userContext,
      });

      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error("OpenRouter API key is not configured. Add OPENROUTER_API_KEY in the Convex dashboard.");
      }

      const model = "meta-llama/llama-3.2-3b-instruct:free";

      // Get recent chat history
      const history = await ctx.runQuery(api.chatbot.getChatHistory, { sessionId: args.sessionId });
      const recentMessages = history.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // First API call with tools
      console.log('[DEBUG] Calling OpenRouter API...');
      console.log('[DEBUG] Model:', model);
      console.log('[DEBUG] Recent messages count:', recentMessages.length);
      console.log('[DEBUG] Tools available:', toolDefinitions.length);
      const response: Response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://eduscrapeapp.com",
          "X-Title": "EduScrapeApp",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: context,
            },
            ...recentMessages.slice(0, -1),
            {
              role: "user",
              content: args.message,
            },
          ],
          tools: toolDefinitions,
          tool_choice: "auto",
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      const textBody = await response.text();
      console.log('[DEBUG] API response status:', response.status);
      console.log('[DEBUG] API response body length:', textBody.length);

      if (!response.ok) {
        console.error('[ERROR] OpenRouter API error:', response.status, textBody);
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      let data: any;
      try {
        data = JSON.parse(textBody);
      } catch (parseError) {
        throw new Error("Invalid response from OpenRouter");
      }

      const message = data.choices[0]?.message;
      const toolCalls = message?.tool_calls;
      console.log('[DEBUG] AI message content:', message?.content);
      console.log('[DEBUG] Tool calls received:', toolCalls ? toolCalls.length : 0);
      
      let finalResponse = message?.content || "";
      const executedTools: Array<{ name: string; result: string }> = [];
      let bookToOpen: { path: string; name: string } | undefined;

      // Execute tool calls if any
      if (toolCalls && toolCalls.length > 0) {
        console.log('[DEBUG] Processing tool calls...');
        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;
          console.log('[DEBUG] Executing tool:', functionName);
          const functionArgs = JSON.parse(toolCall.function.arguments);
          console.log('[DEBUG] Tool arguments:', JSON.stringify(functionArgs));
          
          let toolResult = "";
          
          if (functionName === "web_search") {
            console.log('[DEBUG] Executing web_search tool');
            toolResult = await webSearch(functionArgs.query);
            console.log('[DEBUG] Web search result length:', toolResult.length);
            executedTools.push({ name: "web_search", result: toolResult });
          } else if (functionName === "book_search") {
            console.log('[DEBUG] Executing book_search tool');
            toolResult = await bookSearch(functionArgs.query, functionArgs.grade || args.userContext?.grade);
            console.log('[DEBUG] Book search result length:', toolResult.length);
            executedTools.push({ name: "book_search", result: toolResult });
          } else if (functionName === "open_chapter") {
            console.log('[DEBUG] Executing open_chapter tool');
            bookToOpen = {
              path: functionArgs.path,
              name: functionArgs.bookName,
            };
            toolResult = `Opening "${functionArgs.bookName}" for you now...`;
            executedTools.push({ name: "open_chapter", result: toolResult });
          }
          
          // Second API call with tool results
          console.log('[DEBUG] Making follow-up API call with tool results...');
          const followUpResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://eduscrapeapp.com",
              "X-Title": "EduScrapeApp",
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
                {
                  role: "assistant",
                  content: null,
                  tool_calls: [toolCall],
                },
                {
                  role: "tool",
                  tool_call_id: toolCall.id,
                  content: toolResult,
                },
              ],
              max_tokens: 800,
              temperature: 0.7,
            }),
          });
          
          const followUpText = await followUpResponse.text();
          console.log('[DEBUG] Follow-up response status:', followUpResponse.status);
          console.log('[DEBUG] Follow-up response body length:', followUpText.length);
          
          if (!followUpResponse.ok) {
            console.error('[ERROR] Follow-up API error:', followUpResponse.status, followUpText);
            finalResponse = toolResult; // Use tool result if follow-up fails
          } else {
            try {
              const followUpData = JSON.parse(followUpText);
              console.log('[DEBUG] Follow-up data:', JSON.stringify(followUpData));
              finalResponse = followUpData.choices?.[0]?.message?.content || toolResult;
            } catch (parseError) {
              console.error('[ERROR] Failed to parse follow-up response:', parseError);
              finalResponse = toolResult; // Use tool result if parsing fails
            }
          }
        }
      }

      if (!finalResponse) {
        console.log('[DEBUG] No final response, using default message');
        finalResponse = "I apologize, but I couldn't generate a response at this time.";
      }

      console.log('[DEBUG] Final response length:', finalResponse.length);
      console.log('[DEBUG] Executed tools count:', executedTools.length);
      console.log('[DEBUG] Book to open:', bookToOpen ? bookToOpen.name : 'none');

      // Store AI response
      console.log('[DEBUG] Storing AI response...');
      await ctx.runMutation(internal.chatbot.storeMessage, {
        sessionId: args.sessionId,
        role: "assistant",
        content: finalResponse,
        timestamp: Date.now(),
      });

      console.log('[DEBUG] Sending successful response');
      return {
        success: true,
        response: finalResponse,
        toolCalls: executedTools.length > 0 ? executedTools : undefined,
        bookToOpen,
      };
    } catch (error) {
      console.error('[ERROR] Chat error:', error);
      console.error('[ERROR] Error stack:', error instanceof Error ? error.stack : 'No stack');
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
