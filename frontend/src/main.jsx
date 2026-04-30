import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewGoal from './pages/NewGoal';
import GoalDetail from './pages/GoalDetail';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/goals/new" element={<NewGoal />} />
        <Route path="/goals/:id" element={<GoalDetail />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
