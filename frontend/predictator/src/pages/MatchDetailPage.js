import  { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import PredictionForm from '../components/predictions/PredictionForm';
import { Spinner } from '../components/common/LoadingScreen';

const stageLabelMap = {
  group_stage: 'Group Stage',
  
};

export default function MatchDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fixture, setFixture] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [allPredictions, setAllPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFixture = useCallback(async () => {
    try {
      const res = await api.get(`/fixtures/${id}`);
      setFixture(res.data.fixture);
    } catch {
      navigate('/fixtures');
    }
  }, [id, navigate]);

  const fetchPrediction = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get(`/predictions/fixture/${id}`);
      setPrediction(res.data.prediction);
    } catch {}
  }, [id, user]);

  const fetchAllPredictions = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get(`/predictions/fixture/${id}/all`);
      setAllPredictions(res.data.predictions || []);
    } catch {}
  }, [id, user]);

  useEffect(() => {
    Promise.all([fetchFixture(), fetchPrediction()]).finally(() => setLoading(false));
  }, [fetchFixture, fetchPrediction]);

  useEffect(() => {
    if (fixture && !fixture.isPredictionOpen) {
      fetchAllPredictions();
    }
  }, [fixture, fetchAllPredictions]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!fixture) return null;

  const { homeTeam, awayTeam, result, status, stage, group, matchDatetime} = fixture;
  const isCompleted = status === 'completed';
  const isLive = status === 'live';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => navigate(-1)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 flex items-center gap-1 text-sm transition-colors">
        ← Back
      </button>

      {/* Match Hero */}
      <div className={`rounded-3xl p-8 mb-6 text-white relative overflow-hidden ${isLive ? 'bg-gradient-to-br from-red-600 to-red-800' : isCompleted ? 'bg-gradient-to-br from-gray-700 to-gray-900' : 'bg-gradient-hero'}`}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

        <div className="relative z-10">
          {/* Stage / status */}
          <div className="flex items-center gap-3 mb-6">
            <span className="bg-white/20 text-white text-sm font-medium px-3 py-1 rounded-full">
              {stageLabelMap[stage] || stage}{group ? ` · Group ${group}` : ''}
            </span>
            {isLive && (
              <span className="flex items-center gap-1.5 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> LIVE
              </span>
            )}
            {isCompleted && <span className="bg-white/20 text-white text-sm px-3 py-1 rounded-full">Full Time</span>}
          </div>

          {/* Teams & Score */}
          <div className="flex items-center justify-between gap-4">
            {/* Home Team */}
            <div className="flex-1 text-center">
              {homeTeam?.flagUrl ? (
                <img src={homeTeam.flagUrl} alt={homeTeam.name}
                  className="w-20 h-20 rounded-full border-4 border-white/30 mx-auto mb-3 object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-4xl mx-auto mb-3">🏳️</div>
              )}
              <h2 className="font-display text-2xl sm:text-3xl tracking-wide">{homeTeam?.name || 'TBD'}</h2>
              <p className="text-white/60 text-sm">{homeTeam?.code}</p>
            </div>

            {/* Score / VS */}
            <div className="text-center px-4">
              {isCompleted || isLive ? (
                <div className="font-display text-6xl sm:text-7xl tracking-widest">
                  {result?.homeScore ?? 0}
                  <span className="text-white/50 mx-2">:</span>
                  {result?.awayScore ?? 0}
                </div>
              ) : (
                <>
                  <div className="font-display text-4xl text-white/50 mb-1">VS</div>
                  <div className="text-white/70 text-sm">{format(new Date(matchDatetime), 'HH:mm')}</div>
                </>
              )}
              {result?.penalties && (
                <p className="text-white/70 text-sm mt-2">
                  (Pens: {result.penaltyHomeScore}–{result.penaltyAwayScore})
                </p>
              )}
            </div>

            {/* Away Team */}
            <div className="flex-1 text-center">
              {awayTeam?.flagUrl ? (
                <img src={awayTeam.flagUrl} alt={awayTeam.name}
                  className="w-20 h-20 rounded-full border-4 border-white/30 mx-auto mb-3 object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-4xl mx-auto mb-3">🏳️</div>
              )}
              <h2 className="font-display text-2xl sm:text-3xl tracking-wide">{awayTeam?.name || 'TBD'}</h2>
              <p className="text-white/60 text-sm">{awayTeam?.code}</p>
            </div>
          </div>

          {/* Match info */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-white/70 text-sm">
            <span>📅 {format(new Date(matchDatetime), 'EEEE, MMMM d, yyyy')}</span>
            <span>🕐 {format(new Date(matchDatetime), 'HH:mm z')}</span>
            
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Prediction Form */}
        <PredictionForm
          fixture={fixture}
          existingPrediction={prediction}
          onSuccess={() => { fetchPrediction(); fetchAllPredictions(); }}
        />

        {/* Community predictions (after deadline) */}
        {!fixture.isPredictionOpen && allPredictions.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4">
              Community Predictions ({allPredictions.length})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {allPredictions.slice(0, 20).map((p) => (
                <div key={p._id} className="flex items-center gap-3 text-sm">
                  <img
                    src={p.user?.avatar || `https://ui-avatars.com/api/?name=${p.user?.username}&size=28&background=2244f5&color=fff`}
                    alt={p.user?.username}
                    className="w-7 h-7 rounded-full"
                  />
                  <span className="flex-1 text-[var(--text-secondary)] truncate">{p.user?.username}</span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">
                    {p.homeScore}–{p.awayScore}
                  </span>
                  {p.points !== null && (
                    <span className={`text-xs font-semibold ${p.points > 0 ? 'text-green-500' : 'text-red-400'}`}>
                      +{p.points}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Match stats placeholder */}
        <div className="card p-5">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Match Info</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Stage</span>
              <span className="font-medium text-[var(--text-primary)]">{stageLabelMap[stage]}</span>
            </div>
            {group && (
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Group</span>
                <span className="font-medium text-[var(--text-primary)]">Group {group}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Date</span>
              <span className="font-medium text-[var(--text-primary)]">{format(new Date(matchDatetime), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Kickoff</span>
              <span className="font-medium text-[var(--text-primary)]">{format(new Date(matchDatetime), 'HH:mm')}</span>
            </div>
            
            </div>
          </div>
        </div>
      </div>
    
  );
}