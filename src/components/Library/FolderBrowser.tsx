import { FileArchive, FileText } from "lucide-react";

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
  onZipSelect: (zipInfo: ZipInfo) => void;
  onPdfClick: (pdfName: string, pdfUrl: string) => void;
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
      <div className="rounded-xl shadow-sm p-8 text-center" style={{ background: 'var(--theme-card-bg)', color: 'var(--theme-text-secondary)' }}>
        <p>No items found</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl shadow-sm p-6" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-border)' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--theme-text)' }}>
            {currentPath[currentPath.length - 1] || "Library"}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--theme-text-secondary)' }}>
            {currentItems.length} item{currentItems.length !== 1 ? 's' : ''}
          </p>
        </div>
        {currentPath.length > 1 && (
          <button
            onClick={onGoBack}
            className="text-sm hover:text-purple-600 dark:hover:text-purple-400 transition font-medium"
            style={{ color: 'var(--theme-text-secondary)' }}
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
                className="flex items-center gap-3 p-4 border-2 border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/30 rounded-lg hover:border-purple-600 dark:hover:border-purple-400 hover:shadow-md transition text-left group"
              >
                <img 
                  src="/bookshelf-icon.svg" 
                  alt="Bookshelf" 
                  className="h-10 w-10 flex-shrink-0 group-hover:scale-110 transition-transform"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate text-lg" style={{ color: 'var(--theme-text)' }}>{item.name}</h3>
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
                onClick={() => onZipSelect(zipInfo)}
                className="flex items-center gap-3 p-4 border-2 border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition text-left group"
              >
                <FileArchive className="h-10 w-10 text-blue-600 dark:text-blue-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate text-lg" style={{ color: 'var(--theme-text)' }}>{item.name.replace('.zip', '')}</h3>
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
                onClick={() => onPdfClick(item.name, pdfUrl)}
                className="flex items-center gap-3 p-4 border-2 border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/30 rounded-lg hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-md transition text-left group"
              >
                <FileText className="h-10 w-10 text-orange-600 dark:text-orange-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate text-lg" style={{ color: 'var(--theme-text)' }}>{item.name.replace('.pdf', '')}</h3>
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
