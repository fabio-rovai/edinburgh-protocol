import MetricCard from '@/components/MetricCard';
import InvoiceTable from '@/components/InvoiceTable';

export default function InvoicesPage() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Invoices</h2>
        <p className="text-sm text-gray-500 mt-1">
          Payment commitments locked in the Edinburgh Protocol
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Total Locked"
          value="£647,500"
          subtitle="8 invoices"
        />
        <MetricCard
          label="Settled on Time"
          value="100%"
          subtitle="3 of 3 matured"
        />
        <MetricCard
          label="Early Claims"
          value="2"
          subtitle="Avg 18 days early"
        />
        <MetricCard
          label="Yield to Suppliers"
          value="£2,184"
          subtitle="Offsetting discount cost"
        />
      </div>

      {/* Invoice Table */}
      <InvoiceTable />
    </div>
  );
}
