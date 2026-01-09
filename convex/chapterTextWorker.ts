"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { PNG } from "pngjs";

const DEFAULT_VISION_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free";
const FALLBACK_VISION_MODEL = "qwen/qwen-2.5-vl-7b-instruct:free";

function getVisionModels(): string[] {
  const raw = process.env.OPENROUTER_VISION_MODELS;
  const envSingle = process.env.OPENROUTER_VISION_MODEL;

  const parts = (raw
    ? raw.split(/[\n,]/g)
    : envSingle
      ? [envSingle]
      : [
        DEFAULT_VISION_MODEL,
        FALLBACK_VISION_MODEL,
      ])
    .map((s) => s.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const models: string[] = [];
  for (const m of parts) {
    if (seen.has(m)) continue;
    seen.add(m);
    models.push(m);
  }

  return models.length > 0 ? models : [DEFAULT_VISION_MODEL, FALLBACK_VISION_MODEL];
}

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function openRouterChatSafe(args: {
  apiKey: string;
  models: string[];
  prompt: string;
  imageDataUrl: string;
}): Promise<{ ok: true; text: string; model: string } | { ok: false; error: string }> {
  const url = "https://openrouter.ai/api/v1/chat/completions";
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${args.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://eduscrapeapp.com",
          "X-Title": "EduScrapeApp",
        },
        body: JSON.stringify({
          ...(args.models.length > 1
            ? { models: args.models, route: "fallback" as const }
            : { model: args.models[0] }),
          messages: [
            { role: "system", content: "You are an OCR + study-note agent." },
            {
              role: "user",
              content: [
                { type: "text", text: args.prompt },
                { type: "image_url", image_url: { url: args.imageDataUrl } },
              ],
            },
          ],
          max_tokens: 1800,
          temperature: 0.2,
        }),
      });

      const bodyText = await response.text();
      if (response.ok) {
        const json = JSON.parse(bodyText);
        const content: string = json?.choices?.[0]?.message?.content ?? "";
        const usedModel = String(json?.model ?? args.models[0] ?? DEFAULT_VISION_MODEL);
        return { ok: true, text: String(content), model: usedModel };
      }

      const retryableStatuses = new Set([429, 500, 502, 503, 504]);
      if (retryableStatuses.has(response.status) && attempt < maxAttempts) {
        const backoffMs = response.status === 429
          ? Math.min(10000, 2000 * Math.pow(2, attempt - 1))
          : Math.min(2500, 300 * Math.pow(2, attempt - 1));
        await sleep(backoffMs);
        continue;
      }

      return { ok: false, error: `OpenRouter API error: ${response.status} ${response.statusText} ${bodyText}` };
    } catch (e) {
      if (attempt < maxAttempts) {
        await sleep(Math.min(2500, 300 * Math.pow(2, attempt - 1)));
        continue;
      }
      return { ok: false, error: `OpenRouter request failed: ${String(e)}` };
    }
  }

  return { ok: false, error: "OpenRouter API error: exceeded retries" };
}

function clampText(input: string, maxChars: number): string {
  const normalized = String(input ?? "").trim();
  if (normalized.length <= maxChars) return normalized;
  return normalized.slice(0, maxChars);
}

async function renderPdfPageToPngDataUrl(pdfBuffer: Buffer, pageNumber: number): Promise<string> {
  const pdfium = await getPdfiumModule();

  const cwrap = pdfium.cwrap.bind(pdfium);
  const FPDF_InitLibrary = cwrap("FPDF_InitLibrary", null, []);
  const createDocFromBuffer = cwrap("createDocFromBuffer", "number", ["number", "number"]);
  const FPDFAvail_GetDocument = cwrap("FPDFAvail_GetDocument", "number", ["number", "number"]);
  const FPDFAvail_Destroy = cwrap("FPDFAvail_Destroy", null, ["number"]);
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

  try {
    const pdfAvail = createDocFromBuffer(wasmPtr, pdfBuffer.length);
    const doc = FPDFAvail_GetDocument(pdfAvail, 0);
    if (!doc) {
      if (pdfAvail) FPDFAvail_Destroy(pdfAvail);
      return "";
    }

    const pageIndex = Math.max(0, Math.floor(pageNumber) - 1);
    const page = FPDF_LoadPage(doc, pageIndex);
    if (!page) {
      FPDF_CloseDocument(doc);
      FPDFAvail_Destroy(pdfAvail);
      return "";
    }

    try {
      const scale = 2.0;
      const flags = 0;
      const widthPt = FPDF_GetPageWidthF(page);
      const heightPt = FPDF_GetPageHeightF(page);
      const width = Math.max(1, Math.floor(widthPt * scale));
      const height = Math.max(1, Math.floor(heightPt * scale));

      const bitmap = FPDFBitmap_Create(width, height, 1);
      if (!bitmap) return "";

      try {
        FPDFBitmap_FillRect(bitmap, 0, 0, width, height, 0xffffffff);
        FPDF_RenderPageBitmap(bitmap, page, 0, 0, width, height, 0, flags);

        const bufferPtr = FPDFBitmap_GetBuffer(bitmap);
        const stride = FPDFBitmap_GetStride(bitmap);
        const byteLen = stride * height;
        const src = pdfium.HEAPU8.subarray(bufferPtr, bufferPtr + byteLen);

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
        return `data:image/png;base64,${out.toString("base64")}`;
      } finally {
        FPDFBitmap_Destroy(bitmap);
      }
    } finally {
      FPDF_ClosePage(page);
      FPDF_CloseDocument(doc);
      FPDFAvail_Destroy(pdfAvail);
    }
  } finally {
    pdfium._free(wasmPtr);
  }
}

