import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'ImpactVault Dashboard',
  description: 'Monitor and manage ImpactVault treasury operations',
};

const navItems = [
  { href: '/', label: 'Overview', icon: '◉' },
  { href: '/adapters', label: 'Adapters', icon: '⬡' },
  { href: '/risk', label: 'Risk', icon: '△' },
  { href: '/disbursements', label: 'Disbursements', icon: '⟐' },
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
            <h1 className="text-xl font-bold text-white">ImpactVault</h1>
            <p className="text-xs text-gray-500 mt-1">Treasury Dashboard</p>
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
          <div className="p-4 border-t border-border">
            <p className="text-xs text-gray-600">ImpactVault v0.1.0</p>
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
