"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import JSZip from "jszip";
import { PNG } from "pngjs";

const ZIPS_URL = "https://eduscrape-host.web.app/zips.json";

// FREE OpenRouter models - NO Gemini, NO API keys needed!
const TEXT_MODEL = "mistralai/devstral-2512:free"; // For routing/text tasks
const VISION_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free"; // For image analysis

let pdfiumModulePromise: Promise<any> | null = null;
let pdfiumLibraryInitialized = false;

async function getPdfiumModule(): Promise<any> {
    if (!pdfiumModulePromise) {
        pdfiumModulePromise = (async () => {
            const imported: any = await import("pdfium-wasm");
            const pdfium: any = imported?.default ?? imported;

            if (pdfium?.calledRun) return pdfium;

            await new Promise<void>((resolve) => {
                const prev = pdfium.onRuntimeInitialized;
                pdfium.onRuntimeInitialized = () => {
                    try {
                        if (typeof prev === "function") prev();
                    } finally {
                        resolve();
                    }
                };

                if (pdfium?.calledRun) resolve();
            });

            return pdfium;
        })();
    }
    return pdfiumModulePromise;
}

function safeParseJson(input: string): any {
    try {
        const cleaned = input.replace(/```json\n?|\n?```/g, "").trim();
        return JSON.parse(cleaned);
    } catch {
        return null;
    }
}

async function openRouterChat(args: {
    apiKey: string;
    model: string;
    messages: any[]; // relaxed type
    maxTokens?: number; // relaxed casing
    max_tokens?: number;
    temperature?: number;
}): Promise<any> {
    const body: any = {
        model: args.model,
        messages: args.messages,
        temperature: args.temperature ?? 0.7,
    };
    if (args.maxTokens) body.max_tokens = args.maxTokens;
    if (args.max_tokens) body.max_tokens = args.max_tokens;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${args.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://eduscrapeapp.com",
            "X-Title": "EduScrapeApp",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
    }

    return await response.json();
}

async function getZipsList(): Promise<any[]> {
    try {
        const response = await fetch(ZIPS_URL);
        if (!response.ok) return [];
        return await response.json();
    } catch (e) {
        console.error("Failed to fetch zips.json", e);
        return [];
    }
}

async function identifyRelevantZips(query: string, zips: any[], apiKey: string): Promise<string[]> {
    const paths = zips.map(z => z.path);
    const prompt = `User Query: "${query}"
  
Available File Paths:
${JSON.stringify(paths, null, 2)}

Task: Identify the top 2 file paths that are most likely to contain information about the User Query.
Return ONLY valid JSON: {"paths": ["path1", "path2"]}`;

    try {
        const response = await openRouterChat({
            apiKey,
            model: TEXT_MODEL, // Free Devstral model
            messages: [
                { role: "system", content: "You are a filesystem search agent. Return JSON." },
                { role: "user", content: prompt }
            ],
            maxTokens: 300,
            temperature: 0,
        });

        // Check various response formats
        const content = response.choices?.[0]?.message?.content || "";
        const parsed = safeParseJson(content);
        return parsed?.paths || [];
    } catch (e) {
        console.error("Failed to identify zips", e);
        return [];
    }
}

// Get total pages using PDFium (WASM; no DOMMatrix/canvas requirements).
async function getPdfTotalPages(pdfBuffer: Buffer): Promise<number> {
    try {
        const pdfium = await getPdfiumModule();

        const cwrap = pdfium.cwrap.bind(pdfium);
        const FPDF_InitLibrary = cwrap("FPDF_InitLibrary", null, []);
        const createDocFromBuffer = cwrap("createDocFromBuffer", "number", ["number", "number"]);
        const FPDFAvail_GetDocument = cwrap("FPDFAvail_GetDocument", "number", ["number", "number"]);
        const FPDFAvail_Destroy = cwrap("FPDFAvail_Destroy", null, ["number"]);
        const FPDF_GetPageCount = cwrap("FPDF_GetPageCount", "number", ["number"]);
        const FPDF_CloseDocument = cwrap("FPDF_CloseDocument", null, ["number"]);

        if (!pdfiumLibraryInitialized) {
            FPDF_InitLibrary();
            pdfiumLibraryInitialized = true;
        }

        const wasmPtr = pdfium._malloc(pdfBuffer.length);
        pdfium.HEAPU8.set(pdfBuffer, wasmPtr);

        const pdfAvail = createDocFromBuffer(wasmPtr, pdfBuffer.length);
        const doc = FPDFAvail_GetDocument(pdfAvail, 0);
        const pageCount = doc ? FPDF_GetPageCount(doc) : 0;

        if (doc) FPDF_CloseDocument(doc);
        if (pdfAvail) FPDFAvail_Destroy(pdfAvail);
        pdfium._free(wasmPtr);

        return pageCount || 0;
    } catch {
        return 0;
    }
}

