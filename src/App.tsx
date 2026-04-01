import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import SharedNote from './pages/SharedNote';

export default function App() {
  const rawUser = localStorage.getItem('aura_user');
  const user = rawUser ? JSON.parse(rawUser) : null;
  const isAuthenticated = user && !user.id?.toString().startsWith('demo-');

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/n/:slug" element={<SharedNote />} />
      <Route 
        path="/dashboard" 
        element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />} 
      />
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}
