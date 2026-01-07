import { useMemo, useState, useEffect, useRef } from "react";
import { Download, ExternalLink } from "lucide-react";
import { Document, Page } from "react-pdf";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";

interface PDFFile {
  name: string;
  url: string;
  blob: Blob;
  sourceUrl?: string;
}

interface PDFViewerProps {
  pdf: PDFFile;
  pageNumber: number;
  numPages: number | null;
  viewerError: string | null;
  onPageChange: (page: number) => void;
  onLoadSuccess: (numPages: number) => void;
  onLoadError: (error: string) => void;
  onDownload: () => void;
  onClose: () => void;
  chapterId?: string;
  hasQuiz: boolean;
  onStartQuiz: (chapterId: string) => void;
  onGenerateQuiz?: (chapterId: string) => Promise<void>;
}

export default function PDFViewer({
  pdf,
  pageNumber,
  numPages,
  viewerError,
  onPageChange,
  onLoadSuccess,
  onLoadError,
  onDownload,
  onClose,
  chapterId,
  hasQuiz,
  onStartQuiz,
  onGenerateQuiz,
}: PDFViewerProps) {
  const debug = (...args: any[]) => {
    try {
      // Vite/React: keep noise mostly in dev.
      if (typeof import.meta !== "undefined" && (import.meta as any).env?.DEV) {
        console.debug("[PDFViewer]", ...args);
      }
    } catch {
      // ignore
    }
  };

  const [quizPromptShown, setQuizPromptShown] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [viewerOpenedAt, setViewerOpenedAt] = useState<number>(() => Date.now());
  const [chapterCompletionAttempted, setChapterCompletionAttempted] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  const markChapterCompleted = useMutation(api.progress.markChapterCompleted);
  const extractChapterPageText = useAction(api.chapterText.extractChapterPageText);
  const startChapterTextJob = useAction(api.chapterText.startChapterTextJob);
  const jobStatus = useQuery(
    api.chapterTextJobs.getJobStatusByChapter,
    chapterId ? { chapterId: chapterId as Id<"chapters"> } : "skip"
  );
  const [pageExtractionInFlight, setPageExtractionInFlight] = useState(false);
  const extractedPagesRef = useRef<Set<number>>(new Set());
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const lastExtractionToastAtRef = useRef<number>(0);
  const lastStartedJobRef = useRef<string>("");
  const lastFallbackToastKeyRef = useRef<string>("");

  // Server-side extraction handles sequential pages; no offscreen renderer needed.

  const notifyExtractionTemporaryError = () => {
    const now = Date.now();
    // Avoid spamming a toast for every page.
    if (now - lastExtractionToastAtRef.current < 15_000) return;
    lastExtractionToastAtRef.current = now;

    toast.error("Can't extract chapter info due to a temporary server error.", {
      description: (
        <span>
          Open an issue on GitHub:{" "}
          <a
            href="https://github.com/Reyansh-Niranjan/eduscrapeappweb"
            target="_blank"
            rel="noreferrer noopener"
            className="underline"
          >
            https://github.com/Reyansh-Niranjan/eduscrapeappweb
          </a>
        </span>
      ),
    });
  };

  useEffect(() => {
    setViewerOpenedAt(Date.now());
    setChapterCompletionAttempted(false);
    setQuizPromptShown(false);
    setShowQuizModal(false);
    extractedPagesRef.current = new Set();
    lastStartedJobRef.current = "";

    debug("opened", {
      name: pdf.name,
      url: pdf.url,
      sourceUrl: pdf.sourceUrl,
      initialPageNumber: pageNumber,
      chapterId,
      hasQuiz,
    });
  }, [pdf.url]);

  useEffect(() => {
    if (!chapterId) return;
    if (!jobStatus) return;

    if (jobStatus.fallbackActive && jobStatus.lastUsedModel) {
      const key = `${chapterId}:${jobStatus.lastUsedModel}`;
      if (lastFallbackToastKeyRef.current === key) return;
      lastFallbackToastKeyRef.current = key;

      // Keep the message specific to the requested behavior.
      toast("Qwen model is down; using NVIDIA fallback for extraction.", {
        description: `Now using: ${jobStatus.lastUsedModel}`,
      });
    }
  }, [chapterId, jobStatus]);

  const pickNextUnextractedPage = (startAt: number, totalPages: number): number | null => {
    for (let p = Math.max(1, startAt); p <= totalPages; p++) {
      if (!extractedPagesRef.current.has(p)) return p;
    }
    return null;
  };

  const handlePageRendered = async () => {
    if (!chapterId) return;
    if (pageExtractionInFlight) return;
    if (extractedPagesRef.current.has(pageNumber)) return;

    const canvas = pageContainerRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;

    try {
      setPageExtractionInFlight(true);
      extractedPagesRef.current.add(pageNumber);

      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.75);
      const result = await extractChapterPageText({
        chapterId: chapterId as Id<"chapters">,
        pageNumber,
        imageDataUrl,
      });

      if (!result?.ok) {
        extractedPagesRef.current.delete(pageNumber);
        notifyExtractionTemporaryError();
      }
    } catch (e) {
      // Allow retry on failure.
      extractedPagesRef.current.delete(pageNumber);
      debug("page text extraction failed", e);
      notifyExtractionTemporaryError();
    } finally {
      setPageExtractionInFlight(false);
    }
  };

  const handleAutoExtractRendered = async () => {
    return;
  };

  useEffect(() => {
    debug("state", {
      pageNumber,
      numPages,
      chapterId,
      hasQuiz,
      quizPromptShown,
      showQuizModal,
    });
  }, [pageNumber, numPages, chapterId, hasQuiz, quizPromptShown, showQuizModal]);

  const pageWidth = useMemo(() => {
    // Match the max-width container (max-w-5xl = 1024px) minus its horizontal padding.
    // This prevents horizontal overflow that looks like a big blank area beside the PDF.
    if (typeof window === "undefined") return 960;
    const containerMax = 1024;
    const containerPaddingX = 32; // px-4
    const viewportPaddingX = 32;
    return Math.min(
      containerMax - containerPaddingX,
      window.innerWidth - viewportPaddingX
    );
  }, []);

  // Check if on last page and show end-of-chapter prompt.
  // This intentionally does NOT depend on chapterId, so users still get feedback
  // even if the PDF hasn't been mapped to a chapter yet.
  useEffect(() => {
    if (numPages && pageNumber === numPages && !quizPromptShown) {
      debug("last-page reached -> opening modal", { pageNumber, numPages, chapterId, hasQuiz });
      setShowQuizModal(true);
      setQuizPromptShown(true);
    }
  }, [pageNumber, numPages, quizPromptShown]);

  // If there's NO quiz for this chapter, finishing the last page should mark the chapter completed (XP).
  useEffect(() => {
    if (!chapterId) return;
    if (hasQuiz) return;
    if (!numPages) return;
    if (pageNumber !== numPages) return;
    if (chapterCompletionAttempted) return;

    setChapterCompletionAttempted(true);

    (async () => {
      try {
        const timeSpent = Math.max(1, Math.floor((Date.now() - viewerOpenedAt) / 1000));
        await markChapterCompleted({
          chapterId: chapterId as Id<"chapters">,
          timeSpent,
          pagesRead: numPages,
          totalPages: numPages,
        });
      } catch {
        // If already completed or any failure, keep viewer UX unchanged.
      }
    })();
  }, [chapterId, hasQuiz, numPages, pageNumber, chapterCompletionAttempted, viewerOpenedAt, markChapterCompleted]);

  const options = useMemo(() => ({
    isEvalSupported: false,
    useSystemFonts: true,
    // WASM configuration for JPEG2000 image support
    wasmUrl: '/pdfjs-wasm/',
    // Standard fonts for better PDF rendering
    standardFontDataUrl: '/standard_fonts/',
  }), []);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      <div className="flex items-center justify-between p-4 bg-gray-900 text-white gap-3 flex-wrap">
        <div className="flex flex-col gap-1 min-w-0">
          <h2 className="text-lg font-semibold truncate" title={pdf.name}>
            {pdf.name}
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            {numPages ? `${pageNumber} / ${numPages} pages` : "Loading PDF..."}
            {viewerError && <span className="text-red-300">{viewerError}</span>}
            {chapterId && jobStatus && (
              <span className="text-gray-300">
                | Extraction: <span className="font-medium text-white">{jobStatus.status}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-gray-800/70 rounded-lg px-2 py-1 text-sm">
            <button
              onClick={() => onPageChange(Math.max(1, pageNumber - 1))}
              disabled={pageNumber <= 1}
              className="px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Prev
            </button>
            <span className="px-2">Page {pageNumber}</span>
            <button
              onClick={() => onPageChange(Math.min(numPages || pageNumber, pageNumber + 1))}
              disabled={!numPages || pageNumber >= (numPages || 1)}
              className="px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>

          <button
            onClick={() => window.open(pdf.url, "_blank", "noopener,noreferrer")}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            New tab
          </button>
          <button
            onClick={onDownload}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-950">
        <div className="mx-auto max-w-5xl py-6 px-4">
          <Document
            key={pdf.url}
            file={pdf.url}
            options={options}
            onLoadSuccess={({ numPages: loadedPages }) => {
              debug("onLoadSuccess", { loadedPages });
              onLoadSuccess(loadedPages);

              // Start server-side sequential extraction job.
              if (chapterId && pdf.sourceUrl) {
                const jobKey = `${chapterId}::${pdf.sourceUrl}::${loadedPages}`;
                if (lastStartedJobRef.current !== jobKey) {
                  lastStartedJobRef.current = jobKey;
                  void startChapterTextJob({
                    chapterId: chapterId as Id<"chapters">,
                    pdfUrl: pdf.sourceUrl,
                    totalPages: loadedPages,
                  }).catch((e) => {
                    debug("startChapterTextJob failed", e);
                    notifyExtractionTemporaryError();
                  });
                }
              }

              // Optional: still extract the currently visible page immediately (better UX),
              // while the server job continues the rest.
              void handlePageRendered();
            }}
            onLoadError={(err) => {
              debug("onLoadError", { err });
              onLoadError("Could not render this PDF. Try download/new tab.");
            }}
            loading={<div className="text-center text-gray-300 py-6">Loading PDF...</div>}
            error={<div className="text-center text-red-300 py-6">Unable to load PDF.</div>}
          >
            <div className="flex justify-center" ref={pageContainerRef}>
              <Page
                pageNumber={pageNumber}
                width={pageWidth}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                onRenderSuccess={() => {
                  void handlePageRendered();
                }}
              />
            </div>

          </Document>
        </div>
      </div>

      {/* End-of-chapter Prompt Modal */}
      {showQuizModal && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Chapter Complete!
            </h3>
            {hasQuiz && chapterId ? (
              <>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  You've reached the end of this chapter. Would you like to take the quiz to test your knowledge?
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      debug("modal: skip-for-now clicked");
                      setShowQuizModal(false);
                      if (!chapterId || !numPages) return;
                      if (chapterCompletionAttempted) return;

                      setChapterCompletionAttempted(true);
                      void (async () => {
                        try {
                          const timeSpent = Math.max(1, Math.floor((Date.now() - viewerOpenedAt) / 1000));
                          await markChapterCompleted({
                            chapterId: chapterId as Id<"chapters">,
                            timeSpent,
                            pagesRead: numPages,
                            totalPages: numPages,
                          });
                        } catch {
                          // Keep viewer UX unchanged.
                        }
                      })();
                    }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={() => {
                      debug("modal: take-quiz clicked", { chapterId });
                      if (chapterId) {
                        onStartQuiz(chapterId);
                        setShowQuizModal(false);
                      }
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                  >
                    Take Quiz
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  You've reached the end of this document.
                  {chapterId
                    ? " Your completion has been recorded."
                    : " (This PDF isn't linked to a chapter record yet, so progress/XP can't be recorded.)"}
                </p>
                <div className="flex gap-3 justify-end">
                  {chapterId && onGenerateQuiz && (
                    <button
                      onClick={() => {
                        debug("modal: generate-quiz clicked", { chapterId });
                        void (async () => {
                          try {
                            setIsGeneratingQuiz(true);
                            toast.info("Generating quiz, please wait...");
                            await onGenerateQuiz(chapterId);
                            setShowQuizModal(false);
                            toast.success("Quiz generated successfully!");
                          } catch (e) {
                            debug("generate quiz failed", e);
                            const errorMsg = e instanceof Error ? e.message : "Failed to generate quiz";
                            toast.error(errorMsg);
                          } finally {
                            setIsGeneratingQuiz(false);
                          }
                        })();
                      }}
                      disabled={isGeneratingQuiz}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isGeneratingQuiz ? (
                        <>
                          <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 dark:border-gray-200"></span>
                          Generating...
                        </>
                      ) : (
                        "Generate Quiz"
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setShowQuizModal(false)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
