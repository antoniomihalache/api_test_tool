import React from 'react';
import { useParams } from 'react-router-dom';

export function Results() {
  const { id } = useParams();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-slate-100 mb-6">Test Results: {id}</h1>
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <p className="text-slate-300">Test results and metrics.</p>
      </div>
    </div>
  );
}
