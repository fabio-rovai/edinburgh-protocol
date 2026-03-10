import HealthGauge from './HealthGauge';

interface AdapterCardProps {
  name: string;
  riskPosition: string;
  healthScore: number;
  apy: number;
  tvl: number;
}

export default function AdapterCard({
  name,
  riskPosition,
  healthScore,
  apy,
  tvl,
}: AdapterCardProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{riskPosition}</p>
        </div>
        <div className="w-16">
          <HealthGauge score={healthScore} size="sm" />
        </div>
      </div>
      <div className="flex items-center gap-6 mt-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">APY</p>
          <p className="text-lg font-bold text-primary">{apy}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">TVL</p>
          <p className="text-lg font-bold text-white">
            ${tvl.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
