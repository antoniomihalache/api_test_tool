import React, { useEffect, useState } from 'react';
import { scenariosApi } from '../api/scenarios';
import { servicesApi } from '../api/services';
import { executionsApi } from '../api/executions';
import { Scenario, Service, ScenarioType } from '../types';
import { useNavigate } from 'react-router-dom';

const TYPE_COLORS: Record<ScenarioType, string> = {
  smoke: 'bg-slate-600 text-slate-200',
  load: 'bg-blue-500/20 text-blue-300',
  stress: 'bg-orange-500/20 text-orange-300',
  spike: 'bg-red-500/20 text-red-300',
  soak: 'bg-purple-500/20 text-purple-300',
  custom: 'bg-teal-500/20 text-teal-300',
};

export function Scenarios() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Scenario>>({
    name: '',
    type: 'load',
    vus: 10,
    duration: '5m',
    environment: 'qa',
    requests: [],
    thresholds: [],
  });
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState<string | null>(null);

  const load = () => {
    Promise.all([scenariosApi.list(), servicesApi.list()]).then(([sRes, svRes]) => {
      setScenarios(sRes.data.data ?? []);
      setServices(svRes.data.data ?? []);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await scenariosApi.create(form);
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleLaunch = async (scenario: Scenario) => {
    setLaunching(scenario.id);
    try {
      const res = await executionsApi.start({ scenarioId: scenario.id, name: `${scenario.name} – ${new Date().toISOString()}` });
      navigate(`/executions/${res.data.data?.id}`);
    } finally {
      setLaunching(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this scenario?')) return;
    await scenariosApi.delete(id);
    load();
  };

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Scenarios</h1>
          <p className="text-slate-400 text-sm mt-1">Build and run load test scenarios</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + New Scenario
        </button>
      </div>

      <div className="space-y-3">
        {scenarios.map((sc) => {
          const service = services.find((s) => s.id === sc.serviceId);
          return (
            <div key={sc.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[sc.type]}`}>
                    {sc.type}
                  </span>
                  <h3 className="font-semibold text-slate-100">{sc.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLaunch(sc)}
                    disabled={!!launching}
                    className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {launching === sc.id ? 'Starting…' : '▶ Run'}
                  </button>
                  <button onClick={() => handleDelete(sc.id)} className="text-slate-600 hover:text-red-400 text-xs transition-colors">
                    Delete
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                <span>Service: <span className="text-slate-300">{service?.name ?? sc.serviceId}</span></span>
                <span>Env: <span className="text-slate-300">{sc.environment}</span></span>
                <span>VUs: <span className="text-slate-300">{sc.vus}</span></span>
                <span>Duration: <span className="text-slate-300">{sc.duration}</span></span>
                <span>Requests: <span className="text-slate-300">{sc.requests.length}</span></span>
              </div>

              {sc.thresholds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {sc.thresholds.map((t, i) => (
                    <span key={i} className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                      {t.metric}: {t.condition}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {scenarios.length === 0 && (
          <div className="text-center py-16 text-slate-600">No scenarios yet. Create your first test scenario.</div>
        )}
      </div>

      {/* Quick-create modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-100">New Scenario</h2>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Name *</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Type *</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ScenarioType }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100">
                  {Object.keys(TYPE_COLORS).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Environment</label>
                <select value={form.environment} onChange={(e) => setForm((f) => ({ ...f, environment: e.target.value as Scenario['environment'] }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100">
                  {['dev', 'qa', 'staging', 'production'].map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Service *</label>
              <select required value={form.serviceId ?? ''} onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100">
                <option value="">Select a service…</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Virtual Users</label>
                <input type="number" min={1} value={form.vus} onChange={(e) => setForm((f) => ({ ...f, vus: Number(e.target.value) }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Duration</label>
                <input value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                  placeholder="5m"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm py-2 rounded-lg">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm py-2 rounded-lg">
                {saving ? 'Saving…' : 'Create Scenario'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
