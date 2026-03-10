interface SentinelStatusProps {
  status: string;
  checksCompleted: number;
  lastCheck: string;
  currentAction: string;
}

export default function SentinelStatus({
  status,
  checksCompleted,
  lastCheck,
  currentAction,
}: SentinelStatusProps) {
  const isRunning = status === 'running';

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Sentinel Status
      </h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Status</span>
          <span
            className={`text-sm font-medium ${isRunning ? 'text-success' : 'text-danger'}`}
          >
            {isRunning ? 'Running' : 'Stopped'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Checks Completed</span>
          <span className="text-sm font-medium text-white">
            {checksCompleted}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Last Check</span>
          <span className="text-sm font-medium text-white">{lastCheck}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Current Action</span>
          <span className="text-sm font-medium text-white">
            {currentAction}
          </span>
        </div>
      </div>
    </div>
  );
}
