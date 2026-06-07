'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  GitGraph,
  Brain,
  TrendingUp,
  AlertTriangle,
  Server,
  Settings,
} from 'lucide-react';

const navigation = [
  { name: 'Health Overview', href: '/', icon: LayoutDashboard },
  { name: 'Incident Timeline', href: '/incidents', icon: GitGraph },
  { name: 'ML Insights', href: '/ml-insights', icon: Brain },
  { name: 'SLA & Trends', href: '/sla-trends', icon: TrendingUp },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-gray-900 border-r border-gray-700 transition-transform duration-300">
      <div className="flex h-16 items-center justify-between px-6 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white">AIOps Platform</h1>
        <span className="text-xs text-gray-400">SecureTransport</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center gap-3 text-sm">
          <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
            <Server className="h-4 w-4 text-gray-400" />
          </div>
          <div>
            <p className="text-white font-medium">prod-us-east</p>
            <p className="text-xs text-gray-400">Cluster</p>
          </div>
        </div>
      </div>
    </aside>
  );
}