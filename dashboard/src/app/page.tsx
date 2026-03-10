import MetricCard from '@/components/MetricCard';
import AllocationPie from '@/components/AllocationPie';
import YieldChart from '@/components/YieldChart';

const allocationData = [
  { name: 'Sovereign Bond', value: 500000 },
  { name: 'Aave Savings', value: 300000 },
  { name: 'Liquid Staking', value: 150000 },
  { name: 'Compound Lending', value: 50000 },
];

const yieldData = [
  { date: 'Jan', yield: 1200 },
  { date: 'Feb', yield: 2400 },
  { date: 'Mar', yield: 3100 },
  { date: 'Apr', yield: 4800 },
  { date: 'May', yield: 6200 },
  { date: 'Jun', yield: 7500 },
  { date: 'Jul', yield: 8900 },
];

export default function OverviewPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Overview</h2>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Total Value Locked"
          value="$1,000,000"
          subtitle="Across 4 adapters"
        />
        <MetricCard
          label="Total Yield"
          value="$8,900"
          subtitle="+12.3% this month"
        />
        <MetricCard
          label="Total Disbursed"
          value="$5,200"
          subtitle="To 3 recipients"
        />
        <MetricCard
          label="Active Adapters"
          value="4"
          subtitle="All healthy"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Allocation
          </h3>
          <AllocationPie data={allocationData} />
        </div>
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Yield Over Time
          </h3>
          <YieldChart data={yieldData} />
        </div>
      </div>
    </div>
  );
}