// Extract text content using PDFium text APIs (WASM; no DOMMatrix/canvas requirements).
async function extractPdfText(pdfBuffer: Buffer): Promise<{ text: string; hasImages: boolean; pageCount: number }> {
    try {
        const pdfium = await getPdfiumModule();

        const cwrap = pdfium.cwrap.bind(pdfium);
        const FPDF_InitLibrary = cwrap("FPDF_InitLibrary", null, []);
        const createDocFromBuffer = cwrap("createDocFromBuffer", "number", ["number", "number"]);
        const FPDFAvail_GetDocument = cwrap("FPDFAvail_GetDocument", "number", ["number", "number"]);
        const FPDFAvail_Destroy = cwrap("FPDFAvail_Destroy", null, ["number"]);
        const FPDF_GetPageCount = cwrap("FPDF_GetPageCount", "number", ["number"]);
        const FPDF_LoadPage = cwrap("FPDF_LoadPage", "number", ["number", "number"]);
        const FPDF_ClosePage = cwrap("FPDF_ClosePage", null, ["number"]);
        const FPDF_CloseDocument = cwrap("FPDF_CloseDocument", null, ["number"]);

        const FPDFText_LoadPage = cwrap("FPDFText_LoadPage", "number", ["number"]);
        const FPDFText_ClosePage = cwrap("FPDFText_ClosePage", null, ["number"]);
        const FPDFText_CountChars = cwrap("FPDFText_CountChars", "number", ["number"]);
        const FPDFText_GetText = cwrap("FPDFText_GetText", "number", ["number", "number", "number", "number"]);

        if (!pdfiumLibraryInitialized) {
            FPDF_InitLibrary();
            pdfiumLibraryInitialized = true;
        }

        const wasmPtr = pdfium._malloc(pdfBuffer.length);
        pdfium.HEAPU8.set(pdfBuffer, wasmPtr);

        const pdfAvail = createDocFromBuffer(wasmPtr, pdfBuffer.length);
        const doc = FPDFAvail_GetDocument(pdfAvail, 0);
        const total = doc ? FPDF_GetPageCount(doc) : 0;
        const numPages = Math.min(total || 0, 5);
        let fullText = "";

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = FPDF_LoadPage(doc, pageNum - 1);
            if (!page) continue;

            try {
                const textPage = FPDFText_LoadPage(page);
                if (!textPage) {
                    fullText += `\n[Page ${pageNum}]\n\n`;
                    continue;
                }

                try {
                    const charCount = FPDFText_CountChars(textPage);
                    if (!charCount || charCount <= 0) {
                        fullText += `\n[Page ${pageNum}]\n\n`;
                        continue;
                    }

                    // PDFium returns UTF-16LE into a buffer of unsigned shorts.
                    const outChars = charCount + 1;
                    const outBytes = outChars * 2;
                    const textPtr = pdfium._malloc(outBytes);

                    try {
                        // Returns number of characters written including the null terminator.
                        const written = FPDFText_GetText(textPage, 0, outChars, textPtr);
                        const len = Math.max(0, (written || 0) - 1);
                        const start = textPtr >>> 1;
                        const slice = pdfium.HEAPU16.subarray(start, start + len);
                        const pageText = String.fromCharCode(...slice).replace(/\u0000/g, "");
                        fullText += `\n[Page ${pageNum}]\n${pageText}\n`;
                    } finally {
                        pdfium._free(textPtr);
                    }
                } finally {
                    FPDFText_ClosePage(textPage);
                }
            } finally {
                FPDF_ClosePage(page);
            }
        }

        if (doc) FPDF_CloseDocument(doc);
        if (pdfAvail) FPDFAvail_Destroy(pdfAvail);
        pdfium._free(wasmPtr);

        // We don't reliably detect images here; vision rendering covers visuals.
        return { text: fullText, hasImages: false, pageCount: numPages };
    } catch (e) {
        console.error("[DEBUG] PDF text extraction error:", e);
        return { text: "", hasImages: false, pageCount: 0 };
    }
}

