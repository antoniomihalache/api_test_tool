import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { Overview } from './pages/Overview.jsx';
import { Services } from './pages/Services.jsx';
import { Authentication } from './pages/Authentication.jsx';
import { Scenarios } from './pages/Scenarios.jsx';
import { Executions } from './pages/Executions.jsx';
import { ExecutionDetail } from './pages/ExecutionDetail.jsx';
import { Results } from './pages/Results.jsx';
import { ResultsHome } from './pages/ResultsHome.jsx';
import { Settings } from './pages/Settings.jsx';
import { Login } from './pages/Login.jsx';

function RequireAuth({ children }) {
  const token = localStorage.getItem('perf_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Overview />} />
          <Route path="services" element={<Services />} />
          <Route path="authentication" element={<Authentication />} />
          <Route path="scenarios" element={<Scenarios />} />
          <Route path="executions" element={<Executions />} />
          <Route path="executions/:id" element={<ExecutionDetail />} />
          <Route path="results" element={<ResultsHome />} />
          <Route path="results/:id" element={<Results />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
