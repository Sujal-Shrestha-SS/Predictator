import  { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { format, differenceInSeconds, isPast } from 'date-fns';
import { Spinner } from '../common/LoadingScreen';

function Countdown({ deadline }) {
  const [secs, setSecs] = useState(differenceInSeconds(new Date(deadline), new Date()));

  useEffect(() => {
    const id = setInterval(() => {
      setSecs((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (secs <= 0) return <span className="text-red-500 font-semibold">Deadline passed</span>;

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;

  const pad = (n) => String(n).padStart(2, '0');
  const urgency = secs < 300 ? 'text-red-500 animate-pulse' : secs < 3600 ? 'text-yellow-500' : 'text-green-500';

  return (
    <span className={`font-mono font-bold ${urgency}`}>
      {h > 0 && `${pad(h)}:`}{pad(m)}:{pad(s)}
    </span>
  );
}

export default function PredictionForm({ fixture, existingPrediction, onSuccess }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [homeScore, setHomeScore] = useState(existingPrediction?.homeScore ?? '');
  const [awayScore, setAwayScore] = useState(existingPrediction?.awayScore ?? '');
  const [loading, setLoading] = useState(false);

  const deadline = new Date(fixture.predictionDeadline);
  const isOpen = fixture.isPredictionOpen && !isPast(deadline);

  if (!user) {
    return (
      <div className="card p-6 text-center">
        <p className="text-[var(--text-secondary)] mb-4">Sign in to make predictions</p>
        <button onClick={() => navigate('/login')} className="btn-primary">
          Sign In with Google
        </button>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <div className="card p-6">
        <h3 className="font-semibold text-[var(--text-primary)] mb-2">Your Prediction</h3>
        {existingPrediction ? (
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-4">
              <span className="font-display text-4xl">{existingPrediction.homeScore}</span>
              <span className="text-[var(--text-secondary)]">–</span>
              <span className="font-display text-4xl">{existingPrediction.awayScore}</span>
            </div>
            {existingPrediction.points !== null && (
              <div className="mt-3">
                <span className={`badge text-sm ${
                  existingPrediction.pointType === 'exact' ? 'badge-green' :
                  existingPrediction.pointType === 'incorrect' ? 'badge-red' :
                  'badge-blue'
                }`}>
                  +{existingPrediction.points} points
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[var(--text-secondary)] text-sm text-center py-4">
            You didn't predict this match
          </p>
        )}
        <p className="text-xs text-[var(--text-secondary)] text-center mt-2">
          🔒 Predictions closed {format(deadline, 'MMM d, HH:mm')}
        </p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (homeScore === '' || awayScore === '') {
      toast.error('Please enter both scores');
      return;
    }
    if (isPast(deadline)) {
      toast.error('Prediction deadline has passed!');
      return;
    }

    setLoading(true);
    try {
      await api.post('/predictions', {
        fixtureId: fixture._id,
        homeScore: parseInt(homeScore),
        awayScore: parseInt(awayScore),
      });
      toast.success(existingPrediction ? '✏️ Prediction updated!' : '🎯 Prediction saved!');
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save prediction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[var(--text-primary)]">
          {existingPrediction ? 'Update Prediction' : 'Make Prediction'}
        </h3>
        <div className="text-right">
          <p className="text-xs text-[var(--text-secondary)]">Closes in</p>
          <Countdown deadline={deadline} />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="text-center">
            <p className="text-xs text-[var(--text-secondary)] mb-2 truncate max-w-24">
              {fixture.homeTeam?.shortName}
            </p>
            <input
              type="number"
              min="0"
              max="30"
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              className="score-input"
              placeholder="0"
            />
          </div>

          <span className="font-display text-3xl text-[var(--text-secondary)] mt-6">–</span>

          <div className="text-center">
            <p className="text-xs text-[var(--text-secondary)] mb-2 truncate max-w-24">
              {fixture.awayTeam?.shortName}
            </p>
            <input
              type="number"
              min="0"
              max="30"
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              className="score-input"
              placeholder="0"
            />
          </div>
        </div>

        {/* Points guide */}
        <div className="bg-[var(--bg-secondary)] rounded-xl p-3 mb-4 text-xs text-[var(--text-secondary)] grid grid-cols-3 gap-2 text-center">
          <div><span className="font-semibold text-green-500">30 pts</span><br />Exact score</div>
          <div><span className="font-semibold text-blue-500">20 pts</span><br />Correct winner</div>
          <div><span className="font-semibold text-yellow-500">15 pts</span><br />Correct draw</div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? <Spinner size="sm" /> : null}
          {existingPrediction ? '✏️ Update Prediction' : '🎯 Save Prediction'}
        </button>
      </form>
    </div>
  );
}