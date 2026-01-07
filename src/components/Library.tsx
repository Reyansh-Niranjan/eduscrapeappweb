import { useState, useEffect, useCallback } from "react";
import { Book } from "lucide-react";
import JSZip from "jszip";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import PDFViewer from "./Library/PDFViewer";
import Breadcrumb from "./Library/Breadcrumb";
import PDFList from "./Library/PDFList";
import FolderBrowser from "./Library/FolderBrowser";
import ProgressBar from "./Library/ProgressBar";

// Configure PDF.js worker and options
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ZipInfo {
  name: string;
  path: string;
  url: string;
}

interface FolderStructure {
  [key: string]: FolderStructure | string[];
}

interface PDFFile {
  name: string;
  url: string;
  blob: Blob;
  // Full path inside the selected ZIP (e.g. "Unit1/Chapter2.pdf").
  // Needed so backend can map PDFs to chapters reliably.
  zipPath?: string;
  // Original remote URL (for on-demand server-side page rendering).
  sourceUrl?: string;
}

interface LibraryProps {
  bookToOpen?: { path: string; name: string } | null;
  onStartQuiz?: (quizId: Id<"quizzes">) => void;
}

const BASE_URL = "https://eduscrape-host.web.app";

export default function Library({ bookToOpen, onStartQuiz }: LibraryProps) {
  const debug = (...args: any[]) => {
    try {
      if (typeof import.meta !== "undefined" && (import.meta as any).env?.DEV) {
        console.debug("[Library]", ...args);
      }
    } catch {
      // ignore
    }
  };

  const userProfile = useQuery(api.userProfiles.getMyProfile);
  const [userGrade, setUserGrade] = useState<string>("Class1");
  const [structure, setStructure] = useState<FolderStructure | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [currentItems, setCurrentItems] = useState<any[]>([]);
  const [selectedZip, setSelectedZip] = useState<ZipInfo | null>(null);
  const [pdfs, setPdfs] = useState<PDFFile[]>([]);
  const [selectedPdf, setSelectedPdf] = useState<PDFFile | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; stage: string }>({ 
    current: 0, total: 0, stage: '' 
  });
  const [error, setError] = useState<string | null>(null);

  const upsertBookAndChapters = useMutation(api.progress.upsertBookAndChapters);
  const generateQuizForChapter = useAction(api.quizGen.generateQuizForChapter);

  // Fetch chapter and quiz data when PDF is selected
  const chapterData = useQuery(
    api.progress.getChapterByPath,
    selectedZip && selectedPdf
      ? { bookPath: selectedZip.path, pdfPath: selectedPdf.zipPath ?? selectedPdf.name }
      : "skip"
  );
  const quizData = useQuery(
    api.quizzes.getQuizByChapter,
    chapterData?.chapter?._id
      ? { chapterId: chapterData.chapter._id }
      : "skip"
  );

  const bookProgress = useQuery(
    api.progress.getBookProgress,
    selectedZip ? { bookPath: selectedZip.path } : "skip"
  );

  const completedPdfPathSet = (() => {
    const normalize = (value: string) =>
      value.replace(/\\/g, "/").replace(/^\/+/, "").toLowerCase();

    const basename = (value: string) => {
      const unified = value.replace(/\\/g, "/");
      const parts = unified.split("/").filter(Boolean);
      return (parts[parts.length - 1] ?? unified).toLowerCase();
    };

    const set = new Set<string>();
    for (const chapter of bookProgress?.chapters ?? []) {
      if (!chapter.completed) continue;
      set.add(normalize(chapter.chapterPath));
      set.add(basename(chapter.chapterPath));
    }
    return set;
  })();

  useEffect(() => {
    if (!selectedZip || !selectedPdf) return;
    debug("selected pdf", {
      zipPath: selectedZip.path,
      pdfName: selectedPdf.name,
      pdfZipPath: selectedPdf.zipPath,
      pdfSourceUrl: (selectedPdf as any).sourceUrl,
    });
  }, [selectedZip, selectedPdf]);

  useEffect(() => {
    if (!selectedZip || !selectedPdf) return;
    debug("chapter lookup", {
      bookPath: selectedZip.path,
      pdfPathSent: selectedPdf.zipPath ?? selectedPdf.name,
      chapterId: chapterData?.chapter?._id,
      chapterPdfPath: chapterData?.chapter?.pdfPath,
    });
  }, [selectedZip, selectedPdf, chapterData]);

  useEffect(() => {
    if (!selectedZip || !selectedPdf) return;
    debug("quiz lookup", {
      chapterId: chapterData?.chapter?._id,
      hasQuiz: !!quizData?.quiz,
      quizId: quizData?.quiz?._id,
    });
  }, [selectedZip, selectedPdf, chapterData?.chapter?._id, quizData?.quiz]);

  // Set user grade from profile when available
  useEffect(() => {
    if (userProfile?.grade) {
      setUserGrade(userProfile.grade);
    }
  }, [userProfile]);

  // Load structure on mount
  useEffect(() => {
    fetchStructure();
  }, []);

  // Auto-navigate to user's grade when structure loads
  useEffect(() => {
    if (structure && userGrade && currentPath.length === 0 && structure[userGrade]) {
      navigateToFolder([userGrade]);
    }
  }, [structure, userGrade, currentPath.length]);

  // Handle AI-triggered book opening
  useEffect(() => {
    if (bookToOpen && structure) {
      const pathParts = bookToOpen.path.split('/').filter(p => p);
      if (pathParts.length > 0) {
        const folderPath = pathParts.slice(0, -1);
        if (folderPath.length > 0) {
          navigateToFolder(folderPath);
        }
        const bookName = pathParts[pathParts.length - 1];
        const zipUrl = `${BASE_URL}/${bookToOpen.path}`;
        setTimeout(() => {
          handleZipSelect({ name: bookName, path: bookToOpen.path, url: zipUrl });
        }, 500);
      }
    }
  }, [bookToOpen, structure]);

  const fetchStructure = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/structure.json`);
      if (!response.ok) throw new Error("Failed to load library structure");
      const data = await response.json();
      setStructure(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load library");
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = useCallback((path: string[]) => {
    if (!structure) return;

    let current: any = structure;
    for (const segment of path) {
      if (!current || typeof current !== 'object') return;
      current = current[segment];
      if (!current) return;
    }

    setCurrentPath(path);
    const items: any[] = [];
    
    if (typeof current === 'object' && !Array.isArray(current)) {
      Object.keys(current).forEach(key => {
        const value = current[key];
        items.push({
          name: key,
          isFolder: true,
          isZipFile: false,
          isPdfFile: false,
          data: value
        });
      });
    } else if (Array.isArray(current)) {
      current.forEach((fileName: string) => {
        items.push({
          name: fileName,
          isFolder: false,
          isZipFile: fileName.endsWith('.zip'),
          isPdfFile: fileName.endsWith('.pdf'),
          data: fileName
        });
      });
    }

    setCurrentItems(items);
    setSelectedZip(null);
    setPdfs([]);
    setSelectedPdf(null);
  }, [structure]);

  const handleZipSelect = async (zipInfo: ZipInfo) => {
    try {
      setLoading(true);
      setError(null);
      setProgress({ current: 0, total: 0, stage: 'Starting download...' });
      setSelectedZip(zipInfo);

      const response = await fetch(zipInfo.url);
      if (!response.ok) throw new Error("Failed to download ZIP file");
      
      if (!response.body) throw new Error('Response body is null');
      
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let receivedLength = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;
          
          chunks.push(value);
          receivedLength += value.length;
          
          const percent = total > 0 ? Math.round((receivedLength / total) * 100) : 0;
          setProgress({ 
            current: receivedLength, 
            total, 
            stage: `Downloading... ${percent}% (${(receivedLength / 1024 / 1024).toFixed(1)} MB${total > 0 ? ` / ${(total / 1024 / 1024).toFixed(1)} MB` : ''})` 
          });
        }
      } finally {
        reader.releaseLock();
      }

      const chunksAll = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
      }

      setProgress({ current: 0, total: 0, stage: 'Extracting PDFs...' });
      
      const zip = await JSZip.loadAsync(chunksAll);
      const pdfFiles: PDFFile[] = [];
      const pdfPathsInZip: string[] = [];
      const zipEntries = Object.entries(zip.files);
      const totalFiles = zipEntries.length;

      let extractedCount = 0;
      for (const [filename, file] of zipEntries) {
        if (filename && filename.toLowerCase().endsWith('.pdf') && !file.dir) {
          const pdfBlob = await file.async('blob');
          const pdfUrl = URL.createObjectURL(pdfBlob);
          const parts = filename.split('/');
          const name = parts[parts.length - 1] ?? filename;
          pdfFiles.push({ name, url: pdfUrl, blob: pdfBlob, zipPath: filename });
          pdfPathsInZip.push(filename);
          debug("zip pdf found", { zip: zipInfo.path, name, zipPath: filename });
        }
        extractedCount++;
        setProgress({ 
          current: extractedCount, 
          total: totalFiles, 
          stage: `Extracted ${extractedCount} / ${totalFiles} files...` 
        });
      }

      setPdfs(pdfFiles);
      setProgress({ current: pdfFiles.length, total: pdfFiles.length, stage: `Ready! ${pdfFiles.length} PDFs found` });

      // Create/refresh the book+chapters mapping in Convex so PDFs link to chapters.
      try {
        await upsertBookAndChapters({
          bookPath: zipInfo.path,
          url: zipInfo.url,
          pdfPaths: pdfPathsInZip,
        });
        debug("upsertBookAndChapters done", { bookPath: zipInfo.path, count: pdfPathsInZip.length });
      } catch (e) {
        debug("upsertBookAndChapters failed", e);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process ZIP file");
    } finally {
      setLoading(false);
    }
  };

  const handlePdfView = (pdf: PDFFile) => {
    setViewerError(null);
    setSelectedPdf(pdf);
    setPageNumber(1);
    setNumPages(null);
  };

  const handlePdfDownload = (pdf: PDFFile) => {
    const link = document.createElement('a');
    link.href = pdf.url;
    link.download = pdf.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const closePdfViewer = () => {
    setSelectedPdf(null);
    setViewerError(null);
    setNumPages(null);
    setPageNumber(1);
  };

  const handleStartQuiz = (chapterId: string) => {
    void chapterId;
    if (!quizData?.quiz?._id) {
      setError("No quiz available for this chapter");
      return;
    }

    // Let the Quiz screen create the attempt. Starting it here causes a double-start
    // and can block the Quiz component with "Complete your previous attempt first".
    onStartQuiz?.(quizData.quiz._id);
  };

  const handleGenerateQuiz = async (chapterId: string) => {
    try {
      const result = await generateQuizForChapter({ chapterId: chapterId as any });
      onStartQuiz?.(result.quizId);
    } catch (error) {
      console.error("Quiz generation error:", error);
      throw error; // Re-throw to let PDFViewer handle the toast
    }
  };

  const goBack = () => {
    if (currentPath.length > 1) {
      navigateToFolder(currentPath.slice(0, -1));
    }
  };

  const goToHome = () => {
    if (userGrade && structure && structure[userGrade]) {
      navigateToFolder([userGrade]);
    }
  };

  const handlePdfClick = async (pdfName: string, pdfUrl: string) => {
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setViewerError(null);
      setNumPages(null);
      setPageNumber(1);
      setSelectedPdf({ name: pdfName, url, blob, sourceUrl: pdfUrl });
    } catch (err) {
      setError("Failed to load PDF");
    }
  };

  if (selectedPdf) {
    return (
      <PDFViewer
        pdf={selectedPdf}
        pageNumber={pageNumber}
        numPages={numPages}
        viewerError={viewerError}
        onPageChange={setPageNumber}
        onLoadSuccess={(pages) => {
          setNumPages(pages);
          setViewerError(null);
        }}
        onLoadError={setViewerError}
        onDownload={() => handlePdfDownload(selectedPdf)}
        onClose={closePdfViewer}
        chapterId={chapterData?.chapter?._id}
        hasQuiz={!!quizData?.quiz}
        onStartQuiz={handleStartQuiz}
        onGenerateQuiz={handleGenerateQuiz}
      />
    );
  }

  return (
    <div className="min-h-screen p-6 bg-[var(--theme-bg)]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="rounded-xl shadow-sm p-6 mb-6 bg-[var(--theme-card-bg)] border border-[var(--theme-border)]">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-[var(--theme-text)]">Library</h1>
              <p className="text-[var(--theme-text-secondary)]">
                Browse and access educational materials for {userGrade || "your grade"}
              </p>
            </div>

            <div>
              <label htmlFor="grade-select" className="sr-only">
                Select grade
              </label>
              <select
                id="grade-select"
                value={userGrade}
                onChange={(e) => {
                  setUserGrade(e.target.value);
                  navigateToFolder([e.target.value]);
                }}
                className="px-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-[var(--theme-input-bg)] border border-[var(--theme-border)] text-[var(--theme-text)]"
              >
                {Array.from({ length: 12 }, (_, i) => `Class${i + 1}`).map((grade) => (
                  <option key={grade} value={grade}>
                    {grade.replace("Class", "Class ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {currentPath.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--theme-border)]">
              <Breadcrumb
                currentPath={currentPath}
                onNavigateHome={goToHome}
                onNavigateToPath={navigateToFolder}
              />
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6 flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5">⚠️</div>
            <div>{error}</div>
          </div>
        )}

        {loading && progress.total > 0 && (
          <ProgressBar current={progress.current} total={progress.total} stage={progress.stage} />
        )}

        {loading && progress.total === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              <p className="font-medium text-[var(--theme-text-secondary)]">{progress.stage}</p>
            </div>
          </div>
        )}

        {!loading && selectedZip && pdfs.length > 0 && (
          <div className="rounded-xl shadow-sm p-6 bg-[var(--theme-card-bg)] border border-[var(--theme-border)]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-[var(--theme-text)]">{selectedZip.name}</h2>
                <p className="text-sm mt-1 text-[var(--theme-text-secondary)]">
                  {pdfs.length} PDF{pdfs.length !== 1 ? "s" : ""} available
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedZip(null);
                  setPdfs([]);
                }}
                className="text-sm text-[var(--theme-text-secondary)] hover:text-purple-600 dark:hover:text-purple-400 transition font-medium"
              >
                ← Back to files
              </button>
            </div>
            <PDFList
              pdfs={pdfs}
              onView={handlePdfView}
              onDownload={handlePdfDownload}
              completedPdfPaths={completedPdfPathSet}
            />
          </div>
        )}

        {!loading && !selectedZip && currentItems.length > 0 && (
          <FolderBrowser
            currentPath={currentPath}
            currentItems={currentItems}
            baseUrl={BASE_URL}
            onFolderClick={(folderName) => navigateToFolder([...currentPath, folderName])}
            onZipSelect={handleZipSelect}
            onPdfClick={handlePdfClick}
            onGoBack={goBack}
          />
        )}

        {!loading && !selectedZip && currentItems.length === 0 && currentPath.length > 0 && (
          <div className="rounded-xl shadow-sm p-12 text-center bg-[var(--theme-card-bg)] border border-[var(--theme-border)]">
            <Book className="h-16 w-16 mx-auto mb-4 text-[var(--theme-text-secondary)]" />
            <h3 className="text-lg font-medium mb-2 text-[var(--theme-text)]">No items found</h3>
            <p className="mb-4 text-[var(--theme-text-secondary)]">This folder appears to be empty.</p>
            {currentPath.length > 1 && (
              <button
                onClick={goBack}
                className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
              >
                ← Go back
              </button>
            )}
          </div>
        )}

        {!loading && currentPath.length === 0 && (
          <div className="rounded-xl shadow-sm p-12 text-center bg-[var(--theme-card-bg)] border border-[var(--theme-border)]">
            <Book className="h-16 w-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2 text-[var(--theme-text)]">Welcome to the Library</h3>
            <p className="text-[var(--theme-text-secondary)]">
              Select your grade above to start browsing educational materials
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
