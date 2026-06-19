import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { executionsApi } from '../api/executions.js';

const statusColors = {
  pending:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  running:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  completed: 'bg-green-500/10 text-green-400 border-green-500/20',
  failed:    'bg-red-500/10 text-red-400 border-red-500/20',
  cancelled: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const statusDot = {
  pending:   '🟡',
  running:   '🔵',
  completed: '🟢',
  failed:    '🔴',
  cancelled: '⚫',
};

function fmt(ms) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function Executions() {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = () =>
    executionsApi.list(filter ? { status: filter } : undefined)
      .then(res => setExecutions(res.data?.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [filter]);

  // Poll every 3s if any execution is active
  useEffect(() => {
    const hasActive = executions.some(e => ['pending', 'running'].includes(e.status));
    if (!hasActive) return;
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [executions]);

  const handleCancel = async (id, e) => {
    e.preventDefault();
    if (!confirm('Cancel this execution?')) return;
    await executionsApi.cancel(id);
    load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-100">Executions</h1>
        <div className="flex gap-2">
          {['', 'running', 'completed', 'failed', 'cancelled'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${filter === s ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-700 text-slate-400 hover:text-slate-100'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : executions.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3">⚡</p>
          <p className="text-lg font-medium text-slate-400">No executions yet</p>
          <p className="text-sm mt-1">Go to <Link to="/scenarios" className="text-blue-400 hover:underline">Scenarios</Link> and click ▶ Run</p>
        </div>
      ) : (
        <div className="space-y-2">
          {executions.map(exec => (
            <Link key={exec.id} to={`/executions/${exec.id}`}
              className="block bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span>{statusDot[exec.status] || '⚫'}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs border px-2 py-0.5 rounded ${statusColors[exec.status] || statusColors.cancelled}`}>
                        {exec.status}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">{exec._id || exec.id}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                      {exec.vus && <span>⚡ {exec.vus} VUs</span>}
                      {exec.p95Latency && <span>p95: {fmt(exec.p95Latency)}</span>}
                      {exec.iterationCount && <span>{exec.iterationCount} iterations</span>}
                      {exec.failureRate != null && <span className={exec.failureRate > 0.05 ? 'text-red-400' : 'text-green-400'}>
                        {(exec.failureRate * 100).toFixed(1)}% errors
                      </span>}
                      <span>{new Date(exec.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                {['pending', 'running'].includes(exec.status) && (
                  <button onClick={(e) => handleCancel(exec.id, e)}
                    className="text-xs text-red-400 hover:text-red-300 border border-red-900/40 px-3 py-1.5 rounded-lg">
                    Cancel
                  </button>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

