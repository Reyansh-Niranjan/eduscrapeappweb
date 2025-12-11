import { FileText, Eye, Download } from "lucide-react";

interface PDFFile {
  name: string;
  url: string;
  blob: Blob;
}

interface PDFListProps {
  pdfs: PDFFile[];
  onView: (pdf: PDFFile) => void;
  onDownload: (pdf: PDFFile) => void;
}

export default function PDFList({ pdfs, onView, onDownload }: PDFListProps) {
  if (pdfs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <p>No PDF files found in this archive</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {pdfs.map((pdf, index) => (
        <div
          key={index}
          className="p-4 border-2 border-orange-200 bg-orange-50 rounded-lg hover:border-orange-400 hover:shadow-md transition group"
        >
          <div className="flex items-start gap-3">
            <FileText className="h-8 w-8 text-orange-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate mb-3" title={pdf.name}>
                {pdf.name}
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
  );
}
