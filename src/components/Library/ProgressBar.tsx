interface ProgressBarProps {
  current: number;
  total: number;
  stage: string;
}

export default function ProgressBar({ current, total, stage }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{stage}</span>
            <span className="text-sm text-gray-600">{percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-teal-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    </div>
  );
}
