import React, { useState, useEffect } from 'react';
import { MetricCard } from '../components/MetricCard.jsx';

export function Overview() {
  const [stats, setStats] = useState({ totalExecutions: 0, avgLatency: 0, passRate: 0 });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-slate-100">Overview</h1>
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Total Executions" value={stats.totalExecutions} color="blue" />
        <MetricCard label="Avg Latency" value={stats.avgLatency} unit="ms" color="green" />
        <MetricCard label="Pass Rate" value={`${stats.passRate}%`} color="slate" />
      </div>
    </div>
  );
}
