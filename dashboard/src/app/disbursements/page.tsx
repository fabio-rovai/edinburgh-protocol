import MetricCard from '@/components/MetricCard';
import DisbursementTable from '@/components/DisbursementTable';

export default function DisbursementsPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Disbursements</h2>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <MetricCard
          label="Total Disbursed"
          value="$0"
          subtitle="Lifetime total"
        />
        <MetricCard
          label="Recipients"
          value="0"
          subtitle="Unique addresses"
        />
        <MetricCard
          label="Transactions"
          value="0"
          subtitle="On-chain transfers"
        />
      </div>

      {/* Disbursement Table */}
      <DisbursementTable data={[]} />
    </div>
  );
}
