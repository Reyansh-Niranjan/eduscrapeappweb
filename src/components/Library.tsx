import { useState, useEffect, useMemo } from "react";
import { Book, FolderOpen, FileArchive, FileText, ChevronRight, Download, Eye, Home, ExternalLink } from "lucide-react";
import JSZip from "jszip";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface ZipInfo {
  name: string;
  path: string;
  url: string;
}

interface FolderStructure {
  [key: string]: FolderStructure | ZipInfo[];
}

interface PDFFile {
  name: string;
  url: string;
  blob: Blob;
}

export default function Library() {
  const userProfile = useQuery(api.userProfiles.getMyProfile);
  const [userGrade, setUserGrade] = useState<string>("Class1");
  const [structure, setStructure] = useState<FolderStructure | null>(null);
  const [zipsList, setZipsList] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [currentItems, setCurrentItems] = useState<any[]>([]);
  const [selectedZip, setSelectedZip] = useState<ZipInfo | null>(null);
  const [pdfs, setPdfs] = useState<PDFFile[]>([]);
  const [selectedPdf, setSelectedPdf] = useState<PDFFile | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; stage: string }>({ current: 0, total: 0, stage: '' });
  const [error, setError] = useState<string | null>(null);

  // Use Convex HTTP proxy to bypass CORS in production
  const BASE_URL = (import.meta.env.VITE_CONVEX_URL || "").replace(/\/$/, "") + "/library";
  const pageWidth = useMemo(() => {
    if (typeof window === "undefined") return 900;
    return Math.min(1200, window.innerWidth - 80);
  }, []);

  // Set user grade from profile when available
  useEffect(() => {
    if (userProfile?.grade) {
      setUserGrade(userProfile.grade);
    }
  }, [userProfile]);

  // Load structure and zips list on mount
  useEffect(() => {
    fetchStructure();
    fetchZipsList();
  }, []);

  // Auto-navigate to user's grade when structure loads
  useEffect(() => {
    if (structure && userGrade && currentPath.length === 0) {
      if (structure[userGrade]) {
        navigateToFolder([userGrade]);
      }
    }
  }, [structure, userGrade]);

  // Fetch structure.json from Firebase
  const fetchStructure = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/structure.json`);
      if (!response.ok) throw new Error("Failed to load library structure");
      const data = await response.json();
      console.log("Loaded structure:", data);
      console.log("Available classes:", Object.keys(data));
      setStructure(data);
    } catch (err) {
      console.error("Failed to load structure:", err);
      setError(err instanceof Error ? err.message : "Failed to load library");
    } finally {
      setLoading(false);
    }
  };

  // Fetch zips.json to get list of all ZIP files
  const fetchZipsList = async () => {
    try {
      const response = await fetch(`${BASE_URL}/zips.json`);
      if (!response.ok) throw new Error("Failed to load zips list");
      const data = await response.json();
      const paths = data.map((item: any) => item.path);
      console.log("Loaded ZIP paths:", paths);
      setZipsList(paths);
    } catch (err) {
      console.error("Failed to load zips list:", err);
    }
  };

  // Navigate through folder structure
  const navigateToFolder = (path: string[]) => {
    if (!structure) return;

    let current: any = structure;
    for (const segment of path) {
      current = current[segment];
      if (!current) {
        console.error("Invalid path segment:", segment);
        return;
      }
    }

    setCurrentPath(path);
    
    // Simple folder browser logic
    const items: any[] = [];
    
    if (typeof current === 'object' && !Array.isArray(current)) {
      // Browse through object keys
      Object.keys(current).forEach(key => {
        const value = current[key];
        
        // Everything is treated as a folder or file based on structure
        if (Array.isArray(value)) {
          // It's an array - this means the KEY is actually a folder containing these files
          // Add the folder itself as a navigation item
          items.push({
            name: key,
            isFolder: true,
            isZipFile: false,
            isPdfFile: false,
            data: value
          });
        } else if (typeof value === 'object') {
          // It's an object - subfolder
          items.push({
            name: key,
            isFolder: true,
            isZipFile: false,
            isPdfFile: false,
            data: value
          });
        }
      });
    } else if (Array.isArray(current)) {
      // Now we're INSIDE a folder looking at the file list
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

    console.log("Current path:", path);
    console.log("Current items:", items);
    console.log("Items count:", items.length);

    setCurrentItems(items);
    setSelectedZip(null);
    setPdfs([]);
    setSelectedPdf(null);
  };

  // Handle folder click
  const handleFolderClick = (folderName: string) => {
    navigateToFolder([...currentPath, folderName]);
  };

  // Go back to parent folder
  const goBack = () => {
    if (currentPath.length > 1) {
      navigateToFolder(currentPath.slice(0, -1));
    }
  };

  // Go to home (grade level)
  const goToHome = () => {
    if (userGrade && structure && structure[userGrade]) {
      navigateToFolder([userGrade]);
    }
  };

  // Download and unzip a ZIP file
  const handleZipSelect = async (zipInfo: ZipInfo) => {
    try {
      setLoading(true);
      setError(null);
      setProgress({ current: 0, total: 0, stage: 'Starting download...' });
      setSelectedZip(zipInfo);

      // Download ZIP file with progress tracking
      const response = await fetch(zipInfo.url);
      if (!response.ok) throw new Error("Failed to download ZIP file");
      
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      
      // Track download progress
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let receivedLength = 0;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          chunks.push(value);
          receivedLength += value.length;
          
          const percent = total > 0 ? Math.round((receivedLength / total) * 100) : 0;
          setProgress({ 
            current: receivedLength, 
            total, 
            stage: `Downloading... ${percent}% (${(receivedLength / 1024 / 1024).toFixed(1)} MB${total > 0 ? ` / ${(total / 1024 / 1024).toFixed(1)} MB` : ''})` 
          });
        }
      }

      // Combine chunks into single array
      const chunksAll = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
      }

      setProgress({ current: 0, total: 0, stage: 'Extracting PDFs...' });
      
      // Unzip using JSZip
      const zip = await JSZip.loadAsync(chunksAll);
      const pdfFiles: PDFFile[] = [];
      const zipEntries = Object.entries(zip.files);
      const totalFiles = zipEntries.length;

      // Extract all PDF files with progress
      let extractedCount = 0;
      for (const [filename, file] of zipEntries) {
        if (filename.toLowerCase().endsWith('.pdf') && !file.dir) {
          const pdfBlob = await file.async('blob');
          const pdfUrl = URL.createObjectURL(pdfBlob);
          pdfFiles.push({
            name: filename.split('/').pop() || filename,
            url: pdfUrl,
            blob: pdfBlob
          });
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process ZIP file");
    } finally {
      setLoading(false);
    }
  };

  // View a PDF
  const handlePdfView = (pdf: PDFFile) => {
    setViewerError(null);
    setSelectedPdf(pdf);
    setPageNumber(1);
    setNumPages(null);
  };

  // Download a PDF
  const handlePdfDownload = (pdf: PDFFile) => {
    const link = document.createElement('a');
    link.href = pdf.url;
    link.download = pdf.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Close PDF viewer
  const closePdfViewer = () => {
    setSelectedPdf(null);
    setViewerError(null);
    setNumPages(null);
    setPageNumber(1);
  };

  // Breadcrumb navigation
  const renderBreadcrumb = () => {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
        <button 
          onClick={goToHome}
          className="flex items-center gap-1 hover:text-purple-600 transition"
          title="Go to home"
        >
          <Home className="h-4 w-4" />
        </button>
        {currentPath.map((segment, index) => (
          <div key={index} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            <button
              onClick={() => navigateToFolder(currentPath.slice(0, index + 1))}
              className={`hover:text-purple-600 transition ${
                index === 0 ? 'font-semibold' : ''
              }`}
            >
              {segment}
            </button>
          </div>
        ))}
      </div>
    );
  };

  // Render PDF viewer modal
  if (selectedPdf) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
        <div className="flex items-center justify-between p-4 bg-gray-900 text-white gap-3 flex-wrap">
          <div className="flex flex-col gap-1 min-w-0">
            <h2 className="text-lg font-semibold truncate" title={selectedPdf.name}>
              {selectedPdf.name}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              {numPages ? `${pageNumber} / ${numPages} pages` : "Loading PDF..."}
              {viewerError && <span className="text-red-300">{viewerError}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-gray-800/70 rounded-lg px-2 py-1 text-sm">
              <button
                onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
                disabled={pageNumber <= 1}
                className="px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="px-2">Page {pageNumber}</span>
              <button
                onClick={() => setPageNumber((prev) => Math.min(numPages || prev, prev + 1))}
                disabled={!numPages || pageNumber >= (numPages || 1)}
                className="px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>

            <button
              onClick={() => window.open(selectedPdf.url, "_blank", "noopener,noreferrer")}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              New tab
            </button>
            <button
              onClick={() => handlePdfDownload(selectedPdf)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={closePdfViewer}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-950">
          <div className="mx-auto max-w-5xl py-6 px-4">
            <Document
              file={selectedPdf.url}
              onLoadSuccess={({ numPages: loadedPages }) => {
                setNumPages(loadedPages);
                setViewerError(null);
              }}
              onLoadError={(err) => {
                console.error("PDF viewer failed", err);
                setViewerError("Could not render this PDF. Try download/new tab.");
              }}
              loading={<div className="text-center text-gray-300 py-6">Loading PDF...</div>}
              error={<div className="text-center text-red-300 py-6">Unable to load PDF.</div>}
            >
              <Page
                pageNumber={pageNumber}
                width={pageWidth}
                renderAnnotationLayer={true}
                renderTextLayer={true}
              />
            </Document>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">PDF Library</h1>
              <p className="text-gray-600">
                Browse and access educational materials for {userGrade || 'your grade'}
              </p>
            </div>
            
            {/* Grade Selector */}
            <select
              value={userGrade}
              onChange={(e) => {
                setUserGrade(e.target.value);
                navigateToFolder([e.target.value]);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {Array.from({ length: 12 }, (_, i) => `Class${i + 1}`).map(grade => (
                <option key={grade} value={grade}>
                  {grade.replace('Class', 'Class ')}
                </option>
              ))}
            </select>
          </div>

          {/* Breadcrumb */}
          {currentPath.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              {renderBreadcrumb()}
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5">⚠️</div>
            <div>{error}</div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4 max-w-md w-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              <div className="w-full">
                <p className="text-gray-600 text-center mb-2 font-medium">
                  {progress.stage}
                </p>
                {progress.total > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Show PDF List if ZIP is selected */}
        {!loading && selectedZip && pdfs.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedZip.name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {pdfs.length} PDF{pdfs.length !== 1 ? 's' : ''} available
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedZip(null);
                  setPdfs([]);
                }}
                className="text-sm text-gray-600 hover:text-purple-600 transition font-medium"
              >
                ← Back to files
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {pdfs.map((pdf, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:border-purple-400 hover:shadow-md transition group"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="h-8 w-8 text-red-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate mb-3" title={pdf.name}>
                        {pdf.name}
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePdfView(pdf)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition flex items-center gap-1.5 flex-1 justify-center"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        <button
                          onClick={() => handlePdfDownload(pdf)}
                          className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded transition flex items-center gap-1.5"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Show folders and ZIPs navigation */}
        {!loading && !selectedZip && currentItems.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {currentPath[currentPath.length - 1] || "Library"}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {currentItems.length} item{currentItems.length !== 1 ? 's' : ''}
                </p>
              </div>
              {currentPath.length > 1 && (
                <button
                  onClick={goBack}
                  className="text-sm text-gray-600 hover:text-purple-600 transition font-medium"
                >
                  ← Back
                </button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {currentItems.map((item, index) => {
                // Render folders
                if (item.isFolder) {
                  return (
                    <button
                      key={`folder-${index}`}
                      onClick={() => handleFolderClick(item.name)}
                      className="flex items-center gap-3 p-4 border-2 border-green-400 bg-green-100 rounded-lg hover:border-green-600 hover:shadow-md transition text-left group"
                    >
                      <FolderOpen className="h-10 w-10 text-green-700 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate text-lg">{item.name}</h3>
                        <p className="text-sm text-green-700 font-bold">📁 FOLDER (GREEN)</p>
                      </div>
                    </button>
                  );
                }

                // Render ZIP files
                if (item.isZipFile) {
                  const zipInfo: ZipInfo = {
                    name: item.name,
                    path: [...currentPath, item.name].join('/'),
                    url: `${BASE_URL}/${[...currentPath, item.name].join('/')}`
                  };
                  return (
                    <button
                      key={`zip-${index}`}
                      onClick={() => handleZipSelect(zipInfo)}
                      className="flex items-center gap-3 p-4 border-2 border-blue-200 bg-blue-50 rounded-lg hover:border-blue-400 hover:shadow-md transition text-left group"
                    >
                      <FileArchive className="h-10 w-10 text-blue-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate text-lg">{item.name.replace('.zip', '')}</h3>
                        <p className="text-sm text-gray-600">📦 ZIP File</p>
                      </div>
                    </button>
                  );
                }

                // Render PDF files (after unzipping)
                if (item.isPdfFile) {
                  const pdfUrl = `${BASE_URL}/${[...currentPath, item.name].join('/')}`;
                  return (
                    <button
                      key={`pdf-${index}`}
                      onClick={async () => {
                        try {
                          const response = await fetch(pdfUrl);
                          const blob = await response.blob();
                          const url = URL.createObjectURL(blob);
                          setViewerError(null);
                          setNumPages(null);
                          setPageNumber(1);
                          setSelectedPdf({ name: item.name, url, blob });
                        } catch (err) {
                          setError("Failed to load PDF");
                        }
                      }}
                      className="flex items-center gap-3 p-4 border-2 border-red-200 bg-red-50 rounded-lg hover:border-red-400 hover:shadow-md transition text-left group"
                    >
                      <FileText className="h-10 w-10 text-red-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate text-lg">{item.name.replace('.pdf', '')}</h3>
                        <p className="text-sm text-gray-600">📄 PDF File</p>
                      </div>
                    </button>
                  );
                }

                return null;
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !selectedZip && currentItems.length === 0 && currentPath.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Book className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-500 mb-4">This folder appears to be empty.</p>
            {currentPath.length > 1 && (
              <button
                onClick={goBack}
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                ← Go back
              </button>
            )}
          </div>
        )}

        {/* Initial State - No navigation yet */}
        {!loading && currentPath.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Book className="h-16 w-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to the Library</h3>
            <p className="text-gray-500">
              Select your grade above to start browsing educational materials
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
