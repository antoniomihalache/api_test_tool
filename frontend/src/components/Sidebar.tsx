import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';

const links = [
  { to: '/', label: 'Overview', icon: '◈' },
  { to: '/services', label: 'Services', icon: '⬡' },
  { to: '/authentication', label: 'Authentication', icon: '⬢' },
  { to: '/scenarios', label: 'Scenarios', icon: '▶' },
  { to: '/executions', label: 'Executions', icon: '⚡' },
  { to: '/results', label: 'Results', icon: '📊' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-56 min-h-screen bg-slate-900 border-r border-slate-800 flex flex-col">
      <div className="px-5 py-5 border-b border-slate-800">
        <span className="text-lg font-bold text-blue-400 tracking-tight">⚡ PerfPlatform</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive || (link.to !== '/' && location.pathname.startsWith(link.to))
                  ? 'bg-blue-600/20 text-blue-300'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
              )
            }
          >
            <span className="text-base">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-slate-800 text-xs text-slate-600">
        Perf Platform v1.0
      </div>
    </aside>
  );
}
