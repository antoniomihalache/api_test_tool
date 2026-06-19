import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { executionsApi } from '../api/executions.js';

const statusColors = {
  pending:   'text-yellow-400',
  running:   'text-blue-400',
  completed: 'text-green-400',
  failed:    'text-red-400',
  cancelled: 'text-slate-400',
};

function MetricBox({ label, value, unit }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-xl font-bold text-slate-100">{value ?? '—'}{unit && <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>}</p>
    </div>
  );
}

export function ExecutionDetail() {
  const { id } = useParams();
  const [execution, setExecution] = useState(null);
  const [loading, setLoading] = useState(true);
  const logRef = useRef(null);

  const load = () =>
    executionsApi.get(id)
      .then(res => setExecution(res.data?.data))
      .catch(console.error)
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [id]);

  // Poll every 2s while running/pending
  useEffect(() => {
    if (!execution || !['pending', 'running'].includes(execution.status)) return;
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, [execution?.status]);

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [execution?.logOutput]);

  if (loading) return <div className="p-6 text-slate-400">Loading...</div>;
  if (!execution) return <div className="p-6 text-red-400">Execution not found</div>;

  const isActive = ['pending', 'running'].includes(execution.status);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/executions" className="text-slate-400 hover:text-slate-100 text-sm">← Executions</Link>
        <span className="text-slate-600">/</span>
        <span className="text-slate-400 text-sm font-mono">{id}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-100">Execution Detail</h1>
          <span className={`text-sm font-semibold ${statusColors[execution.status]}`}>
            {isActive && <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-2 animate-pulse" />}
            {execution.status}
          </span>
        </div>
        {isActive && (
          <button onClick={async () => { await executionsApi.cancel(id); load(); }}
            className="text-xs text-red-400 hover:text-red-300 border border-red-900/40 px-3 py-1.5 rounded-lg">
            Cancel Execution
          </button>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricBox label="Status" value={execution.status} />
        <MetricBox label="VUs" value={execution.vus} />
        <MetricBox label="p95 Latency" value={execution.p95Latency?.toFixed(1)} unit="ms" />
        <MetricBox label="p99 Latency" value={execution.p99Latency?.toFixed(1)} unit="ms" />
        <MetricBox label="Avg Latency" value={execution.avgLatency?.toFixed(1)} unit="ms" />
        <MetricBox label="Requests/s" value={execution.rps?.toFixed(1)} />
        <MetricBox label="Iterations" value={execution.iterationCount} />
        <MetricBox label="Error Rate" value={execution.failureRate != null ? `${(execution.failureRate * 100).toFixed(2)}%` : null} />
      </div>

      {/* Logs */}
      <div>
        <h2 className="text-sm font-medium text-slate-400 mb-2 uppercase tracking-wide">
          {isActive ? '⟳ Live Output' : 'Output'}
        </h2>
        <pre
          ref={logRef}
          className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 font-mono h-96 overflow-y-auto whitespace-pre-wrap">
          {execution.logOutput || (isActive ? 'Waiting for output...' : 'No output captured')}
        </pre>
      </div>
    </div>
  );
}

