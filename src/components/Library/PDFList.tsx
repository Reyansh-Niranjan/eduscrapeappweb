import { FileText, Eye, Download, Star } from "lucide-react";

interface PDFFile {
  name: string;
  url: string;
  blob: Blob;
  zipPath?: string;
  sourceUrl?: string;
}

interface PDFListProps {
  pdfs: PDFFile[];
  onView: (pdf: PDFFile) => void;
  onDownload: (pdf: PDFFile) => void;
  completedPdfPaths?: Set<string>;
}

export default function PDFList({ pdfs, onView, onDownload, completedPdfPaths }: PDFListProps) {
  if (pdfs.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--theme-text-secondary)]">
        <FileText className="h-16 w-16 mx-auto mb-4 text-[var(--theme-text-secondary)]" />
        <p>No PDF files found in this archive</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {pdfs.map((pdf, index) => (
        (() => {
          const zipPath = (pdf as any).zipPath as string | undefined;
          const normalize = (value: string) => value.replace(/\\/g, "/").replace(/^\/+/, "").toLowerCase();
          const isCompleted =
            !!completedPdfPaths &&
            (completedPdfPaths.has(normalize(zipPath ?? pdf.name)) || completedPdfPaths.has((pdf.name ?? "").toLowerCase()));

          return (
        <div
          key={index}
          className="p-4 border-2 border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/30 rounded-lg hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-md transition group"
        >
          <div className="flex items-start gap-3">
            <FileText className="h-8 w-8 text-orange-600 dark:text-orange-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-medium truncate text-[var(--theme-text)]" title={pdf.name}>
                  {pdf.name.replace('.pdf', '')}
                </h3>
                {isCompleted && (
                  <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" fill="currentColor" aria-label="Completed" />
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onView(pdf)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition flex items-center gap-1.5 flex-1 justify-center"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View
                </button>
                <button
                  type="button"
                  onClick={() => onDownload(pdf)}
                  aria-label={`Download ${pdf.name}`}
                  title={`Download ${pdf.name}`}
                  className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded transition flex items-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" focusable="false" />
                </button>
              </div>
            </div>
          </div>
        </div>
          );
        })()
      ))}
    </div>
  );
}
