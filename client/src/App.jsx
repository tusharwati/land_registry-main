import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Marketplace from './pages/Marketplace';
import MyLands from './pages/MyLands';
import RegisterLand from './pages/RegisterLand';
import Transactions from './pages/Transactions';
import ProfilePage from './pages/ProfilePage';
import LandDetails from './pages/LandDetails';
import UserProfile from './pages/UserProfile';
import BlockchainExplorer from './pages/BlockchainExplorer';

import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const navigate = useNavigate();

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      <Navbar user={user} onLogout={handleLogout} />
      <div className="pt-20">
        <Routes>
          <Route path="/login" element={!user ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/marketplace" />} />
          <Route path="/register" element={!user ? <RegisterPage onLogin={handleLogin} /> : <Navigate to="/marketplace" />} />

          <Route path="/" element={<Navigate to={user ? "/marketplace" : "/login"} />} />

          <Route path="/marketplace" element={
            <ProtectedRoute user={user}>
              <Marketplace user={user} />
            </ProtectedRoute>
          } />
          <Route path="/my-lands" element={
            <ProtectedRoute user={user}>
              <MyLands user={user} />
            </ProtectedRoute>
          } />
          <Route path="/lands/:id" element={
            <ProtectedRoute user={user}>
              <LandDetails user={user} />
            </ProtectedRoute>
          } />
          <Route path="/blockchain" element={
            <ProtectedRoute user={user}>
              <BlockchainExplorer user={user} />
            </ProtectedRoute>
          } />
          <Route path="/register-land" element={
            <ProtectedRoute user={user}>
              <RegisterLand user={user} />
            </ProtectedRoute>
          } />
          <Route path="/transactions" element={
            <ProtectedRoute user={user}>
              <Transactions user={user} />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute user={user}>
              <ProfilePage user={user} onUpdateUser={handleLogin} />
            </ProtectedRoute>
          } />
          <Route path="/user/:id" element={
            <ProtectedRoute user={user}>
              <UserProfile />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </div>
  );
}

export default App;
