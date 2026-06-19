import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { executionsApi } from '../api/executions';
import { Execution } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export function ExecutionDetail() {
  const { id } = useParams<{ id: string }>();
  const [execution, setExecution] = useState<Execution | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!id) return;
    executionsApi.get(id).then((r) => {
      setExecution(r.data.data ?? null);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    // Poll while running
    const interval = setInterval(() => {
      if (execution?.status === 'running' || execution?.status === 'pending') {
        load();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [id, execution?.status]);

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!execution) return <div className="p-8 text-slate-400">Execution not found</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-100 font-mono">{execution.id.slice(-12)}</h1>
        <StatusBadge status={execution.status} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Environment</p>
          <p className="text-slate-200">{execution.environment}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Runner</p>
          <p className="text-slate-200">{execution.runnerMode}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Started</p>
          <p className="text-slate-200">{execution.startedAt ? new Date(execution.startedAt).toLocaleTimeString() : '—'}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Completed</p>
          <p className="text-slate-200">{execution.completedAt ? new Date(execution.completedAt).toLocaleTimeString() : '—'}</p>
        </div>
      </div>

      {execution.logs.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">
            Live Logs
            {execution.status === 'running' && (
              <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
            )}
          </h2>
          <pre className="text-xs text-slate-400 font-mono overflow-auto max-h-80 bg-black/30 rounded-lg p-3">
            {execution.logs.join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
}
