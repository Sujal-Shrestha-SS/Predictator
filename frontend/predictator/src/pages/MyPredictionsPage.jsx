import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { SkeletonCard } from '../components/common/LoadingScreen';

const pointTypeConfig = {
  exact:          { label: '⭐ Exact Score',    cls: 'badge-green' },
  correct_result: { label: '✓ Correct Result',  cls: 'badge-blue' },
  correct_draw:   { label: '≈ Correct Draw',    cls: 'badge-yellow' },
  incorrect:      { label: '✗ Incorrect',       cls: 'badge-red' },
};

// Returns a suffix like "(AET)" or "(PENS 4–3)" for knockout matches
function resultSuffix(result) {
  if (!result) return '';
  if (result.penalties) {
    const ph = result.penaltyHomeScore;
    const pa = result.penaltyAwayScore;
    const score = ph != null && pa != null ? ` ${ph}–${pa}` : '';
    return `(PENS${score})`;
  }
  if (result.extraTime) return '(AET)';
  return '';
}

function PredictionRow({ prediction }) {
  const { fixture, homeScore, awayScore, points, pointType, isCalculated } = prediction;
  if (!fixture) return null;

  const isCompleted = fixture.status === 'completed';
  const ptConfig = isCalculated && pointType ? pointTypeConfig[pointType] : null;
  const suffix = resultSuffix(fixture.result);

  return (
    <Link to={`/fixtures/${fixture._id}`} className="block hover:bg-[var(--bg-secondary)] transition-colors">
      <div className="px-4 py-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between gap-4">
          {/* Teams */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              {fixture.homeTeam?.flagUrl && (
                <img src={fixture.homeTeam.flagUrl} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                  onError={(e) => { e.target.style.display = 'none'; }} />
              )}
              <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                {fixture.homeTeam?.shortName || fixture.homeTeam?.name}
              </span>
            </div>
            <span className="text-[var(--text-secondary)] text-xs flex-shrink-0">vs</span>
            <div className="flex items-center gap-1.5 min-w-0">
              {fixture.awayTeam?.flagUrl && (
                <img src={fixture.awayTeam.flagUrl} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                  onError={(e) => { e.target.style.display = 'none'; }} />
              )}
              <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                {fixture.awayTeam?.shortName || fixture.awayTeam?.name}
              </span>
            </div>
          </div>

          {/* My Prediction */}
          <div className="text-center flex-shrink-0">
            <p className="text-xs text-[var(--text-secondary)] mb-0.5">My Prediction</p>
            <p className="font-display text-xl text-[var(--text-primary)]">{homeScore}–{awayScore}</p>
          </div>

          {/* Actual Result */}
          {isCompleted && (
            <div className="text-center flex-shrink-0">
              <p className="text-xs text-[var(--text-secondary)] mb-0.5">Actual</p>
              <p className="font-display text-xl text-[var(--text-primary)]">
                {fixture.result?.homeScore}–{fixture.result?.awayScore}
              </p>
              {suffix && (
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{suffix}</p>
              )}
            </div>
          )}

          {/* Points */}
          <div className="text-right flex-shrink-0 min-w-16">
            {isCalculated ? (
              <div>
                {ptConfig && <span className={`badge ${ptConfig.cls} mb-1 block text-center`}>{ptConfig.label}</span>}
                <span className={`font-display text-xl ${points > 0 ? 'text-green-500' : 'text-[var(--text-secondary)]'}`}>
                  +{points}
                </span>
                <span className="text-xs text-[var(--text-secondary)] ml-0.5">pts</span>
              </div>
            ) : fixture.status === 'upcoming' ? (
              <span className="badge badge-blue">Pending</span>
            ) : (
              <span className="badge badge-gray">Calculating</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-secondary)]">
          <span>📅 {format(new Date(fixture.matchDatetime), 'MMM d, yyyy HH:mm')}</span>
          <span className="capitalize">{fixture.stage?.replace(/_/g, ' ')}</span>
          {fixture.group && <span>Group {fixture.group}</span>}
        </div>
      </div>
    </Link>
  );
}

export default function MyPredictionsPage() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [predRes, statsRes] = await Promise.all([
          api.get(`/predictions/my${stage ? `?stage=${stage}` : ''}`),
          api.get('/predictions/stats'),
        ]);
        setPredictions(predRes.data.predictions || []);
        setStats(statsRes.data.stats);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [stage]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display text-4xl text-[var(--text-primary)] mb-2">MY PREDICTIONS</h1>
        <p className="text-[var(--text-secondary)]">Track all your predictions and points</p>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Points',    value: stats.totalPoints,                       color: 'text-primary-500',           icon: '🏆' },
            { label: 'Exact Scores',    value: stats.exact,                             color: 'text-green-500',             icon: '⭐' },
            { label: 'Correct Results', value: stats.correctResult + stats.correctDraw, color: 'text-blue-500',              icon: '✓' },
            { label: 'Predictions',     value: stats.total,                             color: 'text-[var(--text-primary)]', icon: '🎯' },
          ].map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className={`font-display text-3xl ${s.color}`}>{s.value}</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { value: '',             label: 'All' },
          { value: 'group_stage',  label: 'Group Stage' },
          { value: 'round_of_32',  label: 'R32' },
          { value: 'round_of_16',  label: 'R16' },
          { value: 'quarterfinal', label: 'QF' },
          { value: 'semifinal',    label: 'SF' },
          { value: 'final',        label: 'Final' },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStage(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              stage === opt.value
                ? 'bg-primary-600 text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Predictions list */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : predictions.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-5xl mb-4">🎯</div>
            <h3 className="font-display text-2xl text-[var(--text-primary)] mb-2">No Predictions Yet</h3>
            <p className="text-[var(--text-secondary)] mb-6">Start predicting match scores to earn points!</p>
            <Link to="/fixtures" className="btn-primary">Browse Fixtures</Link>
          </div>
        ) : (
          predictions.map((p) => <PredictionRow key={p._id} prediction={p} />)
        )}
      </div>
    </div>
  );
}