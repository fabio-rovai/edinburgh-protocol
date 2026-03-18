import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Edinburgh Protocol',
  description: 'Payment commitment infrastructure for Scottish trade finance',
};

const navItems = [
  { href: '/', label: 'Overview', icon: '◉' },
  { href: '/invoices', label: 'Invoices', icon: '⟐' },
  { href: '/adapters', label: 'Yield Adapters', icon: '⬡' },
  { href: '/risk', label: 'Risk & Sentinel', icon: '△' },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-surface border-r border-border flex flex-col">
          <div className="p-6 border-b border-border">
            <h1 className="text-lg font-bold text-white tracking-tight">
              Edinburgh Protocol
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Payment Commitment Infrastructure
            </p>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-background transition-colors"
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-border space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <p className="text-xs text-gray-500">Sepolia Testnet</p>
            </div>
            <p className="text-xs text-gray-600">v0.1.0</p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 bg-background overflow-auto">
          <div className="p-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
