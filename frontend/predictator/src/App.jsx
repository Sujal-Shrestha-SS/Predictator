
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

import Layout from './components/common/Layout';
import LoadingScreen from './components/common/LoadingScreen';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import FixturesPage from './pages/FixturesPage';
import MatchDetailPage from './pages/MatchDetailPage';
import LeaderboardPage from './pages/LeaderboardPage';
import StandingsPage from './pages/StandingsPage';
import MyPredictionsPage from './pages/MyPredictionsPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';
import KnockoutSetupPage from './pages/KnockoutSetupPage';
import LeaguesPage from './pages/LeaguesPage';
import LeagueDetailPage from './pages/LeagueDetailPage';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <Navigate to="/" replace /> : children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Layout />}>
      <Route index element={<HomePage />} />
      <Route path="login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="fixtures" element={<FixturesPage />} />
      <Route path="fixtures/:id" element={<MatchDetailPage />} />
      <Route path="leaderboard" element={<LeaderboardPage />} />
      <Route path="standings" element={<StandingsPage />} />
      <Route path="predictions" element={<ProtectedRoute><MyPredictionsPage /></ProtectedRoute>} />
      <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
      <Route path="/admin/knockout-setup" element={<AdminRoute><KnockoutSetupPage /></AdminRoute>} />
      <Route path="*" element={<NotFoundPage />} />
      <Route path="leagues" element={<ProtectedRoute><LeaguesPage /></ProtectedRoute>} />
      <Route path="leagues/:id" element={<ProtectedRoute><LeagueDetailPage /></ProtectedRoute>} />
    </Route>
  </Routes>
);

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_APP_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID'}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  fontFamily: 'DM Sans, sans-serif',
                },
              }}
            />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}