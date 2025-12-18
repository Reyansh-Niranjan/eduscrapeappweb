import { useMemo } from "react";
import { Download, ExternalLink } from "lucide-react";
import { Document, Page } from "react-pdf";

interface PDFFile {
  name: string;
  url: string;
  blob: Blob;
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
}: PDFViewerProps) {
  const pageWidth = useMemo(() => {
    if (typeof window === "undefined") return 900;
    return Math.min(1200, window.innerWidth - 80);
  }, []);

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
            file={pdf.url}
            onLoadSuccess={({ numPages: loadedPages }) => {
              onLoadSuccess(loadedPages);
            }}
            onLoadError={(_err) => {
              onLoadError("Could not render this PDF. Try download/new tab.");
            }}
            loading={<div className="text-center text-gray-300 py-6">Loading PDF...</div>}
            error={<div className="text-center text-red-300 py-6">Unable to load PDF.</div>}
            options={{
              cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
              cMapPacked: true,
              standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/',
              isEvalSupported: false,
            }}
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
