import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const SunIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const MenuIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const XIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function Layout() {
  const { user, logout } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();

  const navLinks = [
    { to: '/', label: '🏠 Home', end: true },
    { to: '/fixtures', label: '📅 Fixtures' },
    { to: '/leaderboard', label: '🏆 Leaderboard' },
    { to: '/standings', label: '📊 Standings' },
    ...(user ? [{ to: '/predictions', label: '🎯 My Predictions' }] : []),
    ...(user?.role === 'admin' ? [{ to: '/admin', label: '⚙️ Admin' }] : []),
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-[var(--bg-card)]/80 backdrop-blur-lg border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center text-white font-display text-sm">
                ⚽
              </div>
              <span className="font-display text-xl tracking-wider text-[var(--text-primary)] group-hover:text-primary-500 transition-colors">
                PREDICTATOR
              </span>
            </NavLink>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all"
                aria-label="Toggle theme"
              >
                {dark ? <SunIcon /> : <MoonIcon />}
              </button>

              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[var(--bg-secondary)] transition-all"
                  >
                    <img
                      src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=2244f5&color=fff`}
                      alt={user.username}
                      className="w-8 h-8 rounded-full border-2 border-primary-500/30"
                    />
                    <span className="hidden sm:block text-sm font-medium text-[var(--text-primary)] max-w-24 truncate">
                      {user.username}
                    </span>
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-56 card shadow-xl py-2 z-50 animate-fade-in">
                      <div className="px-4 py-2 border-b border-[var(--border)]">
                        <p className="font-semibold text-[var(--text-primary)] truncate">{user.username}</p>
                        <p className="text-xs text-[var(--text-secondary)] truncate">{user.email}</p>
                        <p className="text-xs font-mono text-primary-500 mt-1">{user.totalPoints} pts</p>
                      </div>
                      <button
                        onClick={() => { navigate('/profile'); setProfileOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                      >
                        👤 Profile
                      </button>
                      <button
                        onClick={() => { navigate('/predictions'); setProfileOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                      >
                        🎯 My Predictions
                      </button>
                      <div className="border-t border-[var(--border)] mt-1 pt-1">
                        <button
                          onClick={() => { logout(); setProfileOpen(false); }}
                          className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          🚪 Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <NavLink to="/login" className="btn-primary text-sm">
                  Sign In
                </NavLink>
              )}

              {/* Mobile menu toggle */}
              <button
                className="md:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {menuOpen ? <XIcon /> : <MenuIcon />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 space-y-1 animate-fade-in">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => `nav-link block ${isActive ? 'active' : ''}`}
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* Page content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] mt-20 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-[var(--text-secondary)] text-sm">
          <p className="font-display text-lg text-[var(--text-primary)] mb-2">PREDICTATOR</p>
          <p>FIFA World Cup 2026 Prediction Platform </p>
        </div>
      </footer>
    </div>
  );
}