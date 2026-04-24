import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import SharedNote from './pages/SharedNote';
import { getStoredUser, isStoredUserAuthenticated, subscribeToAuthChanges } from './services/auth';

export default function App() {
  const [storedUser, setStoredUser] = useState(() => getStoredUser());
  const isAuthenticated = isStoredUserAuthenticated(storedUser);

  useEffect(() => {
    return subscribeToAuthChanges(() => {
      setStoredUser(getStoredUser());
    });
  }, []);

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/signup" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Signup />} />
      <Route path="/n/:slug" element={<SharedNote />} />
      <Route 
        path="/dashboard" 
        element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />} 
      />
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}