export const processJobBatch = internalAction({
  args: { jobId: v.id("chapterTextJobs") },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(internal.chapterTextJobs.getJobInternal, { jobId: args.jobId });
    if (!job) return { ok: true };
    if (job.status !== "running") return { ok: true };

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      await ctx.runMutation(internal.chapterTextJobs.setJobPausedInternal, {
        jobId: args.jobId,
        error: "OpenRouter API key is not configured",
      });
      return { ok: false };
    }

    // Download PDF once per batch.
    let pdfBuffer: Buffer;
    try {
      const resp = await fetch(job.pdfUrl);
      if (!resp.ok) {
        await ctx.runMutation(internal.chapterTextJobs.setJobPausedInternal, {
          jobId: args.jobId,
          error: `Failed to download PDF: ${resp.status} ${resp.statusText}`,
        });
        return { ok: false };
      }
      const arrayBuf = await resp.arrayBuffer();
      pdfBuffer = Buffer.from(arrayBuf);
    } catch (e) {
      await ctx.runMutation(internal.chapterTextJobs.setJobPausedInternal, {
        jobId: args.jobId,
        error: `Failed to download PDF: ${String(e)}`,
      });
      return { ok: false };
    }

    const models = getVisionModels();
    const primaryModel = models[0] ?? DEFAULT_VISION_MODEL;

    const batchSize = 1; // strict sequential: page 1, then page 2, ...
    let nextPage = Math.max(1, job.nextPageNumber);

    for (let processed = 0; processed < batchSize; processed++) {
      if (nextPage > job.totalPages) {
        await ctx.runMutation(internal.chapterTextJobs.setJobCompletedInternal, { jobId: args.jobId });
        return { ok: true };
      }

      const exists = await ctx.runQuery(internal.chapterText.isPageExtractedInternal, {
        chapterId: job.chapterId,
        pageNumber: nextPage,
      });

      if (exists?.exists) {
        nextPage += 1;
        continue;
      }

      const prompt = `You are reading a single page of a school textbook PDF.

Task:
- TRANSCRIBE all visible text exactly (keep headings, bullet points, formulas).
- If the page includes diagrams/images/graphs, describe them EXTREMELY DETAILED and explain what they show.
- If there are labels in a diagram, include the labels and what they point to.
- Output plain text only (no JSON, no markdown fences).

Page number: ${nextPage}
Be thorough.`;

      const imageDataUrl = await renderPdfPageToPngDataUrl(pdfBuffer, nextPage);
      if (!imageDataUrl) {
        await ctx.runMutation(internal.chapterTextJobs.setJobPausedInternal, {
          jobId: args.jobId,
          error: `Failed to render page ${nextPage} to image`,
        });
        return { ok: false };
      }

      const result = await openRouterChatSafe({ apiKey, models, prompt, imageDataUrl });
      if (!result.ok) {
        await ctx.runMutation(internal.chapterTextJobs.setJobPausedInternal, {
          jobId: args.jobId,
          error: result.error,
        });
        // Retry later automatically.
        await ctx.runMutation(internal.chapterTextJobs.scheduleJobBatchInternal, {
          jobId: args.jobId,
          delayMs: 60_000,
        });
        return { ok: false };
      }

      const cleaned = clampText(result.text, 12000);

      // Track which model OpenRouter actually used (for fallback visibility in UI).
      await ctx.runMutation(internal.chapterTextJobs.setJobModelInfoInternal, {
        jobId: args.jobId,
        lastPrimaryModel: primaryModel,
        lastUsedModel: result.model,
        fallbackActive: result.model !== primaryModel,
      });

      await ctx.runMutation(internal.chapterText.upsertChapterPageTextInternal, {
        chapterId: job.chapterId,
        pageNumber: nextPage,
        content: cleaned,
        model: result.model,
        userId: job.userId,
      });

      nextPage += 1;
    }

    await ctx.runMutation(internal.chapterTextJobs.setJobProgressInternal, {
      jobId: args.jobId,
      nextPageNumber: nextPage,
    });

    // Schedule next page quickly.
    await ctx.runMutation(internal.chapterTextJobs.scheduleJobBatchInternal, {
      jobId: args.jobId,
      delayMs: 500,
    });

    return { ok: true };
  },
});
