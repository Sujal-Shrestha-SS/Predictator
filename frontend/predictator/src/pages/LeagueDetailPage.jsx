import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { SkeletonRow } from '../components/common/LoadingScreen';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

const RankBadge = ({ rank }) => {
  if (rank <= 3) return <span className="text-xl w-8 text-center">{MEDAL[rank]}</span>;
  return (
    <span className="w-8 text-center text-sm font-mono font-bold text-[var(--text-secondary)]">
      {rank}
    </span>
  );
};

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ConfirmModal = ({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
    <div className="card w-full max-w-sm p-6 animate-fade-in">
      <h2 className="font-display text-xl text-[var(--text-primary)] mb-3">{title}</h2>
      <p className="text-[var(--text-secondary)] text-sm mb-6">{message}</p>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button
          onClick={onConfirm}
          className={`flex-1 font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 active:scale-95 ${
            danger
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'btn-primary'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export default function LeagueDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [league, setLeague] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('leaderboard'); // 'leaderboard' | 'settings'
  const [confirm, setConfirm] = useState(null); // { type, userId?, label }
  const [actionLoading, setActionLoading] = useState(false);

  const fetchLeague = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/leagues/${id}`);
      setLeague(res.data.league);
      setLeaderboard(res.data.leaderboard);
    } catch (err) {
      const status = err.response?.status;
      if (status === 403 || status === 404) {
        toast.error(err.response?.data?.error || 'League not found');
        navigate('/leagues');
      } else {
        toast.error('Failed to load league');
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchLeague();
  }, [fetchLeague]);

  const copyCode = () => {
    navigator.clipboard.writeText(league.code);
    toast.success('League code copied!');
  };

  const handleRegenerateCode = async () => {
    setConfirm(null);
    setActionLoading(true);
    try {
      const res = await api.post(`/leagues/${id}/regenerate-code`);
      toast.success('League code regenerated');
      setLeague((l) => ({ ...l, code: res.data.code }));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to regenerate code');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteLeague = async () => {
    setConfirm(null);
    setActionLoading(true);
    try {
      await api.delete(`/leagues/${id}`);
      toast.success('League deleted');
      navigate('/leagues');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete league');
      setActionLoading(false);
    }
  };

  const handleLeaveLeague = async () => {
    setConfirm(null);
    setActionLoading(true);
    try {
      await api.post(`/leagues/${id}/leave`);
      toast.success('You left the league');
      navigate('/leagues');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to leave league');
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    setConfirm(null);
    setActionLoading(true);
    try {
      await api.delete(`/leagues/${id}/members/${userId}`);
      toast.success('Member removed');
      fetchLeague();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove member');
    } finally {
      setActionLoading(false);
    }
  };

  const dispatchConfirm = () => {
    if (!confirm) return;
    if (confirm.type === 'delete') return handleDeleteLeague();
    if (confirm.type === 'leave') return handleLeaveLeague();
    if (confirm.type === 'regenerate') return handleRegenerateCode();
    if (confirm.type === 'removeMember') return handleRemoveMember(confirm.userId);
  };

  const myEntry = leaderboard.find((e) => e.id?.toString() === user?.id?.toString());

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 skeleton rounded w-1/2" />
          <div className="h-4 skeleton rounded w-1/4" />
          <div className="card overflow-hidden mt-6">
            {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  if (!league) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Back */}
      <button
        onClick={() => navigate('/leagues')}
        className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
      >
        ← My Leagues
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-[var(--text-primary)] mb-1">
            {league.name}
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {league.memberCount} {league.memberCount === 1 ? 'member' : 'members'} ·
            Created by {league.creator?.username}
          </p>
        </div>

        {/* Invite code chip */}
        <button
          onClick={copyCode}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] hover:border-primary-400 transition-colors group flex-shrink-0"
          title="Copy invite code"
        >
          <span className="font-mono font-bold text-sm text-[var(--text-primary)] tracking-widest">
            {league.code}
          </span>
          <CopyIcon />
        </button>
      </div>

      {/* My rank banner */}
      {myEntry && (
        <div className="card p-4 mb-6 bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
          <div className="flex items-center gap-4">
            <img
              src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=2244f5&color=fff`}
              alt={user.username}
              className="w-12 h-12 rounded-full border-2 border-primary-400"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[var(--text-primary)] truncate">{user.username}</p>
              <p className="text-sm text-[var(--text-secondary)]">Your league position</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-display text-3xl text-primary-600 dark:text-primary-400">
                #{myEntry.rank}
              </div>
              <div className="text-sm text-[var(--text-secondary)] font-mono">
                {myEntry.totalPoints} pts
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--border)]">
        {['leaderboard', 'settings'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t === 'leaderboard' ? '🏆 Leaderboard' : '⚙️ Settings'}
          </button>
        ))}
      </div>

      {/* Leaderboard Tab */}
      {tab === 'leaderboard' && (
        <div className="card overflow-hidden">
          {/* Table header */}
          <div className="px-4 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border)] grid grid-cols-12 gap-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            <div className="col-span-1">Rank</div>
            <div className="col-span-5">Player</div>
            <div className="col-span-2 text-center">Exact</div>
            <div className="col-span-2 text-center">Correct</div>
            <div className="col-span-2 text-right">Points</div>
          </div>

          {leaderboard.length === 0 ? (
            <div className="p-16 text-center text-[var(--text-secondary)]">
              <div className="text-4xl mb-3">🏆</div>
              <p>No predictions yet. Make your first prediction!</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {leaderboard.map((entry) => {
                const isMe = user?.id?.toString() === entry.id?.toString();
                return (
                  <div
                    key={entry.id}
                    className={`grid grid-cols-12 gap-2 items-center px-4 py-3 transition-colors ${
                      isMe
                        ? 'bg-primary-50 dark:bg-primary-900/20'
                        : 'hover:bg-[var(--bg-secondary)]'
                    }`}
                  >
                    <div className="col-span-1">
                      <RankBadge rank={entry.rank} />
                    </div>
                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                      <img
                        src={entry.avatar || `https://ui-avatars.com/api/?name=${entry.username}&background=2244f5&color=fff&size=36`}
                        alt={entry.username}
                        className="w-9 h-9 rounded-full border border-[var(--border)] flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className={`font-medium truncate text-sm ${isMe ? 'text-primary-600 dark:text-primary-400' : 'text-[var(--text-primary)]'}`}>
                          {entry.username}
                          {isMe && <span className="ml-1 text-xs">(you)</span>}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {entry.accuracy}% accuracy
                        </p>
                      </div>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="text-sm font-mono text-green-500 font-semibold">
                        {entry.stats?.exactScores || 0}
                      </span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="text-sm font-mono text-blue-500 font-semibold">
                        {(entry.stats?.correctResults || 0) + (entry.stats?.correctDraws || 0)}
                      </span>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="font-display text-lg text-primary-600 dark:text-primary-400">
                        {entry.totalPoints}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)] ml-1">pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {tab === 'settings' && (
        <div className="space-y-4">
          {/* Invite Code Card */}
          <div className="card p-5">
            <h3 className="font-semibold text-[var(--text-primary)] mb-1">Invite Code</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Share this code with friends so they can join your league.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] font-mono font-bold text-xl text-center tracking-widest text-[var(--text-primary)]">
                {league.code}
              </div>
              <button onClick={copyCode} className="btn-secondary flex items-center gap-2">
                <CopyIcon /> Copy
              </button>
            </div>
            {league.isAdmin && (
              <button
                onClick={() =>
                  setConfirm({
                    type: 'regenerate',
                    label: 'Regenerate code',
                    title: 'Regenerate League Code?',
                    message: 'The old code will stop working immediately. Members who haven\'t joined yet will need the new code.',
                    confirmLabel: 'Regenerate',
                  })
                }
                disabled={actionLoading}
                className="mt-3 flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <RefreshIcon /> Regenerate code
              </button>
            )}
          </div>

          {/* Members Card (admin only) */}
          {league.isAdmin && (
            <div className="card p-5">
              <h3 className="font-semibold text-[var(--text-primary)] mb-4">Members</h3>
              <div className="space-y-2">
                {leaderboard.map((entry) => {
                  const isCreator = entry.id?.toString() === league.creator?._id?.toString();
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0"
                    >
                      <img
                        src={entry.avatar || `https://ui-avatars.com/api/?name=${entry.username}&background=2244f5&color=fff&size=32`}
                        alt={entry.username}
                        className="w-8 h-8 rounded-full border border-[var(--border)]"
                      />
                      <span className="flex-1 text-sm font-medium text-[var(--text-primary)] truncate">
                        {entry.username}
                        {isCreator && (
                          <span className="ml-2 text-xs text-primary-500">(admin)</span>
                        )}
                      </span>
                      <span className="text-xs font-mono text-[var(--text-secondary)]">
                        {entry.totalPoints} pts
                      </span>
                      {!isCreator && (
                        <button
                          onClick={() =>
                            setConfirm({
                              type: 'removeMember',
                              userId: entry.id,
                              title: 'Remove Member?',
                              message: `Remove ${entry.username} from this league?`,
                              confirmLabel: 'Remove',
                            })
                          }
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
                          title="Remove member"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Danger Zone */}
          <div className="card p-5 border-red-200 dark:border-red-900">
            <h3 className="font-semibold text-red-600 dark:text-red-400 mb-4">Danger Zone</h3>
            {league.isAdmin ? (
              <button
                onClick={() =>
                  setConfirm({
                    type: 'delete',
                    title: 'Delete League?',
                    message: `Permanently delete "${league.name}"? This cannot be undone. All members will lose access.`,
                    confirmLabel: 'Delete League',
                  })
                }
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors"
              >
                <TrashIcon /> Delete League
              </button>
            ) : (
              <button
                onClick={() =>
                  setConfirm({
                    type: 'leave',
                    title: 'Leave League?',
                    message: `Leave "${league.name}"? You can rejoin later with the league code.`,
                    confirmLabel: 'Leave',
                  })
                }
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors"
              >
                Leave League
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger
          onConfirm={dispatchConfirm}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
