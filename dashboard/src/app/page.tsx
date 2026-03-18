import MetricCard from '@/components/MetricCard';
import InvoicePipeline from '@/components/InvoicePipeline';
import ActivityFeed from '@/components/ActivityFeed';
import AllocationPie from '@/components/AllocationPie';

const allocationData = [
  { name: 'Sovereign Bond', value: 320000 },
  { name: 'Aave Savings', value: 195000 },
  { name: 'Liquid Staking', value: 97000 },
  { name: 'Compound Lending', value: 35500 },
];

export default function OverviewPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Overview</h2>
        <p className="text-sm text-gray-500 mt-1">
          Making late payment structurally impossible
        </p>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Total Locked"
          value="£647,500"
          subtitle="Across 8 invoices"
        />
        <MetricCard
          label="Active Invoices"
          value="5"
          subtitle="3 streaming, 2 locked"
        />
        <MetricCard
          label="Avg Days to Payment"
          value="4.2"
          subtitle="vs. 47 days industry avg"
        />
        <MetricCard
          label="Yield Generated"
          value="£2,184"
          subtitle="Offsetting early-payment discounts"
        />
      </div>

      {/* Pipeline Visualisation */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">
          Invoice Lifecycle
        </h3>
        <InvoicePipeline />
      </div>

      {/* Bottom Row: Allocation + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Vault Allocation
          </h3>
          <AllocationPie data={allocationData} />
        </div>
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Recent Activity
          </h3>
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
