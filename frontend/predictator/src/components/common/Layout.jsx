import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

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

const ChevronDownIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

// ── Inline modal shared between navbar dropdown and mobile menu ───────────────
function LeagueModal({ mode, onClose, onSuccess }) {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    setSubmitting(true);
    try {
      if (mode === 'create') {
        const res = await api.post('/leagues', { name: value.trim() });
        toast.success(`League "${res.data.league.name}" created!`);
        onSuccess(res.data.league.id || res.data.league._id);
      } else {
        const res = await api.post('/leagues/join', { code: value.trim() });
        toast.success(res.data.message);
        onSuccess(res.data.league._id || res.data.league.id);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to ${mode} league`);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="card w-full max-w-md p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl text-[var(--text-primary)]">
            {mode === 'create' ? 'Create a League' : 'Join a League'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              {mode === 'create' ? 'League Name' : 'League Code'}
            </label>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) =>
                setValue(mode === 'join' ? e.target.value.toUpperCase() : e.target.value)
              }
              placeholder={mode === 'create' ? 'e.g. Office Champions' : 'e.g. A3F7C12B'}
              maxLength={mode === 'create' ? 50 : 8}
              className={`w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-primary-500 transition-colors ${
                mode === 'join' ? 'font-mono uppercase tracking-widest text-center text-lg' : ''
              }`}
            />
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {mode === 'create'
                ? 'A unique invite code will be generated automatically.'
                : 'Ask your friend for their 8-character league code.'}
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !value.trim()}
              className="btn-primary flex-1"
            >
              {submitting
                ? mode === 'create' ? 'Creating…' : 'Joining…'
                : mode === 'create' ? 'Create League' : 'Join League'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Leagues navbar dropdown (desktop) ────────────────────────────────────────
function LeaguesDropdown({ onOpenModal }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isLeaguesActive = window.location.pathname.startsWith('/leagues');

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`nav-link flex items-center gap-1.5 ${isLeaguesActive ? 'active' : ''}`}
      >
        🛡️ Leagues
        <ChevronDownIcon />
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-52 card shadow-xl py-1.5 z-50 animate-fade-in">
          <button
            onClick={() => { setOpen(false); navigate('/leagues'); }}
            className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            🏆 My Leagues
          </button>
          <div className="border-t border-[var(--border)] my-1" />
          <button
            onClick={() => { setOpen(false); onOpenModal('create'); }}
            className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            ➕ Create League
          </button>
          <button
            onClick={() => { setOpen(false); onOpenModal('join'); }}
            className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            🔑 Join with Code
          </button>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [modal, setModal] = useState(null); // 'create' | 'join' | null
  const navigate = useNavigate();

  const handleModalSuccess = (leagueId) => {
    setModal(null);
    navigate(`/leagues/${leagueId}`);
  };

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
              {/* Leagues dropdown — only for logged-in users */}
              {user && <LeaguesDropdown onOpenModal={setModal} />}
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
            {user && (
              <>
                <NavLink
                  to="/leagues"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => `nav-link block ${isActive ? 'active' : ''}`}
                >
                  🛡️ My Leagues
                </NavLink>
                <button
                  onClick={() => { setMenuOpen(false); setModal('create'); }}
                  className="nav-link block w-full text-left"
                >
                  ➕ Create League
                </button>
                <button
                  onClick={() => { setMenuOpen(false); setModal('join'); }}
                  className="nav-link block w-full text-left"
                >
                  🔑 Join League
                </button>
              </>
            )}
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
          <p>FIFA World Cup 2026 Prediction Platform</p>
        </div>
      </footer>

      {/* League modals — triggered from anywhere in the navbar */}
      {modal && (
        <LeagueModal
          mode={modal}
          onClose={() => setModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
