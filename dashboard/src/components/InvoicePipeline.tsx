'use client';

const stages = [
  {
    label: 'Lock',
    description: 'Buyer deposits GBP-stablecoin at invoice acceptance',
    count: 2,
    color: 'bg-blue-500',
    textColor: 'text-blue-400',
  },
  {
    label: 'Earn',
    description: 'Funds generate yield via risk-curated vault adapters',
    count: 5,
    color: 'bg-amber-500',
    textColor: 'text-amber-400',
  },
  {
    label: 'Stream',
    description: 'Supplier claims early or yield streams from day one',
    count: 3,
    color: 'bg-emerald-500',
    textColor: 'text-emerald-400',
  },
  {
    label: 'Settle',
    description: 'Auto-release at maturity, Invoice NFT burns',
    count: 3,
    color: 'bg-purple-500',
    textColor: 'text-purple-400',
  },
];

export default function InvoicePipeline() {
  return (
    <div className="flex items-stretch gap-3">
      {stages.map((stage, i) => (
        <div key={stage.label} className="flex items-stretch flex-1">
          <div className="flex-1 rounded-lg border border-border bg-background p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                <span className={`text-sm font-semibold ${stage.textColor}`}>
                  {stage.label}
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                {stage.description}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <span className="text-2xl font-bold text-white">{stage.count}</span>
              <span className="text-xs text-gray-500 ml-1.5">invoices</span>
            </div>
          </div>
          {i < stages.length - 1 && (
            <div className="flex items-center px-1">
              <span className="text-gray-600 text-lg">›</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
