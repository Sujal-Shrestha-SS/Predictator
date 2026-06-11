import  { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import FixtureCard from '../components/fixtures/FixtureCard';
import { SkeletonCard } from '../components/common/LoadingScreen';

const HeroStat = ({ label, value, icon }) => (
  <div className="text-center">
    <div className="text-3xl mb-1">{icon}</div>
    <div className="font-display text-3xl text-white">{value}</div>
    <div className="text-white/70 text-sm">{label}</div>
  </div>
);

export default function HomePage() {
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState([]);
  const [live, setLive] = useState([]);
  const [top3, setTop3] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const requests = [
          api.get('/fixtures/upcoming?limit=6'),
          api.get('/fixtures/live'),
          ...(user ? [api.get('/leaderboard/top3')] : []),
        ];
        const [upcomingRes, liveRes, top3Res] = await Promise.all(requests);
        setUpcoming(upcomingRes.data.fixtures || []);
        setLive(liveRes.data.fixtures || []);
        setTop3(top3Res?.data.top3 || []);
      } catch (err) {
        console.error('Failed to fetch home data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const medalMap = ['🥇', '🥈', '🥉'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-hero mb-10 p-10 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '60px 60px' }}
        />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
            🏆 FIFA World Cup 2026 · USA / Canada / Mexico
          </div>
          <h1 className="font-display text-5xl sm:text-7xl tracking-wider mb-4">
            PREDICTATOR
          </h1>
          <p className="text-white/80 text-lg mb-8 max-w-lg">
            Predict match scores, earn points, and climb the leaderboard. The ultimate World Cup 2026 prediction challenge.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link to="/fixtures" className="bg-white text-primary-700 font-bold px-6 py-3 rounded-xl hover:bg-white/90 transition-all active:scale-95">
              View Fixtures 
            </Link>
            {!user && (
              <Link to="/login" className="bg-white/20 hover:bg-white/30 text-white font-bold px-6 py-3 rounded-xl transition-all active:scale-95">
                Sign In to Predict
              </Link>
            )}
          </div>
        </div>
        <div className="absolute bottom-6 right-6 hidden lg:flex gap-12">
          <HeroStat label="Teams" value="48"  />
          <HeroStat label="Matches" value="104"  />
          <HeroStat label="Days" value="39"  />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Live Matches */}
          {live.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="live-dot" />
                <h2 className="font-display text-2xl text-[var(--text-primary)]">LIVE NOW</h2>
              </div>
              <div className="space-y-3">
                {live.map((f) => <FixtureCard key={f._id} fixture={f} />)}
              </div>
            </section>
          )}

          {/* Upcoming */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl text-[var(--text-primary)]">UPCOMING MATCHES</h2>
              <Link to="/fixtures" className="text-sm text-primary-500 hover:underline">See all →</Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : upcoming.length === 0 ? (
              <div className="card p-12 text-center text-[var(--text-secondary)]">
                <div className="text-4xl mb-3">📅</div>
                <p>No upcoming matches scheduled yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((f) => <FixtureCard key={f._id} fixture={f} />)}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Mini Leaderboard */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl text-[var(--text-primary)]">TOP PREDICTORS</h3>
              {user && <Link to="/leaderboard" className="text-xs text-primary-500 hover:underline">Full board →</Link>}
            </div>
            {!user ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">🏆</div>
                <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Sign in to view rankings</p>
                <p className="text-xs text-[var(--text-secondary)] mb-4">See who's leading the prediction table</p>
                <Link to="/login" className="btn-primary text-sm">Sign In</Link>
              </div>
            ) : loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                ))}
              </div>
            ) : top3.length === 0 ? (
              <p className="text-[var(--text-secondary)] text-sm text-center py-6">No rankings yet</p>
            ) : (
              <div className="space-y-2">
                {top3.map((entry, i) => (
                  <div key={entry.id} className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${user?.id === entry.id ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-[var(--bg-secondary)]'}`}>
                    <span className="text-lg w-6 text-center">{medalMap[i]}</span>
                    <img
                      src={entry.avatar || `https://ui-avatars.com/api/?name=${entry.username}&background=2244f5&color=fff&size=36`}
                      alt={entry.username}
                      className="w-9 h-9 rounded-full border border-[var(--border)]"
                    />
                    <span className="flex-1 text-sm font-medium text-[var(--text-primary)] truncate">{entry.username}</span>
                    <span className="text-sm font-mono font-bold text-primary-500">{entry.totalPoints}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="card p-5">
            <h3 className="font-display text-xl text-[var(--text-primary)] mb-4">HOW IT WORKS</h3>
            <div className="space-y-3">
              {[
                { icon: '🔐', title: 'Sign in', desc: 'Login with your Google account' },
                { icon: '🎯', title: 'Predict', desc: 'Enter your score prediction before kickoff' },
                { icon: '⏱️', title: 'Wait', desc: 'Predictions lock 1 hour before kickoff' },
                { icon: '🏆', title: 'Score', desc: 'Exact: 50pts · Winner: 20pts · Draw: 15pts' },
              ].map((step) => (
                <div key={step.title} className="flex gap-3">
                  <span className="text-2xl flex-shrink-0">{step.icon}</span>
                  <div>
                    <p className="font-semibold text-sm text-[var(--text-primary)]">{step.title}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
          {user && (
            <div className="card p-5">
              <h3 className="font-display text-xl text-[var(--text-primary)] mb-3">QUICK LINKS</h3>
              <div className="space-y-2">
                <Link to="/predictions" className="block text-sm text-primary-500 hover:underline">🎯 My Predictions</Link>
                <Link to="/leaderboard" className="block text-sm text-primary-500 hover:underline">🏆 Leaderboard</Link>
                <Link to="/standings" className="block text-sm text-primary-500 hover:underline">📊 Group Standings</Link>
                <Link to="/profile" className="block text-sm text-primary-500 hover:underline">👤 My Profile</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}