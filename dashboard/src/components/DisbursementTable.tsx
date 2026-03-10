interface Disbursement {
  date: string;
  recipient: string;
  amount: number;
  txHash: string;
}

interface DisbursementTableProps {
  data: Disbursement[];
}

export default function DisbursementTable({ data }: DisbursementTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Recent Disbursements
        </h3>
        <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
          No disbursements recorded yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Recent Disbursements
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-gray-500 font-medium">
                Date
              </th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium">
                Recipient
              </th>
              <th className="text-right py-3 px-4 text-gray-500 font-medium">
                Amount
              </th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium">
                Tx Hash
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="py-3 px-4 text-white">{d.date}</td>
                <td className="py-3 px-4 font-mono text-xs text-gray-300">
                  {d.recipient}
                </td>
                <td className="py-3 px-4 text-right text-white">
                  ${d.amount.toLocaleString()}
                </td>
                <td className="py-3 px-4">
                  <a
                    href={`https://basescan.org/tx/${d.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-mono text-xs"
                  >
                    {d.txHash.slice(0, 10)}...{d.txHash.slice(-8)}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