// Convert PDF pages to PNG images using PDFium (WASM) + pngjs (pure JS encoder).
// This actually RENDERS pages (diagrams/charts/text) and needs NO API keys.
async function renderPdfPagesToImages(
    pdfBuffer: Buffer,
    opts?: { pageIndices?: number[]; maxPages?: number; scale?: number }
): Promise<string[]> {
    const images: string[] = [];

    try {
        const pdfium = await getPdfiumModule();

        const cwrap = pdfium.cwrap.bind(pdfium);
        const FPDF_InitLibrary = cwrap("FPDF_InitLibrary", null, []);
        const createDocFromBuffer = cwrap("createDocFromBuffer", "number", ["number", "number"]);
        const FPDFAvail_GetDocument = cwrap("FPDFAvail_GetDocument", "number", ["number", "number"]);
        const FPDFAvail_Destroy = cwrap("FPDFAvail_Destroy", null, ["number"]);
        const FPDF_GetPageCount = cwrap("FPDF_GetPageCount", "number", ["number"]);
        const FPDF_LoadPage = cwrap("FPDF_LoadPage", "number", ["number", "number"]);
        const FPDF_ClosePage = cwrap("FPDF_ClosePage", null, ["number"]);
        const FPDF_CloseDocument = cwrap("FPDF_CloseDocument", null, ["number"]);
        const FPDF_GetPageWidthF = cwrap("FPDF_GetPageWidthF", "number", ["number"]);
        const FPDF_GetPageHeightF = cwrap("FPDF_GetPageHeightF", "number", ["number"]);
        const FPDFBitmap_Create = cwrap("FPDFBitmap_Create", "number", ["number", "number", "number"]);
        const FPDFBitmap_Destroy = cwrap("FPDFBitmap_Destroy", null, ["number"]);
        const FPDFBitmap_FillRect = cwrap("FPDFBitmap_FillRect", null, ["number", "number", "number", "number", "number", "number"]);
        const FPDFBitmap_GetBuffer = cwrap("FPDFBitmap_GetBuffer", "number", ["number"]);
        const FPDFBitmap_GetStride = cwrap("FPDFBitmap_GetStride", "number", ["number"]);
        const FPDF_RenderPageBitmap = cwrap(
            "FPDF_RenderPageBitmap",
            null,
            ["number", "number", "number", "number", "number", "number", "number", "number"]
        );

        if (!pdfiumLibraryInitialized) {
            FPDF_InitLibrary();
            pdfiumLibraryInitialized = true;
        }

        const wasmPtr = pdfium._malloc(pdfBuffer.length);
        pdfium.HEAPU8.set(pdfBuffer, wasmPtr);

        const pdfAvail = createDocFromBuffer(wasmPtr, pdfBuffer.length);
        const doc = FPDFAvail_GetDocument(pdfAvail, 0);
        const pageCount = FPDF_GetPageCount(doc);

        const scale = opts?.scale ?? 2.0;
        const flags = 0;

        const pageIndices = (() => {
            if (opts?.pageIndices?.length) {
                return opts.pageIndices.filter((i) => Number.isInteger(i) && i >= 0 && i < pageCount);
            }
            const maxPages = Math.min(opts?.maxPages ?? pageCount, pageCount);
            return Array.from({ length: maxPages }, (_, i) => i);
        })();

        for (const pageIndex of pageIndices) {
            const page = FPDF_LoadPage(doc, pageIndex);
            if (!page) continue;

            try {
                const widthPt = FPDF_GetPageWidthF(page);
                const heightPt = FPDF_GetPageHeightF(page);
                const width = Math.max(1, Math.floor(widthPt * scale));
                const height = Math.max(1, Math.floor(heightPt * scale));

                const bitmap = FPDFBitmap_Create(width, height, 1);
                if (!bitmap) {
                    FPDF_ClosePage(page);
                    continue;
                }

                try {
                    // White background
                    FPDFBitmap_FillRect(bitmap, 0, 0, width, height, 0xffffffff);
                    FPDF_RenderPageBitmap(bitmap, page, 0, 0, width, height, 0, flags);

                    const bufferPtr = FPDFBitmap_GetBuffer(bitmap);
                    const stride = FPDFBitmap_GetStride(bitmap);
                    const byteLen = stride * height;
                    const src = pdfium.HEAPU8.subarray(bufferPtr, bufferPtr + byteLen);

                    // PDFium gives BGRA; pngjs wants RGBA.
                    const png = new PNG({ width, height });
                    for (let y = 0; y < height; y++) {
                        const rowSrc = y * stride;
                        const rowDst = y * width * 4;
                        for (let x = 0; x < width; x++) {
                            const si = rowSrc + x * 4;
                            const di = rowDst + x * 4;
                            png.data[di] = src[si + 2];
                            png.data[di + 1] = src[si + 1];
                            png.data[di + 2] = src[si];
                            png.data[di + 3] = src[si + 3];
                        }
                    }

                    const out = PNG.sync.write(png);
                    images.push(out.toString("base64"));
                } finally {
                    FPDFBitmap_Destroy(bitmap);
                }
            } finally {
                FPDF_ClosePage(page);
            }
        }

        FPDF_CloseDocument(doc);
        FPDFAvail_Destroy(pdfAvail);
        pdfium._free(wasmPtr);

        // Note: we intentionally do NOT call FPDF_DestroyLibrary() to avoid re-init costs.
        return images;
    } catch (e) {
        console.log("[DEBUG] renderPdfPagesToImages(render) failed:", e);
        return [];
    }
}

