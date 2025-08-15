import React, { useLayoutEffect, useRef } from 'react';
import { RefreshCw, BarChart3, Users, Calendar, CreditCard, Download, Shield, LogOut } from 'lucide-react';

type Item = { id: string; label: string; icon?: React.ComponentType<any> };

const DEFAULT_ITEMS: Item[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'barbers', label: 'Barbers', icon: Users },
  { id: 'bookings', label: 'Bookings', icon: Calendar },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'export', label: 'Export', icon: Download },
  { id: 'security', label: 'Security', icon: Shield }
];

type Props = {
  items?: Item[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onRefresh?: () => void; // pass your refetch() here; falls back to reload
  refreshing?: boolean;
  onExitAdmin?: () => void; // optional exit handler
};

export default function AdminMobileNav({ 
  items = DEFAULT_ITEMS, 
  activeTab, 
  onTabChange, 
  onRefresh,
  refreshing = false,
  onExitAdmin
}: Props) {
  const barRef = useRef<HTMLDivElement>(null);

  // publish real height so content below never hides under it
  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const update = () => document.body.style.setProperty('--admin-nav-h', `${el.offsetHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const refresh = () => {
    // emit a global "admin:refresh" (optional listeners) then fallback
    window.dispatchEvent(new CustomEvent('admin:refresh'));
    (onRefresh ?? (() => window.location.reload()))();
  };

  const exitAdmin = () => {
    if (onExitAdmin) {
      onExitAdmin();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div
      ref={barRef}
      className="md:hidden sticky top-0 z-50 bg-white border-b border-gray-200"
      role="navigation"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="text-sm font-semibold text-gray-900">Admin Dashboard</div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50 active:scale-[.99] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button
            onClick={exitAdmin}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50 active:scale-[.99]"
          >
            <LogOut className="h-4 w-4" />
            <span>Exit</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <ul className="flex gap-2 px-2 pb-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onTabChange(item.id)}
                className={`inline-flex h-9 items-center justify-center rounded-xl px-3 text-sm whitespace-nowrap transition-colors ${
                  activeTab === item.id 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {item.icon && <item.icon className="h-4 w-4 mr-1" />}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}