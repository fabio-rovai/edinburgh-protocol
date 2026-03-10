interface HealthGaugeProps {
  score: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function HealthGauge({
  score,
  label,
  size = 'md',
}: HealthGaugeProps) {
  const color =
    score > 0.8
      ? 'bg-success'
      : score > 0.5
        ? 'bg-warning'
        : 'bg-danger';

  const textColor =
    score > 0.8
      ? 'text-success'
      : score > 0.5
        ? 'text-warning'
        : 'text-danger';

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-3xl',
    lg: 'text-5xl',
  };

  const barHeight = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <span className={`${sizeClasses[size]} font-bold ${textColor}`}>
        {(score * 100).toFixed(0)}
      </span>
      {label && (
        <span className="text-xs text-gray-500 uppercase tracking-wider">
          {label}
        </span>
      )}
      <div
        className={`w-full bg-border rounded-full ${barHeight[size]} overflow-hidden`}
      >
        <div
          className={`${color} ${barHeight[size]} rounded-full transition-all`}
          style={{ width: `${score * 100}%` }}
        />
      </div>
    </div>
  );
}
