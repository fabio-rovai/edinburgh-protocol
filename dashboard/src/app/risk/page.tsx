import HealthGauge from '@/components/HealthGauge';
import SentinelStatus from '@/components/SentinelStatus';

const enforcerRules = [
  { name: 'Max Single Adapter Allocation', type: 'Block', enabled: true },
  { name: 'Minimum Health Score', type: 'Block', enabled: true },
  { name: 'Daily Withdrawal Limit', type: 'Warn', enabled: true },
  { name: 'APY Deviation Alert', type: 'Warn', enabled: true },
  { name: 'Counterparty Concentration', type: 'Block', enabled: false },
];

export default function RiskPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Risk</h2>

      {/* Top row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {/* Overall Health */}
        <div className="bg-surface border border-border rounded-xl p-6 flex flex-col items-center justify-center">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Overall Health
          </h3>
          <div className="w-32">
            <HealthGauge score={0.91} label="Health Score" size="lg" />
          </div>
        </div>

        {/* Sentinel Status */}
        <SentinelStatus
          status="running"
          checksCompleted={1247}
          lastCheck="2 min ago"
          currentAction="Monitoring"
        />

        {/* Active Alerts */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Active Alerts
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-warning text-xs mt-0.5">&#9679;</span>
              <div>
                <p className="text-sm text-white">APY deviation on Aave</p>
                <p className="text-xs text-gray-500">5 min ago</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-success text-xs mt-0.5">&#9679;</span>
              <div>
                <p className="text-sm text-white">Health check passed</p>
                <p className="text-xs text-gray-500">2 min ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enforcer Rules Table */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Enforcer Rules
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-gray-500 font-medium">
                  Rule Name
                </th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">
                  Type
                </th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {enforcerRules.map((rule) => (
                <tr
                  key={rule.name}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-3 px-4 text-white">{rule.name}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        rule.type === 'Block'
                          ? 'bg-danger/10 text-danger'
                          : 'bg-warning/10 text-warning'
                      }`}
                    >
                      {rule.type}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs font-medium ${
                        rule.enabled ? 'text-success' : 'text-gray-500'
                      }`}
                    >
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