async function pdfToImages(pdfBuffer: Buffer, opts?: { maxPages?: number }): Promise<string[]> {
    return await renderPdfPagesToImages(pdfBuffer, { maxPages: opts?.maxPages ?? 3 });
}

export const renderPdfPageFromUrl = action({
    args: {
        url: v.string(),
        pageNumber: v.number(), // 1-based
    },
    returns: v.string(),
    handler: async (ctx, args) => {
        void ctx;
        const pageIndex = Math.max(0, Math.floor(args.pageNumber) - 1);

        const response = await fetch(args.url);
        if (!response.ok) return "";

        const arrayBuf = await response.arrayBuffer();
        const buf = Buffer.from(arrayBuf);

        const images = await renderPdfPagesToImages(buf, { pageIndices: [pageIndex] });
        return images[0] ?? "";
    },
});

async function scanZipAndExtract(url: string, query: string, apiKey: string): Promise<string> {
    try {
        console.log(`[DEBUG] Downloading ZIP: ${url}`);
        const response = await fetch(url);
        if (!response.ok) return "";

        const buffer = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(buffer);

        const pdfFiles = Object.keys(zip.files).filter(name => name.toLowerCase().endsWith(".pdf") && !name.startsWith("__MACOSX"));
        let findings = "";

        // Check first 3 PDFs
        const filesToScan = pdfFiles.slice(0, 3);
        console.log(`[DEBUG] Scanning ${filesToScan.length} PDFs in zip...`);

        for (const filename of filesToScan) {
            try {
                const fileData = await zip.file(filename)?.async("nodebuffer");
                if (!fileData) continue;

                console.log(`[DEBUG] Processing ${filename}...`);

                // STEP 1: Convert PDF to images for vision (FREE via PDFium WASM)
                // IMPORTANT: Analyze ALL pages (in small batches) to avoid request-size limits.
                const totalPages = await getPdfTotalPages(fileData);
                
                // STEP 2: Also extract text as backup
                const { text: pdfText, hasImages: pdfHasImages, pageCount } = await extractPdfText(fileData);
                console.log(`[DEBUG] Extracted ${pdfText.length} chars from ${pageCount} pages`);

                let analyzed = false;

                // STEP 3: Use vision model if we have images
                if (totalPages > 0) {
                    const batchSize = 3;
                    const visualMatches: string[] = [];

                    for (let startPage = 1; startPage <= totalPages; startPage += batchSize) {
                        const endPage = Math.min(totalPages, startPage + batchSize - 1);
                        const pageIndices = Array.from(
                            { length: endPage - startPage + 1 },
                            (_, i) => (startPage - 1) + i
                        );

                        const images = await renderPdfPagesToImages(fileData, { pageIndices });
                        if (images.length === 0) continue;

                        console.log(`[DEBUG] Sending pages ${startPage}-${endPage} (${images.length} imgs) from ${filename} to Vision AI...`);

                        const visionPrompt = `I am providing pages ${startPage}-${endPage} from a PDF document titled "${filename}".
User Query: "${query}"

Task:
1. Carefully examine ALL visual content: diagrams, charts, graphs, formulas, tables, and text.
2. Look for information that answers the User Query.
3. If you find relevant content:
   - Summarize the key textual information
   - DESCRIBE any relevant diagrams/charts in detail (what they show, labels, relationships)
   - Include any formulas or numerical data
4. If the content is not relevant to the query, respond with just "NO MATCH".`;

                        const contentParts: any[] = [{ type: "text", text: visionPrompt }];
                        for (const imgBase64 of images) {
                            contentParts.push({
                                type: "image_url",
                                image_url: { url: `data:image/png;base64,${imgBase64}` }
                            });
                        }

                        try {
                            const visionResponse = await openRouterChat({
                                apiKey,
                                model: VISION_MODEL,
                                messages: [{ role: "user", content: contentParts }],
                                maxTokens: 1000
                            });

                            const vidOutput = visionResponse.choices?.[0]?.message?.content || "";
                            console.log(`[DEBUG] Vision Output (${startPage}-${endPage}): ${vidOutput.slice(0, 100)}...`);

                            if (!vidOutput.includes("NO MATCH") && vidOutput.length > 20) {
                                visualMatches.push(`(pages ${startPage}-${endPage})\n${vidOutput}`);
                            }
                        } catch (visionError) {
                            console.log(`[DEBUG] Vision AI error on ${filename} pages ${startPage}-${endPage}:`, visionError);
                        }
                    }

                    if (visualMatches.length > 0) {
                        findings += `\n- **${filename}** (📊 Visual Analysis):\n${visualMatches.join("\n\n")}\n`;
                        analyzed = true;
                    }
                }
                
                // STEP 4: Fallback to text analysis if vision didn't work or no images
                if (!analyzed && pdfText.length > 100) {
                    console.log(`[DEBUG] Using text-based analysis for ${filename}...`);
                    
                    const textPrompt = `I extracted text from a PDF document titled "${filename}".
${pdfHasImages ? "NOTE: This PDF contains diagrams/images that I couldn't render, but I'll analyze the text context around them." : ""}

User Query: "${query}"

Extracted Text (first ${pageCount} pages):
---
${pdfText.slice(0, 8000)}
---

Task:
1. Search the text for information relevant to the User Query.
2. If you find relevant content, summarize the key points.
3. ${pdfHasImages ? "If the text references diagrams/figures, describe what they likely show based on context." : ""}
4. If nothing relevant is found, respond with just "NO MATCH".`;

                    try {
                        const textResponse = await openRouterChat({
                            apiKey,
                            model: TEXT_MODEL, // Free Devstral model
                            messages: [
                                { role: "system", content: "You are a helpful research assistant analyzing PDF documents." },
                                { role: "user", content: textPrompt }
                            ],
                            maxTokens: 1000
                        });

                        const textOutput = textResponse.choices?.[0]?.message?.content || "";
                        console.log(`[DEBUG] Text Analysis Output: ${textOutput.slice(0, 100)}...`);

                        if (!textOutput.includes("NO MATCH") && textOutput.length > 20) {
                            const analysisType = pdfHasImages ? "📝 Text + Figure References" : "📝 Text Analysis";
                            findings += `\n- **${filename}** (${analysisType}):\n${textOutput}\n`;
                        }
                    } catch (textError) {
                        console.log(`[DEBUG] Text AI error on ${filename}:`, textError);
                    }
                }

            } catch (parseError) {
                console.error(`Failed to process PDF ${filename}`, parseError);
            }
        }

        return findings;
    } catch (e) {
        console.error(`Failed to scan zip ${url}`, e);
        return "";
    }
}

