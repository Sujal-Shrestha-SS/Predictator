import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const KeyIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
    <div className="card w-full max-w-md p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-xl text-[var(--text-primary)]">{title}</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
        >
          ✕
        </button>
      </div>
      {children}
    </div>
  </div>
);

export default function LeaguesPage() {
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [createName, setCreateName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLeagues = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/leagues');
      setLeagues(res.data.leagues || []);
    } catch {
      toast.error('Failed to load leagues');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeagues();
  }, [fetchLeagues]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.post('/leagues', { name: createName.trim() });
      toast.success(`League "${res.data.league.name}" created!`);
      setShowCreate(false);
      setCreateName('');
      fetchLeagues();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create league');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.post('/leagues/join', { code: joinCode.trim() });
      toast.success(res.data.message);
      setShowJoin(false);
      setJoinCode('');
      fetchLeagues();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to join league');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="font-display text-4xl text-[var(--text-primary)] mb-2">MY LEAGUES</h1>
          <p className="text-[var(--text-secondary)]">Compete with friends in private leagues</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setShowJoin(true)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <KeyIcon />
            <span className="hidden sm:inline">Join</span>
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <PlusIcon />
            <span className="hidden sm:inline">Create</span>
          </button>
        </div>
      </div>

      {/* League list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-5 skeleton rounded w-1/3 mb-2" />
              <div className="h-4 skeleton rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : leagues.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-5xl mb-4">🏆</div>
          <p className="font-display text-xl text-[var(--text-primary)] mb-2">No leagues yet</p>
          <p className="text-[var(--text-secondary)] mb-6 text-sm">
            Create a league and invite your friends, or join one with a code.
          </p>
          <div className="flex justify-center gap-3">
            <button onClick={() => setShowJoin(true)} className="btn-secondary text-sm">
              Join with code
            </button>
            <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
              Create league
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {leagues.map((league) => (
            <button
              key={league.id}
              onClick={() => navigate(`/leagues/${league.id}`)}
              className="card w-full p-5 text-left hover:shadow-md transition-all duration-200 hover:border-primary-300 dark:hover:border-primary-700 group"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display text-lg text-[var(--text-primary)] truncate group-hover:text-primary-500 transition-colors">
                      {league.name}
                    </span>
                    {league.isAdmin && (
                      <span className="badge badge-blue flex items-center gap-1 flex-shrink-0">
                        <ShieldIcon /> Admin
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1">
                      <UsersIcon />
                      {league.memberCount} {league.memberCount === 1 ? 'member' : 'members'}
                    </span>
                    <span className="font-mono text-xs bg-[var(--bg-secondary)] px-2 py-0.5 rounded-md border border-[var(--border)]">
                      {league.code}
                    </span>
                  </div>
                </div>
                <span className="text-[var(--text-secondary)] group-hover:text-primary-500 transition-colors flex-shrink-0">
                  →
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Create a League" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                League Name
              </label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Office Champions"
                maxLength={50}
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-primary-500 transition-colors"
              />
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                A unique invite code will be generated automatically.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !createName.trim()}
                className="btn-primary flex-1"
              >
                {submitting ? 'Creating…' : 'Create League'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Join Modal */}
      {showJoin && (
        <Modal title="Join a League" onClose={() => setShowJoin(false)}>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                League Code
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. A3F7C12B"
                maxLength={8}
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-primary-500 transition-colors font-mono uppercase tracking-widest text-center text-lg"
              />
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Ask your friend for the 8-character league code.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowJoin(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !joinCode.trim()}
                className="btn-primary flex-1"
              >
                {submitting ? 'Joining…' : 'Join League'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
