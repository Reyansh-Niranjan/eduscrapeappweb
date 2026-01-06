# Handover Guide: AI Visual Search Implementation

## Current State
I have successfully implemented the **Deep Visual Search** feature for the EduScrape agent. This allows the AI to "read" books and "see" diagrams inside PDF files to answer user queries.

## Architecture
1.  **`convex/chatbot.ts`**: The main chat agent (Devstral model) now delegates book searches to a dedicated action.
    *   It calls `api.deepsearch.searchBooks` when the `book_search` tool is invoked.
2.  **`convex/deepsearch.ts`**: A new Node.js-based Action (`"use node";`).
    *   **Step 1:** Fetches `zips.json` from the host.
    *   **Step 2:** Uses AI (Gemini Flash) to identify the top 2 relevant ZIP files based on the file paths vs. User Query.
    *   **Step 3:** Downloads the ZIPs and extracts PDFs in memory using `JSZip`.
    *   **Step 4 (Visual Analysis):** Converts the first 3 PDFs to Base64 and sends them directly to **Gemini 2.0 Flash** (via OpenRouter) as a multimodal input.
    *   **Step 5:** The AI is prompted to describe diagrams and summarize relevant text.

## Build Status
*   **Fixed:** Replaced broken local PDF parsing libraries (`pdf-parse`, `pdfjs-dist`) which caused build errors in the Convex environment.
*   **Solution:** We now rely entirely on the **Vision Model** to parse the PDF, which is more powerful (handles images/charts) and eliminates heavy dependencies.
*   **Verification:** `npx convex dev --once` passes successfully.

## Next Steps for the Agent
1.  **Verify Runtime Behavior**: Test if OpenRouter/Gemini accepts the PDF `data:application/pdf` base64 content.
    *   *Note:* Some providers strictly require `image/png`. If PDF upload fails, the fallback strategy would be to rasterize the PDF using a cloud service or finding a pure-JS rasterizer.
2.  **Tweak Prompts**: Adjust the `visionPrompt` in `deepsearch.ts` if the summaries are too long or short.
3.  **Optimization**: Currently scans 3 PDFs per ZIP. Monitor latency.

## Key Files
- `convex/chatbot.ts`
- `convex/deepsearch.ts`
