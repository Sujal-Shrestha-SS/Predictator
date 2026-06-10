import  { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [rank, setRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, rankRes] = await Promise.all([
          api.get('/predictions/stats'),
          api.get(`/leaderboard/rank/${user.id}`),
        ]);
        setStats(statsRes.data.stats);
        setRank(rankRes.data.rank);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    refreshUser();
  }, [user.id, refreshUser]);

  const accuracy = stats?.total > 0
    ? Math.round(((stats.exact + stats.correctResult + stats.correctDraw) / stats.total) * 100)
    : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-4xl text-[var(--text-primary)] mb-8">MY PROFILE</h1>

      {/* Profile card */}
      <div className="card p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <img
            src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=2244f5&color=fff&size=96`}
            alt={user.username}
            className="w-24 h-24 rounded-2xl border-4 border-primary-200 dark:border-primary-800 shadow-lg"
          />
          <div className="text-center sm:text-left flex-1">
            <div className="flex items-center gap-3 justify-center sm:justify-start mb-1">
              <h2 className="font-display text-3xl text-[var(--text-primary)]">{user.username}</h2>
              {user.role === 'admin' && (
                <span className="badge badge-yellow">Admin</span>
              )}
            </div>
            <p className="text-[var(--text-secondary)] mb-1">{user.email}</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Member since {format(new Date(user.createdAt || Date.now()), 'MMMM yyyy')}
            </p>

            <div className="flex gap-4 mt-4 justify-center sm:justify-start">
              <div className="text-center">
                <div className="font-display text-2xl text-primary-600 dark:text-primary-400">{user.totalPoints}</div>
                <div className="text-xs text-[var(--text-secondary)]">Total Points</div>
              </div>
              {rank && (
                <div className="text-center">
                  <div className="font-display text-2xl text-[var(--text-primary)]">#{rank}</div>
                  <div className="text-xs text-[var(--text-secondary)]">Rank</div>
                </div>
              )}
              <div className="text-center">
                <div className="font-display text-2xl text-[var(--text-primary)]">{accuracy}%</div>
                <div className="text-xs text-[var(--text-secondary)]">Accuracy</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prediction breakdown */}
      {stats && (
        <div className="card p-6 mb-6">
          <h3 className="font-display text-xl text-[var(--text-primary)] mb-5">PREDICTION STATS</h3>

          <div className="space-y-4">
            {[
              { label: 'Exact Scores', value: stats.exact, pts: stats.exact * 50, color: 'bg-green-500', textColor: 'text-green-500' },
              { label: 'Correct Results', value: stats.correctResult, pts: stats.correctResult * 20, color: 'bg-blue-500', textColor: 'text-blue-500' },
              { label: 'Correct Draws', value: stats.correctDraw, pts: stats.correctDraw * 15, color: 'bg-yellow-500', textColor: 'text-yellow-500' },
              { label: 'Incorrect', value: stats.incorrect, pts: 0, color: 'bg-red-400', textColor: 'text-red-400' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className={`font-medium ${item.textColor}`}>{item.label}</span>
                  <span className="text-[var(--text-secondary)]">
                    {item.value} predictions · {item.pts} pts
                  </span>
                </div>
                <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-700`}
                    style={{ width: stats.total > 0 ? `${(item.value / stats.total) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-[var(--border)] flex justify-between items-center">
            <span className="text-[var(--text-secondary)] text-sm">Total Predictions</span>
            <span className="font-display text-2xl text-[var(--text-primary)]">{stats.total}</span>
          </div>
        </div>
      )}

      {/* Scoring guide */}
      <div className="card p-6">
        <h3 className="font-display text-xl text-[var(--text-primary)] mb-4">POINT SYSTEM</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { pts: 50, label: 'Exact Score', desc: 'Correct scoreline', icon: '⭐', color: 'text-green-500' },
            { pts: 20, label: 'Correct Winner', desc: 'Right team wins', icon: '✓', color: 'text-blue-500' },
            { pts: 15, label: 'Correct Draw', desc: 'Both predict draw', icon: '≈', color: 'text-yellow-500' },
          ].map((p) => (
            <div key={p.label} className="bg-[var(--bg-secondary)] rounded-xl p-4">
              <div className="text-2xl mb-1">{p.icon}</div>
              <div className={`font-display text-3xl ${p.color}`}>{p.pts}</div>
              <div className="text-xs font-semibold text-[var(--text-primary)] mt-1">{p.label}</div>
              <div className="text-xs text-[var(--text-secondary)] mt-0.5">{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}