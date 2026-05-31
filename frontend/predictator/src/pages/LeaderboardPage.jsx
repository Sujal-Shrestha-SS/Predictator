import { useState, useEffect } from 'react';
import api from '../services/api';
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

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [myRank, setMyRank] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/leaderboard?page=${page}&limit=25`);
        setLeaderboard(res.data.leaderboard || []);
        setPagination(res.data.pagination);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [page]);

  useEffect(() => {
    if (user) {
      api.get(`/leaderboard/rank/${user.id}`)
        .then((res) => setMyRank(res.data.rank))
        .catch(() => {});
    }
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-4xl text-[var(--text-primary)] mb-2">LEADERBOARD</h1>
        <p className="text-[var(--text-secondary)]">Top predictors of FIFA World Cup 2026</p>
      </div>

      {/* My rank banner */}
      {user && myRank && (
        <div className="card p-4 mb-6 bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
          <div className="flex items-center gap-4">
            <img
              src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=2244f5&color=fff`}
              alt={user.username}
              className="w-12 h-12 rounded-full border-2 border-primary-400"
            />
            <div className="flex-1">
              <p className="font-semibold text-[var(--text-primary)]">{user.username}</p>
              <p className="text-sm text-[var(--text-secondary)]">Your current position</p>
            </div>
            <div className="text-right">
              <div className="font-display text-3xl text-primary-600 dark:text-primary-400">#{myRank}</div>
              <div className="text-sm text-[var(--text-secondary)] font-mono">{user.totalPoints} pts</div>
            </div>
          </div>
        </div>
      )}

      {/* Top 3 podium (first page only) */}
      {page === 1 && !loading && leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[leaderboard[1], leaderboard[0], leaderboard[2]].map((entry, idx) => {
            if (!entry) return null;
            const podiumRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
            const heights = { 1: 'h-28', 2: 'h-20', 3: 'h-16' };
            const colors = {
              1: 'from-yellow-400 to-yellow-600',
              2: 'from-gray-300 to-gray-500',
              3: 'from-amber-600 to-amber-800',
            };
            return (
              <div key={entry.id} className="text-center">
                <img
                  src={entry.avatar || `https://ui-avatars.com/api/?name=${entry.username}&background=2244f5&color=fff&size=48`}
                  alt={entry.username}
                  className="w-14 h-14 rounded-full border-4 border-white dark:border-gray-800 mx-auto mb-2 shadow-lg"
                />
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate px-2">{entry.username}</p>
                <p className="text-xs font-mono text-[var(--text-secondary)] mb-2">{entry.totalPoints} pts</p>
                <div className={`bg-gradient-to-t ${colors[podiumRank]} rounded-t-xl ${heights[podiumRank]} flex items-end justify-center pb-2`}>
                  <span className="text-white font-display text-xl">#{podiumRank}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border)] grid grid-cols-12 gap-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          <div className="col-span-1">Rank</div>
          <div className="col-span-5">Player</div>
          <div className="col-span-2 text-center">Exact</div>
          <div className="col-span-2 text-center">Correct</div>
          <div className="col-span-2 text-right">Points</div>
        </div>

        {loading ? (
          <div className="divide-y divide-[var(--border)]">
            {[...Array(10)].map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="p-16 text-center text-[var(--text-secondary)]">
            <div className="text-4xl mb-3">🏆</div>
            <p>No players yet. Be the first to predict!</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {leaderboard.map((entry) => {
              const isMe = user?.id === entry.id;
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

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary disabled:opacity-40">← Prev</button>
          <span className="text-sm text-[var(--text-secondary)] px-4">{page} / {pagination.pages}</span>
          <button disabled={page === pagination.pages} onClick={() => setPage((p) => p + 1)} className="btn-secondary disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}