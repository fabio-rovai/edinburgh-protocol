import AdapterCard from '@/components/AdapterCard';

const adapters = [
  {
    name: 'Sovereign Bond',
    riskPosition: 'Conservative',
    healthScore: 0.95,
    apy: 4.5,
    tvl: 500000,
  },
  {
    name: 'Aave Savings',
    riskPosition: 'Low Risk',
    healthScore: 0.85,
    apy: 3.2,
    tvl: 300000,
  },
  {
    name: 'Liquid Staking',
    riskPosition: 'Moderate',
    healthScore: 0.88,
    apy: 3.5,
    tvl: 150000,
  },
  {
    name: 'Compound Lending',
    riskPosition: 'Low Risk',
    healthScore: 0.82,
    apy: 3.2,
    tvl: 50000,
  },
];

export default function AdaptersPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Adapters</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {adapters.map((adapter) => (
          <AdapterCard key={adapter.name} {...adapter} />
        ))}
      </div>
    </div>
  );
}
