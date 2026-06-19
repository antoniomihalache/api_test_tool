import React from 'react';
import clsx from 'clsx';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'slate';
}

const colorMap = {
  blue: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
  green: 'bg-green-500/10 border-green-500/20 text-green-300',
  red: 'bg-red-500/10 border-red-500/20 text-red-300',
  yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
  slate: 'bg-slate-700/30 border-slate-700 text-slate-300',
};

export function MetricCard({ label, value, unit, color = 'slate' }: MetricCardProps) {
  return (
    <div className={clsx('rounded-xl border p-4', colorMap[color])}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">
        {value}
        {unit && <span className="text-sm font-normal ml-1 opacity-60">{unit}</span>}
      </p>
    </div>
  );
}
