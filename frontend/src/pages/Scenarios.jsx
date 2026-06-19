import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { scenariosApi } from '../api/scenarios.js';
import { servicesApi } from '../api/services.js';
import { executionsApi } from '../api/executions.js';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const SCENARIO_TYPES = ['smoke', 'load', 'stress', 'spike', 'soak', 'custom'];
const ENVIRONMENTS = ['dev', 'qa', 'staging', 'production'];

function emptyRequest() {
  return { id: crypto.randomUUID(), name: '', method: 'GET', path: '', headers: [], body: '', assertions: [] };
}

function emptyScenario() {
  return {
    name: '', description: '', type: 'load', serviceId: '', environment: 'dev',
    vus: 10, duration: '5m', requests: [emptyRequest()], thresholds: [], stages: [],
  };
}

// ── Header row editor ──────────────────────────────────────────────────────────
function HeadersEditor({ headers, onChange }) {
  const add = () => onChange([...headers, { key: '', value: '' }]);
  const remove = (i) => onChange(headers.filter((_, idx) => idx !== i));
  const set = (i, field, val) => onChange(headers.map((h, idx) => idx === i ? { ...h, [field]: val } : h));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400">Headers</span>
        <button type="button" onClick={add} className="text-xs text-blue-400 hover:text-blue-300">+ Add Header</button>
      </div>
      {headers.map((h, i) => (
        <div key={i} className="flex gap-2 mb-1.5">
          <input value={h.key} onChange={e => set(i, 'key', e.target.value)}
            placeholder="Header name (e.g. Authorization)"
            className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500" />
          <input value={h.value} onChange={e => set(i, 'value', e.target.value)}
            placeholder="Value (e.g. Bearer {{token}})"
            className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500" />
          <button onClick={() => remove(i)} className="text-red-400 hover:text-red-300 px-1.5">✕</button>
        </div>
      ))}
    </div>
  );
}

