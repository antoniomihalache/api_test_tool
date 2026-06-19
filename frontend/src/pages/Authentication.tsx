import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { AuthConfig } from '../types';

const TYPE_LABELS: Record<string, string> = {
  none: 'None',
  bearer: 'Bearer Token',
  jwt: 'JWT',
  oauth2: 'OAuth2',
  basic: 'Basic Auth',
  custom: 'Custom Login',
};

export function Authentication() {
  const [configs, setConfigs] = useState<AuthConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<AuthConfig & { loginBody: string; loginHeaders: string }>>({
    name: '',
    type: 'bearer',
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    apiClient.get('/auth/configs').then((r) => {
      setConfigs(r.data.data ?? []);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        loginBody: form.loginBody ? JSON.parse(form.loginBody) : undefined,
        loginHeaders: form.loginHeaders ? JSON.parse(form.loginHeaders) : undefined,
      };
      await apiClient.post('/auth/configs', payload);
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this auth config?')) return;
    await apiClient.delete(`/auth/configs/${id}`);
    load();
  };

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Authentication</h1>
          <p className="text-slate-400 text-sm mt-1">Configure how k6 VUs authenticate against target services</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add Config
        </button>
      </div>

      {/* Auth flow diagram */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Auth Flow</h3>
        <div className="flex items-center gap-2 text-sm text-slate-400 flex-wrap">
          {['VU Start', 'Login Once', 'Store Token', 'Reuse Token', 'Refresh if Expired'].map((step, i) => (
            <React.Fragment key={step}>
              <span className="bg-slate-800 px-3 py-1.5 rounded-lg text-slate-300 text-xs">{step}</span>
              {i < 4 && <span className="text-slate-600">→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Config list */}
      <div className="space-y-3">
        {configs.map((cfg) => (
          <div key={cfg.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-100">{cfg.name}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                  {TYPE_LABELS[cfg.type] ?? cfg.type}
                </span>
                {cfg.loginEndpoint && (
                  <span className="text-xs text-slate-500">endpoint: {cfg.loginEndpoint}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => handleDelete(cfg.id)}
              className="text-slate-600 hover:text-red-400 text-sm transition-colors"
            >
              Delete
            </button>
          </div>
        ))}
        {configs.length === 0 && (
          <div className="text-center py-16 text-slate-600">No auth configs yet.</div>
        )}
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-100">Add Auth Config</h2>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Name *</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500" />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Auth Type *</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AuthConfig['type'] }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100">
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            {['bearer', 'jwt', 'oauth2', 'custom'].includes(form.type ?? '') && (
              <>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Login Endpoint</label>
                  <input value={form.loginEndpoint ?? ''} onChange={(e) => setForm((f) => ({ ...f, loginEndpoint: e.target.value }))}
                    placeholder="/auth/login"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Login Body (JSON)</label>
                  <textarea rows={3} value={form.loginBody ?? ''} onChange={(e) => setForm((f) => ({ ...f, loginBody: e.target.value }))}
                    placeholder='{"username":"user","password":"pass"}'
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Token Extract Path (JSON path)</label>
                  <input value={form.tokenExtractPath ?? ''} onChange={(e) => setForm((f) => ({ ...f, tokenExtractPath: e.target.value }))}
                    placeholder="data.token"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500" />
                </div>
              </>
            )}

            {form.type === 'basic' && (
              <>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Username</label>
                  <input value={form.username ?? ''} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Password</label>
                  <input type="password" value={form.password ?? ''} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500" />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm py-2 rounded-lg">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm py-2 rounded-lg">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
