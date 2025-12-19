# OpenRouter AI Assistant Setup Guide

## Environment Variables

You need to add the OPENROUTER_API_KEY to your Convex environment.

### Steps:

1. **Get your OpenRouter API Key:**
   - Visit https://openrouter.ai/
   - Sign up / Log in
   - Go to Keys section
   - Create a new API key

2. **Add to Convex (Development):**
   ```bash
   npx convex env set OPENROUTER_API_KEY "your-key-here"
   ```

3. **Add to Convex (Production):**
   ```bash
   npx convex env set OPENROUTER_API_KEY "your-key-here" --prod
   ```

## Model Used

The AI assistant uses: **meta-llama/llama-3.2-3b-instruct:free**
- Free tier model from Meta
- No credits required
- Fast response times
- Good for educational assistance
- Supports function calling (tools)

## Features Implemented

### 🤖 AI Assistant Capabilities:

1. **Web Search (No API Required)**
   - Uses DuckDuckGo HTML parsing
   - No API key needed
   - Returns top 5 results

2. **Book Search**
   - Searches through Firebase hosting structure.json
   - Finds books by title, subject, chapter
   - Prioritizes user's grade level

3. **Open Chapter**
   - AI can directly open any book for the user
   - Automatically navigates to Library
   - Opens ZIP and displays content

### 📍 Context Awareness:

The AI knows:
- User's name, grade, and email
- Current page (dashboard, library, profile)
- Currently viewing book/PDF
- Current folder location
- Full conversation history

### 🎯 Integration Points:

- **Dashboard**: Persistent chat with dashboard context
- **Library**: Chat knows current folder, books, and can open any book
- **PDF Viewer**: Chat knows which PDF is open
- **ZIP Browser**: Chat knows which folder user is in

## Testing

1. Start Convex: `npm run dev:backend`
2. Add the API key as shown above
3. Start frontend: `npm run dev:frontend`
4. Login and try:
   - "Search for mathematics books"
   - "Open Chapter 1 of Science"
   - "What is photosynthesis?" (web search)
   - "Show me all Class 5 books"

## Usage Examples

**Student asking for help:**
- "I need help with mathematics"
- AI searches books, suggests relevant chapters, can open them

**Looking for specific content:**
- "Find me books about the solar system"
- AI searches library, lists matches, offers to open

**General questions:**
- "What is the capital of France?"
- AI uses web search to answer

**Direct book access:**
- "Open the English textbook Chapter 3"
- AI finds and opens the book automatically

## Technical Details

- **Model**: meta-llama/llama-3.2-3b-instruct:free
- **Tool Support**: Function calling with 3 custom tools
- **Context Window**: Maintains last 6 messages for conversation
- **Response Time**: ~2-3 seconds per query
- **Cost**: Free tier (no charges)

## Troubleshooting

**Chat not working:**
1. Check OPENROUTER_API_KEY is set in Convex
2. Verify Convex backend is running
3. Check browser console for errors

**Book opening not working:**
1. Ensure book path is correct in structure.json
2. Check Firebase hosting CORS is enabled
3. Verify ZIP files are accessible

**Web search slow:**
1. DuckDuckGo HTML parsing can be slow
2. Consider implementing caching if needed
3. Results are simple but functional

## Future Enhancements

- [ ] Add caching for book search results
- [ ] Implement better web search (Brave API)
- [ ] Add image understanding for diagrams
- [ ] Voice input/output support
- [ ] Multi-language support
