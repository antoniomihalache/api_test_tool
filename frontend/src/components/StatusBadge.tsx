import React from 'react';
import clsx from 'clsx';
import { ExecutionStatus } from '../types';

const statusConfig: Record<ExecutionStatus, { label: string; classes: string }> = {
  pending: { label: 'Pending', classes: 'bg-slate-700 text-slate-300' },
  running: { label: 'Running', classes: 'bg-blue-500/20 text-blue-300 animate-pulse' },
  completed: { label: 'Completed', classes: 'bg-green-500/20 text-green-300' },
  failed: { label: 'Failed', classes: 'bg-red-500/20 text-red-300' },
  cancelled: { label: 'Cancelled', classes: 'bg-yellow-500/20 text-yellow-300' },
  archived: { label: 'Archived', classes: 'bg-slate-800 text-slate-500' },
};

export function StatusBadge({ status }: { status: ExecutionStatus }) {
  const cfg = statusConfig[status];
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', cfg.classes)}>
      {cfg.label}
    </span>
  );
}
