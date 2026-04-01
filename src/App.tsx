import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import SharedNote from './pages/SharedNote';
import NotFound from './pages/NotFound';

export default function App() {
  // Safely parse user from localStorage with error handling
  let user = null;
  let isAuthenticated = false;
  
  try {
    const rawUser = localStorage.getItem('aura_user');
    if (rawUser) {
      user = JSON.parse(rawUser);
      isAuthenticated = user && !user.id?.toString().startsWith('demo-');
    }
  } catch (error) {
    console.error('Error parsing user from localStorage:', error);
    // If parsing fails, user remains null and isAuthenticated stays false
  }

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
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
