import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { executionsApi } from '../api/executions';
import { Execution } from '../types';

export function ResultsHome() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    executionsApi.list({ status: 'completed', limit: 50 }).then((res) => {
      setExecutions(res.data.data ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Results</h1>
        <p className="text-slate-400 text-sm mt-1">Browse completed runs and open detailed reports</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 text-xs border-b border-slate-800">
              <th className="px-5 py-3">Execution</th>
              <th className="px-5 py-3">p95</th>
              <th className="px-5 py-3">RPS</th>
              <th className="px-5 py-3">Success Rate</th>
              <th className="px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {executions.map((ex) => (
              <tr key={ex.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                <td className="px-5 py-3 text-slate-200 font-mono text-xs">{ex.name ?? ex.id.slice(-12)}</td>
                <td className="px-5 py-3 text-slate-300">{ex.metrics?.p95 ? `${ex.metrics.p95.toFixed(0)}ms` : '—'}</td>
                <td className="px-5 py-3 text-slate-300">{ex.metrics?.rps ? ex.metrics.rps.toFixed(1) : '—'}</td>
                <td className="px-5 py-3 text-slate-300">{ex.metrics?.successRate ? `${ex.metrics.successRate.toFixed(1)}%` : '—'}</td>
                <td className="px-5 py-3">
                  <Link to={`/results/${ex.id}`} className="text-blue-400 hover:text-blue-300 text-xs">Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {executions.length === 0 && (
          <div className="px-5 py-12 text-center text-slate-600">No completed executions yet.</div>
        )}
      </div>
    </div>
  );
}
