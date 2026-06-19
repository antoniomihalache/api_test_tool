import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { executionsApi } from '../api/executions';
import { servicesApi } from '../api/services';
import { Execution, Service } from '../types';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';

export function Overview() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      executionsApi.list({ limit: 20 }),
      servicesApi.list(),
    ])
      .then(([exRes, svRes]) => {
        setExecutions(exRes.data.data ?? []);
        setServices(svRes.data.data ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const completed = executions.filter((e) => e.status === 'completed');
  const running = executions.filter((e) => e.status === 'running');
  const failed = executions.filter((e) => e.status === 'failed');
  const successRate =
    completed.length > 0
      ? ((completed.length / (completed.length + failed.length)) * 100).toFixed(1)
      : '—';

  const avgP95 =
    completed.length > 0
      ? (
          completed.reduce((sum, e) => sum + (e.metrics?.p95 ?? 0), 0) / completed.length
        ).toFixed(0)
      : '—';

  // Build latency trend from recent executions
  const latencyTrend = completed.slice(0, 10).reverse().map((e, i) => ({
    run: `Run ${i + 1}`,
    p50: e.metrics?.p50 ?? 0,
    p95: e.metrics?.p95 ?? 0,
    p99: e.metrics?.p99 ?? 0,
  }));

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Overview</h1>
        <p className="text-slate-400 text-sm mt-1">Performance platform status and recent activity</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Services" value={services.length} color="blue" />
        <MetricCard label="Running Tests" value={running.length} color={running.length > 0 ? 'blue' : 'slate'} />
        <MetricCard label="Success Rate" value={successRate} unit="%" color="green" />
        <MetricCard label="Avg p95 Latency" value={avgP95} unit="ms" color={Number(avgP95) > 500 ? 'red' : 'green'} />
      </div>

      {/* Latency trend chart */}
      {latencyTrend.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Latency Trend (recent runs)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={latencyTrend}>
              <defs>
                <linearGradient id="p95grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="run" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit="ms" />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="p95" stroke="#3b82f6" fill="url(#p95grad)" name="p95" />
              <Area type="monotone" dataKey="p50" stroke="#22c55e" fill="none" name="p50" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent executions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">Recent Executions</h2>
          <Link to="/executions" className="text-xs text-blue-400 hover:text-blue-300">View all →</Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 text-xs border-b border-slate-800">
              <th className="px-5 py-3">Name / ID</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">p95</th>
              <th className="px-5 py-3">Requests</th>
              <th className="px-5 py-3">Started</th>
            </tr>
          </thead>
          <tbody>
            {executions.slice(0, 8).map((ex) => (
              <tr key={ex.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="px-5 py-3">
                  <Link to={`/executions/${ex.id}`} className="text-slate-200 hover:text-blue-400 font-mono text-xs">
                    {ex.name ?? ex.id.slice(-8)}
                  </Link>
                </td>
                <td className="px-5 py-3"><StatusBadge status={ex.status} /></td>
                <td className="px-5 py-3 text-slate-300">{ex.metrics?.p95 ? `${ex.metrics.p95.toFixed(0)}ms` : '—'}</td>
                <td className="px-5 py-3 text-slate-300">{ex.metrics?.totalRequests ?? '—'}</td>
                <td className="px-5 py-3 text-slate-500 text-xs">
                  {ex.startedAt ? formatDistanceToNow(new Date(ex.startedAt), { addSuffix: true }) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {executions.length === 0 && (
          <p className="px-5 py-8 text-slate-500 text-sm text-center">No executions yet. Start your first test →</p>
        )}
      </div>
    </div>
  );
}
