import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { executionsApi } from '../api/executions';
import { scenariosApi } from '../api/scenarios';
import { Execution, Scenario } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { formatDistanceToNow } from 'date-fns';

export function Executions() {
  const navigate = useNavigate();
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [showLaunch, setShowLaunch] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState('');
  const [launching, setLaunching] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      executionsApi.list({ limit: 50, status: filter || undefined }),
      scenariosApi.list(),
    ]).then(([eRes, sRes]) => {
      setExecutions(eRes.data.data ?? []);
      setScenarios(sRes.data.data ?? []);
      setLoading(false);
    });
  }, [filter]);

  useEffect(load, [load]);

  // Auto-refresh running executions
  useEffect(() => {
    const interval = setInterval(() => {
      if (executions.some((e) => e.status === 'running' || e.status === 'pending')) {
        load();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [executions, load]);

  const handleLaunch = async () => {
    if (!selectedScenario) return;
    setLaunching(true);
    try {
      const res = await executionsApi.start({ scenarioId: selectedScenario });
      navigate(`/executions/${res.data.data?.id}`);
    } finally {
      setLaunching(false);
    }
  };

  const handleCancel = async (id: string) => {
    await executionsApi.cancel(id);
    load();
  };

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Executions</h1>
          <p className="text-slate-400 text-sm mt-1">Monitor and manage test runs</p>
        </div>
        <button onClick={() => setShowLaunch(true)} className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          ▶ Launch Test
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['', 'running', 'completed', 'failed', 'pending', 'cancelled'].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${filter === s ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-100'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Execution list */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 text-xs border-b border-slate-800">
              <th className="px-5 py-3">Execution</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Runner</th>
              <th className="px-5 py-3">p50</th>
              <th className="px-5 py-3">p95</th>
              <th className="px-5 py-3">Error %</th>
              <th className="px-5 py-3">Started</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {executions.map((ex) => (
              <tr key={ex.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="px-5 py-3">
                  <Link to={`/executions/${ex.id}`} className="text-slate-200 hover:text-blue-400 font-mono text-xs">
                    {ex.name ?? ex.id.slice(-12)}
                  </Link>
                </td>
                <td className="px-5 py-3"><StatusBadge status={ex.status} /></td>
                <td className="px-5 py-3 text-slate-500 text-xs">{ex.runnerMode}</td>
                <td className="px-5 py-3 text-slate-300">{ex.metrics?.p50 ? `${ex.metrics.p50.toFixed(0)}ms` : '—'}</td>
                <td className="px-5 py-3 text-slate-300">{ex.metrics?.p95 ? `${ex.metrics.p95.toFixed(0)}ms` : '—'}</td>
                <td className="px-5 py-3">
                  {ex.metrics?.errorRate !== undefined ? (
                    <span className={ex.metrics.errorRate > 5 ? 'text-red-400' : 'text-green-400'}>
                      {ex.metrics.errorRate.toFixed(1)}%
                    </span>
                  ) : '—'}
                </td>
                <td className="px-5 py-3 text-slate-500 text-xs">
                  {ex.startedAt ? formatDistanceToNow(new Date(ex.startedAt), { addSuffix: true }) : '—'}
                </td>
                <td className="px-5 py-3">
                  {ex.status === 'running' && (
                    <button onClick={() => handleCancel(ex.id)} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                      Cancel
                    </button>
                  )}
                  {ex.status === 'completed' && (
                    <Link to={`/results/${ex.id}`} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                      Results
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {executions.length === 0 && (
          <p className="px-5 py-12 text-slate-500 text-sm text-center">No executions match the current filter.</p>
        )}
      </div>

      {/* Launch modal */}
      {showLaunch && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-slate-100">Launch Test</h2>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Scenario *</label>
              <select value={selectedScenario} onChange={(e) => setSelectedScenario(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100">
                <option value="">Select a scenario…</option>
                {scenarios.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}
              </select>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowLaunch(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm py-2 rounded-lg">Cancel</button>
              <button onClick={handleLaunch} disabled={!selectedScenario || launching}
                className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm py-2 rounded-lg">
                {launching ? 'Starting…' : '▶ Start'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