export const searchBooks = action({
    args: { query: v.string() },
    returns: v.string(),
    handler: async (ctx, args) => {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) return "Error: No API Key configured.";

        try {
            console.log(`[DEBUG] Deep Search (Node Runtime): "${args.query}"`);
            const zips = await getZipsList();
            if (zips.length === 0) return "Error: Library unavailable.";

            const targetPaths = await identifyRelevantZips(args.query, zips, apiKey);
            console.log(`[DEBUG] Targets:`, targetPaths);

            if (targetPaths.length === 0) {
                return `I couldn't identify any relevant books for "${args.query}".`;
            }

            let combinedResults = `Deep Search Results for "${args.query}":\n`;
            let foundAny = false;

            for (const path of targetPaths) {
                const zipEntry = zips.find(z => z.path === path);
                if (!zipEntry?.url) continue;

                const extraction = await scanZipAndExtract(zipEntry.url, args.query, apiKey);
                if (extraction) {
                    combinedResults += `\n📂 **Source: ${path}**${extraction}\n`;
                    foundAny = true;
                }
            }

            if (!foundAny) {
                return `I checked ${targetPaths.length} books but found no direct matches.`;
            }

            return combinedResults;
        } catch (error) {
            console.error("Deep search error", error);
            return `Deep search failed: ${error instanceof Error ? error.message : "Unknown"}`;
        }
    }
});
