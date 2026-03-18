'use client';

import { useState } from 'react';

type InvoiceStatus = 'Locked' | 'Streaming' | 'Settled' | 'Claimed Early';

interface Invoice {
  id: string;
  supplier: string;
  buyer: string;
  amount: number;
  lockedDate: string;
  maturityDate: string;
  yieldEarned: number;
  status: InvoiceStatus;
  daysRemaining: number | null;
  nftTokenId: number;
}

const invoices: Invoice[] = [
  {
    id: 'INV-1089',
    supplier: 'Highland Precision Engineering',
    buyer: 'ScotRail Maintenance Ltd',
    amount: 45000,
    lockedDate: '2026-03-18',
    maturityDate: '2026-04-17',
    yieldEarned: 0,
    status: 'Locked',
    daysRemaining: 30,
    nftTokenId: 12,
  },
  {
    id: 'INV-1088',
    supplier: 'Cairngorm Analytics Ltd',
    buyer: 'NHS Highland',
    amount: 62000,
    lockedDate: '2026-03-17',
    maturityDate: '2026-05-16',
    yieldEarned: 42.8,
    status: 'Streaming',
    daysRemaining: 59,
    nftTokenId: 11,
  },
  {
    id: 'INV-1087',
    supplier: 'Edinburgh BioSciences',
    buyer: 'University of Edinburgh',
    amount: 118000,
    lockedDate: '2026-03-12',
    maturityDate: '2026-04-11',
    yieldEarned: 285.6,
    status: 'Streaming',
    daysRemaining: 24,
    nftTokenId: 10,
  },
  {
    id: 'INV-1086',
    supplier: 'Forth Bridge Fabrication',
    buyer: 'Transport Scotland',
    amount: 185000,
    lockedDate: '2026-03-01',
    maturityDate: '2026-04-30',
    yieldEarned: 612.3,
    status: 'Streaming',
    daysRemaining: 43,
    nftTokenId: 9,
  },
  {
    id: 'INV-1085',
    supplier: 'Dundee Renewables Co-op',
    buyer: 'SSE Energy Solutions',
    amount: 34500,
    lockedDate: '2026-02-20',
    maturityDate: '2026-03-22',
    yieldEarned: 198.7,
    status: 'Locked',
    daysRemaining: 4,
    nftTokenId: 8,
  },
  {
    id: 'INV-1084',
    supplier: 'Leith Digital Services',
    buyer: 'City of Edinburgh Council',
    amount: 28500,
    lockedDate: '2026-02-15',
    maturityDate: '2026-03-17',
    yieldEarned: 156.2,
    status: 'Claimed Early',
    daysRemaining: null,
    nftTokenId: 7,
  },
  {
    id: 'INV-1076',
    supplier: 'Forth Bridge Fabrication',
    buyer: 'Transport Scotland',
    amount: 92000,
    lockedDate: '2026-01-15',
    maturityDate: '2026-03-16',
    yieldEarned: 541.8,
    status: 'Settled',
    daysRemaining: null,
    nftTokenId: 4,
  },
  {
    id: 'INV-1071',
    supplier: 'Glasgow CleanTech Ltd',
    buyer: 'Scottish Enterprise',
    amount: 82500,
    lockedDate: '2026-01-05',
    maturityDate: '2026-03-06',
    yieldEarned: 346.9,
    status: 'Settled',
    daysRemaining: null,
    nftTokenId: 2,
  },
];

const statusStyles: Record<InvoiceStatus, string> = {
  Locked: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Streaming: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Settled: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'Claimed Early': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

function formatGBP(amount: number): string {
  return '£' + amount.toLocaleString('en-GB', { minimumFractionDigits: 0 });
}

export default function InvoiceTable() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
            <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier</th>
            <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Amount</th>
            <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Locked</th>
            <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Maturity</th>
            <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Yield</th>
            <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <>
              <tr
                key={inv.id}
                className="border-b border-border/50 hover:bg-background/50 cursor-pointer transition-colors"
                onClick={() => setExpanded(expanded === inv.id ? null : inv.id)}
              >
                <td className="px-5 py-3.5 font-mono text-gray-300">{inv.id}</td>
                <td className="px-5 py-3.5 text-white">{inv.supplier}</td>
                <td className="px-5 py-3.5 text-right font-mono text-white">{formatGBP(inv.amount)}</td>
                <td className="px-5 py-3.5 text-gray-400">{inv.lockedDate}</td>
                <td className="px-5 py-3.5 text-gray-400">{inv.maturityDate}</td>
                <td className="px-5 py-3.5 text-right font-mono text-emerald-400">
                  {inv.yieldEarned > 0 ? `+${formatGBP(inv.yieldEarned)}` : '—'}
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyles[inv.status]}`}>
                    {inv.status}
                  </span>
                </td>
              </tr>
              {expanded === inv.id && (
                <tr key={`${inv.id}-detail`} className="border-b border-border/50">
                  <td colSpan={7} className="px-5 py-4 bg-background/30">
                    <div className="grid grid-cols-4 gap-6 text-xs">
                      <div>
                        <p className="text-gray-500 uppercase tracking-wider mb-1">Buyer</p>
                        <p className="text-gray-300">{inv.buyer}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 uppercase tracking-wider mb-1">NFT Token</p>
                        <p className="text-gray-300 font-mono">EPI #{inv.nftTokenId}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 uppercase tracking-wider mb-1">Days Remaining</p>
                        <p className="text-gray-300">
                          {inv.daysRemaining !== null ? `${inv.daysRemaining} days` : 'Complete'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 uppercase tracking-wider mb-1">Vault</p>
                        <p className="text-gray-300 font-mono">InvoiceVault (ERC-4626)</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
