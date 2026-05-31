import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('predictator_token'));

  const fetchMe = useCallback(async (authToken) => {
    try {
      const res = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setUser(res.data.user);
    } catch {
      localStorage.removeItem('predictator_token');
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchMe(token).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token, fetchMe]);

  const loginWithGoogle = async (credential) => {
    try {
      const res = await api.post('/auth/google', { credential });
      const { token: newToken, user: newUser } = res.data;
      localStorage.setItem('predictator_token', newToken);
      setToken(newToken);
      setUser(newUser);
      toast.success(`Welcome, ${newUser.username}! ⚽`);
      return newUser;
    } catch (error) {
      toast.error('Login failed. Please try again.');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem('predictator_token');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully');
  };

  const refreshUser = () => {
    if (token) fetchMe(token);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, loginWithGoogle, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};