// ── Single request editor ───────────────────────────────────────────────────────
function RequestEditor({ req, onChange, onRemove, index }) {
  const [open, setOpen] = useState(index === 0);
  const set = (key, val) => onChange({ ...req, [key]: val });

  return (
    <div className="bg-slate-700/40 border border-slate-600 rounded-xl">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <span className="text-xs font-mono bg-blue-600/20 text-blue-300 px-2 py-0.5 rounded">{req.method || 'GET'}</span>
        <span className="text-sm text-slate-300 flex-1">{req.path || <span className="text-slate-500">Untitled request</span>}</span>
        <span className="text-slate-500 text-sm">{open ? '▲' : '▼'}</span>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-red-400 hover:text-red-300 text-xs ml-2">Remove</button>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-600/50 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Name</label>
              <input value={req.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. List Users"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Method</label>
              <select value={req.method} onChange={e => set('method', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500">
                {METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Path</label>
            <input value={req.path} onChange={e => set('path', e.target.value)}
              placeholder="e.g. /api/users or /api/users/{{userId}}"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-blue-500" />
          </div>

          <HeadersEditor headers={req.headers || []} onChange={val => set('headers', val)} />

          {['POST', 'PUT', 'PATCH'].includes(req.method) && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Body (JSON)</label>
              <textarea value={req.body} onChange={e => set('body', e.target.value)}
                rows={3} placeholder='{"key": "value"}'
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500" />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-400">Assertions</label>
              <button type="button" onClick={() => set('assertions', [...(req.assertions || []), { type: 'status', operator: 'eq', value: 200 }])}
                className="text-xs text-blue-400 hover:text-blue-300">+ Add Assertion</button>
            </div>
            {(req.assertions || []).map((a, i) => (
              <div key={i} className="flex gap-2 mb-1.5">
                <select value={a.type} onChange={e => set('assertions', req.assertions.map((x, j) => j === i ? { ...x, type: e.target.value } : x))}
                  className="bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500">
                  {['status', 'latency', 'body', 'header'].map(t => <option key={t}>{t}</option>)}
                </select>
                <select value={a.operator} onChange={e => set('assertions', req.assertions.map((x, j) => j === i ? { ...x, operator: e.target.value } : x))}
                  className="bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500">
                  {['eq', 'lt', 'gt', 'contains'].map(o => <option key={o}>{o}</option>)}
                </select>
                <input value={a.value} onChange={e => set('assertions', req.assertions.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                  placeholder="200"
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500" />
                <button onClick={() => set('assertions', req.assertions.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 px-1.5">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Scenario create/edit modal ────────────────────────────────────────────────
function ScenarioModal({ scenario, services, onClose, onSaved }) {
  const [form, setForm] = useState(() => {
    if (scenario) {
      return {
        ...scenario,
        requests: (scenario.requests || []).map(r => ({
          ...r,
          headers: Object.entries(r.headers || {}).map(([key, value]) => ({ key, value })),
        })),
      };
    }
    return emptyScenario();
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const addRequest = () => set('requests', [...form.requests, emptyRequest()]);
  const updateRequest = (i, req) => set('requests', form.requests.map((r, idx) => idx === i ? req : r));
  const removeRequest = (i) => set('requests', form.requests.filter((_, idx) => idx !== i));

  const selectedService = services.find(s => s.id === form.serviceId);
  const availableEnvs = selectedService?.environments?.map(e => e.name) || ENVIRONMENTS;

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Name is required');
    if (!form.serviceId) return setError('Select a service');
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        vus: Number(form.vus),
        requests: form.requests.map(r => ({
          ...r,
          headers: Object.fromEntries((r.headers || []).filter(h => h.key).map(h => [h.key, h.value])),
          assertions: (r.assertions || []).map(a => ({ ...a, value: isNaN(a.value) ? a.value : Number(a.value) })),
        })),
      };
      if (scenario) {
        await scenariosApi.update(scenario.id, payload);
      } else {
        await scenariosApi.create(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">{scenario ? 'Edit Scenario' : 'New Scenario'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-5">
          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Scenario Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. Payments API Load Test"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500" />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Service *</label>
              <select value={form.serviceId} onChange={e => set('serviceId', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500">
                <option value="">Select a service...</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Environment</label>
              <select value={form.environment} onChange={e => set('environment', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500">
                {availableEnvs.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Test Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500">
                {SCENARIO_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Virtual Users (VUs)</label>
              <input type="number" min="1" value={form.vus} onChange={e => set('vus', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500" />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Duration</label>
              <input value={form.duration} onChange={e => set('duration', e.target.value)}
                placeholder="e.g. 5m, 30s, 1h"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          {selectedService && (
            <div className="bg-slate-800/50 rounded-lg px-3 py-2 text-xs text-slate-400">
              Target: <span className="text-slate-200 font-mono">
                {selectedService.environments?.find(e => e.name === form.environment)?.baseUrl || '(no URL for this env)'}
              </span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-300">Requests</label>
              <button onClick={addRequest} className="text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-lg">
                + Add Request
              </button>
            </div>
            <div className="space-y-2">
              {form.requests.map((req, i) => (
                <RequestEditor key={req.id} req={req} index={i}
                  onChange={val => updateRequest(i, val)}
                  onRemove={() => removeRequest(i)} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-100">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium">
            {saving ? 'Saving...' : 'Save Scenario'}
          </button>
        </div>
      </div>
    </div>
  );
}

const typeColors = {
  smoke: 'bg-green-500/10 text-green-400 border-green-500/20',
  load: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  stress: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  spike: 'bg-red-500/10 text-red-400 border-red-500/20',
  soak: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  custom: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export function Scenarios() {
  const [scenarios, setScenarios] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [launching, setLaunching] = useState(null);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    Promise.all([scenariosApi.list(), servicesApi.list()])
      .then(([s, sv]) => {
        setScenarios(s.data?.data || []);
        setServices(sv.data?.data || []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this scenario?')) return;
    await scenariosApi.delete(id);
    load();
  };

  const handleRun = async (sc) => {
    setLaunching(sc.id);
    try {
      const res = await executionsApi.launch(sc.id);
      const execId = res.data?.data?._id || res.data?.data?.id;
      navigate(`/executions/${execId}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to launch');
    } finally {
      setLaunching(null);
    }
  };

  const serviceName = (id) => services.find(s => s.id === id)?.name || id;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-100">Scenarios</h1>
        <button onClick={() => setModal('create')}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          + New Scenario
        </button>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : scenarios.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3">▶</p>
          <p className="text-lg font-medium text-slate-400">No scenarios yet</p>
          <p className="text-sm mt-1">Create a scenario to define your load test</p>
          <button onClick={() => setModal('create')} className="mt-4 text-blue-400 hover:text-blue-300 text-sm">Create your first scenario →</button>
        </div>
      ) : (
        <div className="space-y-3">
          {scenarios.map(sc => (
            <div key={sc.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-slate-100">{sc.name}</h3>
                    <span className={`text-xs border px-2 py-0.5 rounded ${typeColors[sc.type] || typeColors.custom}`}>{sc.type}</span>
                    <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">{sc.environment}</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-2">{serviceName(sc.serviceId)}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>⚡ {sc.vus} VUs</span>
                    <span>⏱ {sc.duration}</span>
                    <span>📋 {(sc.requests || []).length} request{sc.requests?.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => handleRun(sc)} disabled={launching === sc.id}
                    className="text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg font-medium">
                    {launching === sc.id ? 'Launching...' : '▶ Run'}
                  </button>
                  <button onClick={() => setModal(sc)} className="text-xs text-slate-400 hover:text-slate-100 px-3 py-1.5 border border-slate-700 rounded-lg">Edit</button>
                  <button onClick={() => handleDelete(sc.id)} className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 border border-red-900/40 rounded-lg">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ScenarioModal
          scenario={modal === 'create' ? null : modal}
          services={services}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
