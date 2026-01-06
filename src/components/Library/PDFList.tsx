import { FileText, Eye, Download } from "lucide-react";

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
}

export default function PDFList({ pdfs, onView, onDownload }: PDFListProps) {
  if (pdfs.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--theme-text-secondary)' }}>
        <FileText className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--theme-text-secondary)' }} />
        <p>No PDF files found in this archive</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {pdfs.map((pdf, index) => (
        <div
          key={index}
          className="p-4 border-2 border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/30 rounded-lg hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-md transition group"
        >
          <div className="flex items-start gap-3">
            <FileText className="h-8 w-8 text-orange-600 dark:text-orange-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate mb-3" style={{ color: 'var(--theme-text)' }} title={pdf.name}>
                {pdf.name.replace('.pdf', '')}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => onView(pdf)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition flex items-center gap-1.5 flex-1 justify-center"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View
                </button>
                <button
                  onClick={() => onDownload(pdf)}
                  className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded transition flex items-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
