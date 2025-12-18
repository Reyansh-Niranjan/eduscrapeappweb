import { FolderOpen, FileArchive, FileText } from "lucide-react";

interface ZipInfo {
  name: string;
  path: string;
  url: string;
}

interface BrowserItem {
  name: string;
  isFolder: boolean;
  isZipFile: boolean;
  isPdfFile: boolean;
  data: any;
}

interface FolderBrowserProps {
  currentPath: string[];
  currentItems: BrowserItem[];
  baseUrl: string;
  onFolderClick: (folderName: string) => void;
  onZipSelect: (zipInfo: ZipInfo) => void | Promise<void>;
  onPdfClick: (pdfName: string, pdfUrl: string) => void | Promise<void>;
  onGoBack: () => void;
}

export default function FolderBrowser({
  currentPath,
  currentItems,
  baseUrl,
  onFolderClick,
  onZipSelect,
  onPdfClick,
  onGoBack,
}: FolderBrowserProps) {
  if (currentItems.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
        <p>No items found</p>
      </div>
    );
  }

  return (
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
            onClick={onGoBack}
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
                onClick={() => onFolderClick(item.name)}
                className="flex items-center gap-3 p-4 border-2 border-green-400 bg-green-100 rounded-lg hover:border-green-600 hover:shadow-md transition text-left group"
              >
                <FolderOpen className="h-10 w-10 text-green-700 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate text-lg">{item.name}</h3>
                  <p className="text-sm text-green-700 font-bold">📁 FOLDER</p>
                </div>
              </button>
            );
          }

          // Render ZIP files
          if (item.isZipFile) {
            const zipInfo: ZipInfo = {
              name: item.name,
              path: [...currentPath, item.name].join('/'),
              url: `${baseUrl}/${[...currentPath, item.name].join('/')}`
            };
            return (
              <button
                key={`zip-${index}`}
                onClick={() => void onZipSelect(zipInfo)}
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

          // Render PDF files (direct)
          if (item.isPdfFile) {
            const pdfUrl = `${baseUrl}/${[...currentPath, item.name].join('/')}`;
            return (
              <button
                key={`pdf-${index}`}
                onClick={() => void onPdfClick(item.name, pdfUrl)}
                className="flex items-center gap-3 p-4 border-2 border-orange-200 bg-orange-50 rounded-lg hover:border-orange-400 hover:shadow-md transition text-left group"
              >
                <FileText className="h-10 w-10 text-orange-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
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
  );
}
