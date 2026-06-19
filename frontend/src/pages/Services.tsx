import React, { useEffect, useState } from 'react';
import { servicesApi } from '../api/services';
import { Service, ServiceEnvironment } from '../types';

const ENV_COLORS: Record<string, string> = {
  dev: 'bg-slate-700 text-slate-300',
  qa: 'bg-blue-500/20 text-blue-300',
  staging: 'bg-yellow-500/20 text-yellow-300',
  production: 'bg-green-500/20 text-green-300',
};

const emptyForm: Partial<Service> = {
  name: '',
  description: '',
  namespace: '',
  tags: [],
  environments: [],
};

export function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Service>>(emptyForm);
  const [envInput, setEnvInput] = useState<ServiceEnvironment>({ name: 'dev', baseUrl: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    servicesApi.list().then((r) => {
      setServices(r.data.data ?? []);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const addEnv = () => {
    if (!envInput.baseUrl) return;
    setForm((f) => ({ ...f, environments: [...(f.environments ?? []), { ...envInput }] }));
    setEnvInput({ name: 'dev', baseUrl: '' });
  };

  const removeEnv = (i: number) => {
    setForm((f) => ({ ...f, environments: f.environments?.filter((_, idx) => idx !== i) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await servicesApi.create(form);
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this service?')) return;
    await servicesApi.delete(id);
    load();
  };

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Services</h1>
          <p className="text-slate-400 text-sm mt-1">Manage target REST services and their environments</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add Service
        </button>
      </div>

      {/* Service cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {services.map((svc) => (
          <div key={svc.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-100">{svc.name}</h3>
                {svc.description && <p className="text-slate-500 text-xs mt-0.5">{svc.description}</p>}
              </div>
              <button
                onClick={() => handleDelete(svc.id)}
                className="text-slate-600 hover:text-red-400 text-xs transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {svc.environments.map((env) => (
                <span key={env.name} className={`text-xs px-2 py-0.5 rounded-full ${ENV_COLORS[env.name] ?? 'bg-slate-700 text-slate-300'}`}>
                  {env.name}
                </span>
              ))}
            </div>

            {svc.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {svc.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {svc.namespace && (
              <p className="text-xs text-slate-600">namespace: {svc.namespace}</p>
            )}
          </div>
        ))}

        {services.length === 0 && (
          <div className="col-span-3 text-center py-16 text-slate-600">
            No services yet. Add your first target API.
          </div>
        )}
      </div>

      {/* Add service form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-lg space-y-4"
          >
            <h2 className="text-lg font-semibold text-slate-100">Add Service</h2>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div>
              <label className="block text-xs text-slate-400 mb-1">Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Namespace</label>
              <input
                value={form.namespace}
                onChange={(e) => setForm((f) => ({ ...f, namespace: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Tags (comma-separated)</label>
              <input
                value={(form.tags ?? []).join(', ')}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Environments */}
            <div>
              <label className="block text-xs text-slate-400 mb-2">Environments</label>
              {(form.environments ?? []).map((env, i) => (
                <div key={i} className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ENV_COLORS[env.name]}`}>{env.name}</span>
                  <span className="text-xs text-slate-400 flex-1 truncate">{env.baseUrl}</span>
                  <button type="button" onClick={() => removeEnv(i)} className="text-slate-600 hover:text-red-400 text-xs">✕</button>
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <select
                  value={envInput.name}
                  onChange={(e) => setEnvInput((v) => ({ ...v, name: e.target.value as ServiceEnvironment['name'] }))}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100"
                >
                  {['dev', 'qa', 'staging', 'production'].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <input
                  value={envInput.baseUrl}
                  onChange={(e) => setEnvInput((v) => ({ ...v, baseUrl: e.target.value }))}
                  placeholder="https://api.example.com"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
                <button type="button" onClick={addEnv} className="bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs px-3 py-1.5 rounded-lg">Add</button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm py-2 rounded-lg transition-colors"
              >
                {saving ? 'Saving…' : 'Save Service'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
