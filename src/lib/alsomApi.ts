/**
 * Alsom API Client
 * 
 * This client connects to the Alsom AI service at /api/chat endpoint.
 * API Reference: https://github.com/Reyansh-Niranjan/alsom
 * 
 * Request Parameters:
 * - site: string (required) - Identifier for the calling site
 * - user_id: string (required) - Unique user identifier for privacy
 * - session_id: string (required) - Session ID for conversation threading
 * - messages: array (required) - Array of { role, content } messages
 * - tools: array (optional) - Built-in tools to enable: 'time', 'websearch'
 * - add_tools: boolean (optional) - If true, includes tool call details in response
 * - additional_tools: array (optional) - External tools { name, description }
 * 
 * Response:
 * - reply: string - The AI model's text response
 * - tool_calls: array (only if add_tools=true) - Built-in tool calls executed
 * - external_tool_calls: array (only if add_tools=true) - External tool calls to execute
 * - usage: object - Token usage information
 * - debug: object - Debug information (site, user_id, session_id, timestamp)
 */

// Configuration
const ALSOM_API_URL = import.meta.env.VITE_ALSOM_API_URL || 'https://alsom.vercel.app';

export interface AlsomMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AlsomTool {
  name: string;
  description?: string;
}

export interface AlsomToolCall {
  tool: string;
  input: string;
  output?: string;
  status?: string;
}

export interface AlsomChatRequest {
  site: string;
  user_id: string;
  session_id: string;
  messages: AlsomMessage[];
  tools?: string[];
  add_tools?: boolean;
  additional_tools?: AlsomTool[];
}

export interface AlsomChatResponse {
  reply: string;
  tool_calls?: AlsomToolCall[];
  external_tool_calls?: AlsomToolCall[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  debug?: {
    site: string;
    user_id: string;
    session_id: string;
    timestamp: string;
  };
  error?: string;
  message?: string;
}

/**
 * Check if Alsom API is configured with a valid URL
 * Validates that VITE_ALSOM_API_URL is set and is a properly formatted URL
 */
export const isAlsomConfigured = (): boolean => {
  if (!ALSOM_API_URL) return false;
  try {
    new URL(ALSOM_API_URL);
    return true;
  } catch {
    return false;
  }
};

/**
 * Send a chat message to Alsom API
 */
export async function sendAlsomMessage(
  request: AlsomChatRequest
): Promise<AlsomChatResponse> {
  const url = `${ALSOM_API_URL}/api/chat`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    // Handle non-JSON responses gracefully
    let data: AlsomChatResponse;
    try {
      data = await response.json();
    } catch {
      return {
        reply: '',
        error: `Server returned invalid response (status ${response.status})`,
      };
    }

    if (!response.ok) {
      return {
        reply: '',
        error: data.error || `HTTP error ${response.status}`,
        message: data.message,
      };
    }

    return data;
  } catch (error) {
    console.error('[AlsomAPI] Error:', error);
    return {
      reply: '',
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Create a chat session for Alsom
 * Generates a unique session ID for conversation threading
 */
export function createAlsomSessionId(): string {
  // Use crypto.randomUUID if available, fallback to timestamp + random
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `alsom_${crypto.randomUUID()}`;
  }
  return `alsom_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Build the chat request with EduScrapeApp context
 */
export function buildAlsomRequest(
  userId: string,
  sessionId: string,
  messages: AlsomMessage[],
  options?: {
    systemPrompt?: string;
    tools?: string[];
    additionalTools?: AlsomTool[];
    addTools?: boolean;
  }
): AlsomChatRequest {
  const allMessages: AlsomMessage[] = [];
  
  // Add system prompt if provided
  if (options?.systemPrompt) {
    allMessages.push({
      role: 'system',
      content: options.systemPrompt,
    });
  }
  
  // Add conversation messages
  allMessages.push(...messages);
  
  return {
    site: 'eduscrapeapp',
    user_id: userId,
    session_id: sessionId,
    messages: allMessages,
    tools: options?.tools,
    add_tools: options?.addTools,
    additional_tools: options?.additionalTools,
  };
}

/**
 * Default system prompt for EduScrapeApp context
 */
export const EDUSCRAPE_SYSTEM_PROMPT = `You are an AI assistant integrated into EduScrapeApp, an educational platform that helps students and educators discover and access curriculum-ready content.

When helping users:
- Be educational and informative
- Provide accurate information about educational topics
- Help users find relevant learning materials
- Be encouraging and supportive of learning

You have access to web search to find current information when needed.`;
