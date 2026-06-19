import React from 'react';

export function Settings() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-slate-100 mb-6">Settings</h1>
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-slate-100 mb-2">API Configuration</h3>
          <p className="text-slate-400 text-sm">Configure API endpoints and monitoring settings.</p>
        </div>
      </div>
    </div>
  );
}
