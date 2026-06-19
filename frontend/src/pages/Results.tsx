import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { executionsApi, reportsApi } from '../api/executions';
import { Execution, Report } from '../types';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { formatDistanceToNow, format } from 'date-fns';

export function Results() {
  const { id } = useParams<{ id: string }>();
  const [execution, setExecution] = useState<Execution | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([executionsApi.get(id), reportsApi.list(id)]).then(([eRes, rRes]) => {
      setExecution(eRes.data.data ?? null);
      setReports(rRes.data.data ?? []);
      setLoading(false);
    });
  }, [id]);

  const handleGenerateReport = async (format: 'html' | 'json' | 'csv') => {
    if (!id) return;
    setGenerating(format);
    try {
      await reportsApi.generate(id, format);
      const rRes = await reportsApi.list(id);
      setReports(rRes.data.data ?? []);
    } finally {
      setGenerating(null);
    }
  };

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!execution) return <div className="p-8 text-slate-400">Execution not found</div>;

  const m = execution.metrics;
  const latencyData = m
    ? [
        { name: 'p50', value: m.p50, fill: '#22c55e' },
        { name: 'p90', value: m.p90, fill: '#eab308' },
        { name: 'p95', value: m.p95, fill: '#f97316' },
        { name: 'p99', value: m.p99, fill: '#ef4444' },
        { name: 'avg', value: m.avg, fill: '#3b82f6' },
      ]
    : [];

  const duration =
    execution.startedAt && execution.completedAt
      ? Math.round(
          (new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()) / 1000,
        )
      : null;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link to="/executions" className="text-slate-500 hover:text-slate-300 text-sm">← Executions</Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">
            {execution.name ?? `Execution ${execution.id.slice(-8)}`}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <StatusBadge status={execution.status} />
            <span className="text-slate-500 text-xs">
              {execution.startedAt
                ? `Started ${formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true })}`
                : 'Not started'}
            </span>
            {duration && <span className="text-slate-500 text-xs">Duration: {duration}s</span>}
          </div>
        </div>

        {/* Report actions */}
        <div className="flex gap-2">
          {(['html', 'json', 'csv'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => handleGenerateReport(fmt)}
              disabled={!!generating || execution.status !== 'completed'}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              {generating === fmt ? '…' : `↓ ${fmt.toUpperCase()}`}
            </button>
          ))}
        </div>
      </div>

      {/* Metric cards */}
      {m && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="p50 Latency" value={m.p50.toFixed(0)} unit="ms" color="green" />
          <MetricCard label="p95 Latency" value={m.p95.toFixed(0)} unit="ms" color={m.p95 > 500 ? 'red' : 'yellow'} />
          <MetricCard label="p99 Latency" value={m.p99.toFixed(0)} unit="ms" color={m.p99 > 1000 ? 'red' : 'yellow'} />
          <MetricCard label="Requests/s" value={m.rps.toFixed(1)} color="blue" />
          <MetricCard label="Total Requests" value={m.totalRequests} color="slate" />
          <MetricCard label="Error Rate" value={m.errorRate.toFixed(2)} unit="%" color={m.errorRate > 5 ? 'red' : 'green'} />
          <MetricCard label="Success Rate" value={m.successRate.toFixed(1)} unit="%" color="green" />
          <MetricCard label="Max Latency" value={m.max.toFixed(0)} unit="ms" color="slate" />
        </div>
      )}

      {/* Latency breakdown chart */}
      {latencyData.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Latency Distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={latencyData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit="ms" />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                formatter={(v: number) => [`${v.toFixed(1)}ms`, 'latency']}
              />
              <ReferenceLine y={500} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '500ms SLA', fill: '#ef4444', fontSize: 11 }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {latencyData.map((entry, i) => (
                  <React.Fragment key={i}>
                    {/* color per bar is set via fill in data */}
                  </React.Fragment>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Existing reports */}
      {reports.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Generated Reports</h2>
          <div className="space-y-2">
            {reports.map((r) => (
              <div key={r.id} className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-2">
                <span className="text-sm text-slate-300">{r.format.toUpperCase()} — {format(new Date(r.createdAt), 'PPp')}</span>
                <a
                  href={reportsApi.downloadUrl(execution.id, r.id)}
                  download
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs */}
      {execution.logs.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Execution Logs</h2>
          <pre className="text-xs text-slate-400 font-mono overflow-auto max-h-64 bg-black/30 rounded-lg p-3">
            {execution.logs.join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
}
