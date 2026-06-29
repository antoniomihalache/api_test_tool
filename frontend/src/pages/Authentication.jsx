import React, { useState, useEffect } from 'react';
import { authApi } from '../api/auth.js';

const AUTH_TYPES = ['none', 'bearer', 'jwt', 'oauth2', 'basic', 'custom'];
const OTP_MODES = ['none', 'code', 'secret'];

function AuthModal({ config, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    type: 'bearer',
    loginEndpoint: '',
    loginHeaders: '{}',
    loginBody: '{}',
    loginBodyEncoding: 'json',
    tokenExtractPath: 'access_token',
    tokenHeaderName: 'Authorization',
    refreshEndpoint: '',
    refreshTokenPath: 'refresh_token',
    staticToken: '',
    username: '',
    password: '',
    otpMode: 'none',
    otpFieldName: 'totp',
    otpRequired: false,
    otpSecret: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (config) {
      setForm(config);
    }
  }, [config]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Name is required');
    if (!form.type) return setError('Auth type is required');

    setSaving(true);
    setError('');

    try {
      const payload = {
        ...form,
        loginHeaders: form.loginHeaders ? JSON.parse(form.loginHeaders) : {},
        loginBody: form.loginBody ? JSON.parse(form.loginBody) : {},
      };

      if (config?.id) {
        await authApi.update(config.id, payload);
      } else {
        await authApi.create(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">{config ? 'Edit Auth Config' : 'New Auth Config'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div>
            <label className="block text-xs text-slate-400 mb-1">Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Keycloak Dev"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500" />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Auth Type *</label>
            <select value={form.type} onChange={e => set('type', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500">
              {AUTH_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          {form.type === 'basic' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Username</label>
                  <input value={form.username} onChange={e => set('username', e.target.value)}
                    placeholder="username"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Password</label>
                  <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
                    placeholder="password"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500" />
                </div>
              </div>
            </>
          )}

          {(form.type === 'bearer' || form.type === 'jwt') && (
            <>
              {!form.staticToken ? (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Login Endpoint</label>
                    <input value={form.loginEndpoint} onChange={e => set('loginEndpoint', e.target.value)}
                      placeholder="e.g. /realms/master/protocol/openid-connect/token"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-blue-500" />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Login Body (JSON)</label>
                    <textarea value={form.loginBody} onChange={e => set('loginBody', e.target.value)}
                      rows={3} placeholder='{"client_id": "myapp", "username": "user", "password": "pass", "grant_type": "password"}'
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500" />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Login Body Encoding</label>
                    <select value={form.loginBodyEncoding || 'json'} onChange={e => set('loginBodyEncoding', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500">
                      <option value="json">JSON (application/json)</option>
                      <option value="form">Form (application/x-www-form-urlencoded) — required for Keycloak</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Token Extract Path</label>
                      <input value={form.tokenExtractPath} onChange={e => set('tokenExtractPath', e.target.value)}
                        placeholder="e.g. access_token"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Token Header Name</label>
                      <input value={form.tokenHeaderName} onChange={e => set('tokenHeaderName', e.target.value)}
                        placeholder="e.g. Authorization"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Refresh Endpoint (Optional)</label>
                    <input value={form.refreshEndpoint} onChange={e => set('refreshEndpoint', e.target.value)}
                      placeholder="e.g. /realms/master/protocol/openid-connect/token"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-blue-500" />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Refresh Token Path</label>
                    <input value={form.refreshTokenPath} onChange={e => set('refreshTokenPath', e.target.value)}
                      placeholder="e.g. refresh_token"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-blue-500" />
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                    <h4 className="text-xs font-semibold text-slate-300 mb-3">OTP Configuration</h4>
                    
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">OTP Mode</label>
                      <select value={form.otpMode} onChange={e => set('otpMode', e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 mb-3">
                        {OTP_MODES.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>

                    {form.otpMode !== 'none' && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">OTP Field Name</label>
                            <input value={form.otpFieldName} onChange={e => set('otpFieldName', e.target.value)}
                              placeholder="e.g. totp"
                              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500" />
                          </div>
                          <div className="flex items-end pb-0.5">
                            {form.otpMode === 'secret'
                              ? <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded px-2 py-1">✓ Auto-injected</span>
                              : <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" checked={form.otpRequired} onChange={e => set('otpRequired', e.target.checked)}
                                    className="w-4 h-4" />
                                  <span className="text-xs text-slate-300">OTP Required</span>
                                </label>
                            }
                          </div>
                        </div>

                        {form.otpMode === 'secret' && (
                          <div>
                            <label className="block text-xs text-slate-400 mb-1 mt-3">OTP Secret (Base32)</label>
                            <input type="password" value={form.otpSecret} onChange={e => set('otpSecret', e.target.value)}
                              placeholder="e.g. OBJF ORTS G5FW WRTM OZSU U3SO NZBU CUTW"
                              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500" />
                            <p className="text-xs text-slate-500 mt-1">Base32 secret from your authenticator app. Spaces are stripped automatically. Leave empty to use <code className="text-slate-400">OTP_SECRET</code> env var at runtime.</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Static Token</label>
                  <textarea value={form.staticToken} onChange={e => set('staticToken', e.target.value)}
                    placeholder="Paste your JWT or bearer token"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500" />
                </div>
              )}
            </>
          )}

          {form.type === 'oauth2' && (
            <>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Login Endpoint</label>
                <input value={form.loginEndpoint} onChange={e => set('loginEndpoint', e.target.value)}
                  placeholder="e.g. /oauth2/token"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Login Body (JSON)</label>
                <textarea value={form.loginBody} onChange={e => set('loginBody', e.target.value)}
                  rows={3} placeholder='{"client_id": "...", "client_secret": "...", "grant_type": "client_credentials"}'
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Token Extract Path</label>
                <input value={form.tokenExtractPath} onChange={e => set('tokenExtractPath', e.target.value)}
                  placeholder="e.g. access_token"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-blue-500" />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-100">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium">
            {saving ? 'Saving...' : 'Save Config'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Authentication() {
  const [configs, setConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const res = await authApi.list();
      setConfigs(res.data.data || []);
    } catch (err) {
      console.error('Failed to load auth configs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this auth config?')) return;
    try {
      await authApi.delete(id);
      await loadConfigs();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-100">Authentication Configs</h1>
        <button onClick={() => { setSelectedConfig(null); setShowModal(true); }}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
          + New Config
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : configs.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
          <p className="text-slate-400 mb-4">No auth configs yet</p>
          <button onClick={() => { setSelectedConfig(null); setShowModal(true); }}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            Create your first config
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {configs.map(cfg => (
            <div key={cfg.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex items-center justify-between hover:border-slate-600">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">{cfg.name}</h3>
                <p className="text-xs text-slate-400">{cfg.type}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setSelectedConfig(cfg); setShowModal(true); }}
                  className="px-3 py-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded">Edit</button>
                <button onClick={() => handleDelete(cfg.id)}
                  className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/30 rounded">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AuthModal
          config={selectedConfig}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadConfigs(); }}
        />
      )}
    </div>
  );
}
