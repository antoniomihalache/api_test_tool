import React, { useState, useEffect } from 'react';
import { servicesApi } from '../api/services.js';

const ENVIRONMENTS = ['dev', 'qa', 'staging', 'production'];

const emptyForm = {
  name: '',
  description: '',
  namespace: '',
  tags: '',
  environments: [{ name: 'dev', baseUrl: '' }],
};

function ServiceModal({ service, onClose, onSaved }) {
  const [form, setForm] = useState(() =>
    service
      ? { ...service, tags: (service.tags || []).join(', '), environments: service.environments?.length ? service.environments : [{ name: 'dev', baseUrl: '' }] }
      : { ...emptyForm, environments: [{ name: 'dev', baseUrl: '' }] }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const addEnv = () => setForm(f => ({ ...f, environments: [...f.environments, { name: 'dev', baseUrl: '' }] }));
  const removeEnv = (i) => setForm(f => ({ ...f, environments: f.environments.filter((_, idx) => idx !== i) }));
  const setEnvField = (i, key, val) => setForm(f => ({
    ...f,
    environments: f.environments.map((e, idx) => idx === i ? { ...e, [key]: val } : e),
  }));

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Name is required');
    if (form.environments.some(e => !e.baseUrl.trim())) return setError('All environments need a Base URL');
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        namespace: form.namespace.trim(),
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        environments: form.environments,
      };
      if (service) {
        await servicesApi.update(service.id, payload);
      } else {
        await servicesApi.create(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">{service ? 'Edit Service' : 'Add Service'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-5">
          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Service Name *</label>
              <input value={form.name} onChange={e => setField('name', e.target.value)}
                placeholder="e.g. Payments API"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Namespace</label>
              <input value={form.namespace} onChange={e => setField('namespace', e.target.value)}
                placeholder="e.g. payments"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <input value={form.description} onChange={e => setField('description', e.target.value)}
              placeholder="Brief description of this service"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500" />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Tags (comma-separated)</label>
            <input value={form.tags} onChange={e => setField('tags', e.target.value)}
              placeholder="e.g. core, payments, critical"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-400">Environments & Base URLs</label>
              <button onClick={addEnv} className="text-xs text-blue-400 hover:text-blue-300">+ Add Environment</button>
            </div>
            <div className="space-y-2">
              {form.environments.map((env, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select value={env.name} onChange={e => setEnvField(i, 'name', e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500">
                    {ENVIRONMENTS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                  <input value={env.baseUrl} onChange={e => setEnvField(i, 'baseUrl', e.target.value)}
                    placeholder="e.g. http://192.168.1.100:8080"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500" />
                  {form.environments.length > 1 && (
                    <button onClick={() => removeEnv(i)} className="text-red-400 hover:text-red-300 px-2">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-100">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium">
            {saving ? 'Saving...' : 'Save Service'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | service object

  const load = () => {
    setLoading(true);
    servicesApi.list()
      .then(res => setServices(res.data?.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this service?')) return;
    await servicesApi.delete(id);
    load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-100">Services</h1>
        <button onClick={() => setModal('create')}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          + Add Service
        </button>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : services.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3">⬡</p>
          <p className="text-lg font-medium text-slate-400">No services yet</p>
          <p className="text-sm mt-1">Add a service to start testing your APIs</p>
          <button onClick={() => setModal('create')} className="mt-4 text-blue-400 hover:text-blue-300 text-sm">Add your first service →</button>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map(svc => (
            <div key={svc.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-slate-100">{svc.name}</h3>
                    {svc.namespace && <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded">{svc.namespace}</span>}
                    {(svc.tags || []).map(tag => (
                      <span key={tag} className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                  {svc.description && <p className="text-sm text-slate-400 mb-3">{svc.description}</p>}
                  <div className="flex flex-wrap gap-2">
                    {(svc.environments || []).map(env => (
                      <div key={env.name} className="flex items-center gap-1.5 bg-slate-700/50 rounded-lg px-3 py-1.5">
                        <span className="text-xs font-medium text-slate-400 uppercase">{env.name}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs text-slate-300 font-mono">{env.baseUrl}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => setModal(svc)} className="text-xs text-slate-400 hover:text-slate-100 px-3 py-1.5 border border-slate-700 rounded-lg">Edit</button>
                  <button onClick={() => handleDelete(svc.id)} className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 border border-red-900/40 rounded-lg">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ServiceModal
          service={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
