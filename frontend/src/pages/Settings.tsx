import React from 'react';

export function Settings() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Platform configuration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-slate-200">Monitoring</h3>
          <div className="space-y-2 text-sm">
            <a href="http://localhost:3001" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between text-blue-400 hover:text-blue-300 transition-colors">
              <span>Grafana Dashboard</span><span>→</span>
            </a>
            <a href="http://localhost:9090" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between text-blue-400 hover:text-blue-300 transition-colors">
              <span>Prometheus</span><span>→</span>
            </a>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-slate-200">Runner Mode</h3>
          <p className="text-sm text-slate-400">
            Configure via <code className="bg-slate-800 px-1 rounded">RUNNER_MODE</code> in <code className="bg-slate-800 px-1 rounded">.env</code>
          </p>
          <div className="space-y-1 text-xs text-slate-500">
            <div className="flex items-center gap-2"><span className="text-green-400">●</span> docker – external host runner (default)</div>
            <div className="flex items-center gap-2"><span className="text-slate-600">●</span> kubernetes – k3s job runner (future)</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-slate-200">k6 Configuration</h3>
          <div className="text-xs font-mono text-slate-400 space-y-1">
            <div>Image: <span className="text-slate-300">grafana/k6:0.54.0</span></div>
            <div>Output: <span className="text-slate-300">prometheus remote write</span></div>
            <div>Network: <span className="text-slate-300">host</span></div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-slate-200">API Reference</h3>
          <div className="text-xs text-slate-400 space-y-1 font-mono">
            <div>GET /api/v1/services</div>
            <div>POST /api/v1/services</div>
            <div>GET /api/v1/scenarios</div>
            <div>POST /api/v1/executions</div>
            <div>POST /api/v1/executions/:id/cancel</div>
            <div>GET /api/v1/executions/:id/reports</div>
          </div>
        </div>
      </div>
    </div>
  );
}
