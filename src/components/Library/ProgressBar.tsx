interface ProgressBarProps {
  current: number;
  total: number;
  stage: string;
}

export default function ProgressBar({ current, total, stage }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="rounded-xl shadow-sm p-6" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-border)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>{stage}</span>
            <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>{percentage}%</span>
          </div>
          <div className="w-full rounded-full h-3 overflow-hidden" style={{ background: 'var(--theme-border)' }}>
            <div
              className="bg-purple-500 h-full rounded-full transition-all duration-300 ease-out"
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
