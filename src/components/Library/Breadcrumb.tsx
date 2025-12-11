import { Home, ChevronRight } from "lucide-react";

interface BreadcrumbProps {
  currentPath: string[];
  onNavigateHome: () => void;
  onNavigateToPath: (path: string[]) => void;
}

export default function Breadcrumb({ currentPath, onNavigateHome, onNavigateToPath }: BreadcrumbProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
      <button 
        onClick={onNavigateHome}
        className="flex items-center gap-1 hover:text-purple-600 transition"
        title="Go to home"
      >
        <Home className="h-4 w-4" />
      </button>
      {currentPath.map((segment, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4" />
          <button
            onClick={() => onNavigateToPath(currentPath.slice(0, index + 1))}
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
}
