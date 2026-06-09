import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Spinner } from '../components/common/LoadingScreen';



function StatCard({ icon, label, value, color = 'text-primary-500' }) {
  return (
    <div className="card p-5">
      <div className="text-3xl mb-2">{icon}</div>
      <div className={`font-display text-3xl ${color}`}>{value ?? '—'}</div>
      <div className="text-sm text-[var(--text-secondary)] mt-1">{label}</div>
    </div>
  );
}

function ActionButton({ label, icon, onClick, loading, color = 'btn-secondary' }) {
  return (
    <button onClick={onClick} disabled={loading} className={`${color} flex items-center gap-2 w-full`}>
      {loading ? <Spinner size="sm" /> : <span>{icon}</span>}
      {label}
    </button>
  );
}



const STAGE_LABELS = {
  group_stage: 'Group Stage',
  round_of_32: 'Round of 32',
  round_of_16: 'Round of 16',
  quarterfinal: 'Quarterfinal',
  semifinal: 'Semifinal',
  third_place: 'Third Place',
  final: 'Final',
};

const STATUS_BADGE = {
  upcoming:  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  completed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

function ResultModal({ fixture, onClose, onSaved }) {
  
  const [homeScore, setHomeScore] = useState(fixture.result?.homeScore ?? '');
  const [awayScore, setAwayScore] = useState(fixture.result?.awayScore ?? '');
  const [extraTime, setExtraTime] = useState(fixture.result?.extraTime || false);
  const [penalties, setPenalties] = useState(fixture.result?.penalties || false);
  const [penaltyHome, setPenaltyHome] = useState(fixture.result?.penaltyHomeScore ?? '');
  const [penaltyAway, setPenaltyAway] = useState(fixture.result?.penaltyAwayScore ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (homeScore === '' || awayScore === '') {
      toast.error('Please enter both scores');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        homeScore: parseInt(homeScore),
        awayScore: parseInt(awayScore),
        extraTime,
        penalties,
        penaltyHomeScore: penalties ? parseInt(penaltyHome) : null,
        penaltyAwayScore: penalties ? parseInt(penaltyAway) : null,
      };
      const res = await api.put(`/admin/fixtures/${fixture._id}/result`, payload);
      toast.success(res.data.message || 'Result saved!');
      onSaved(res.data.fixture);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save result');
    } finally {
      setSaving(false);
    }
  };

  const home = fixture.homeTeam;
  const away = fixture.awayTeam;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="card w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-[var(--text-primary)]">ENTER RESULT</h2>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xl">✕</button>
        </div>

        {/* Match title */}
        <div className="text-center text-sm text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">{home?.name}</span>
          <span className="mx-2">vs</span>
          <span className="font-medium text-[var(--text-primary)]">{away?.name}</span>
        </div>

        {/* Score inputs */}
        <div className="flex items-center gap-4 justify-center">
          <div className="text-center flex-1">
            <div className="flex items-center gap-2 mb-1 justify-center">
              {home?.flagUrl && <img src={home.flagUrl} alt="" className="w-6 h-6 rounded-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />}
              <span className="text-xs font-semibold text-[var(--text-secondary)]">{home?.shortName || home?.name}</span>
            </div>
            <input
              type="number"
              min="0"
              max="99"
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              className="w-20 text-center text-3xl font-display px-2 py-3 rounded-xl border-2 border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-primary-500"
              placeholder="0"
            />
          </div>

          <div className="font-display text-2xl text-[var(--text-secondary)]">—</div>

          <div className="text-center flex-1">
            <div className="flex items-center gap-2 mb-1 justify-center">
              {away?.flagUrl && <img src={away.flagUrl} alt="" className="w-6 h-6 rounded-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />}
              <span className="text-xs font-semibold text-[var(--text-secondary)]">{away?.shortName || away?.name}</span>
            </div>
            <input
              type="number"
              min="0"
              max="99"
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              className="w-20 text-center text-3xl font-display px-2 py-3 rounded-xl border-2 border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-primary-500"
              placeholder="0"
            />
          </div>
        </div>

        {/* Extra time / penalties */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={extraTime}
              onChange={(e) => { setExtraTime(e.target.checked); if (!e.target.checked) setPenalties(false); }}
              className="w-4 h-4 accent-primary-500"
            />
            <span className="text-sm text-[var(--text-primary)]">Extra Time</span>
          </label>

          {extraTime && (
            <label className="flex items-center gap-3 cursor-pointer ml-6">
              <input
                type="checkbox"
                checked={penalties}
                onChange={(e) => setPenalties(e.target.checked)}
                className="w-4 h-4 accent-primary-500"
              />
              <span className="text-sm text-[var(--text-primary)]">Went to Penalties</span>
            </label>
          )}

          {penalties && (
            <div className="ml-6 p-3 rounded-xl bg-[var(--bg-secondary)] space-y-2">
              <p className="text-xs text-[var(--text-secondary)] font-semibold">PENALTY SHOOTOUT SCORE</p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  value={penaltyHome}
                  onChange={(e) => setPenaltyHome(e.target.value)}
                  placeholder={home?.shortName || 'Home'}
                  className="w-20 text-center px-2 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-primary-500"
                />
                <span className="text-[var(--text-secondary)] text-sm">–</span>
                <input
                  type="number"
                  min="0"
                  value={penaltyAway}
                  onChange={(e) => setPenaltyAway(e.target.value)}
                  placeholder={away?.shortName || 'Away'}
                  className="w-20 text-center px-2 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Note about re-scoring */}
        {fixture.scoresCalculated && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 rounded-lg">
            ⚠️ This match already has points calculated. Saving will reset and recalculate all predictions.
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving ? <Spinner size="sm" /> : '💾'}
            Save Result
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [stats, setStats]             = useState(null);
  const [users, setUsers]             = useState([]);
  const [teams, setTeams]             = useState([]);
  const [fixtures, setFixtures]       = useState([]);
  const [fixtureFilter, setFixtureFilter] = useState({ status: '', stage: '', group: '' });
  const [tab, setTab]                 = useState('dashboard');
  const [loadingAction, setLoadingAction] = useState('');
  const [loadingFixtures, setLoadingFixtures] = useState(false);
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [newTeam, setNewTeam]         = useState({ name: '', shortName: '', code: '', confederation: 'UEFA', flagUrl: '', group: '' });

  useEffect(() => {
    api.get('/admin/stats').then((res) => setStats(res.data.stats)).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'users') {
      api.get('/admin/users').then((res) => setUsers(res.data.users || [])).catch(() => {});
    }
    if (tab === 'teams') {
      api.get('/admin/teams').then((res) => setTeams(res.data.teams || [])).catch(() => {});
    }
  }, [tab]);

  const loadFixtures = useCallback(async () => {
    setLoadingFixtures(true);
    try {
      const params = {};
      if (fixtureFilter.status) params.status = fixtureFilter.status;
      if (fixtureFilter.stage)  params.stage  = fixtureFilter.stage;
      if (fixtureFilter.group)  params.group  = fixtureFilter.group;
      const res = await api.get('/admin/fixtures', { params });
      setFixtures(res.data.fixtures || []);
    } catch {
      toast.error('Failed to load fixtures');
    } finally {
      setLoadingFixtures(false);
    }
  }, [fixtureFilter]);

  useEffect(() => {
    if (tab === 'fixtures') loadFixtures();
  }, [tab, loadFixtures]);

  const doAction = async (key, fn, successMsg) => {
    setLoadingAction(key);
    try {
      const res = await fn();
      toast.success(res.data.message || successMsg);
      if (key === 'stats') {
        const r = await api.get('/admin/stats');
        setStats(r.data.stats);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    } finally {
      setLoadingAction('');
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    doAction('create-team', () => api.post('/admin/teams', newTeam), 'Team created!');
    setNewTeam({ name: '', shortName: '', code: '', confederation: 'UEFA', flagUrl: '', group: '' });
  };

  const handleResultSaved = (updatedFixture) => {
    setFixtures((prev) =>
      prev.map((f) => (f._id === updatedFixture._id ? { ...f, ...updatedFixture } : f))
    );
    // Refresh stats
    api.get('/admin/stats').then((res) => setStats(res.data.stats)).catch(() => {});
  };

  const TABS = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'fixtures',  label: '⚽ Fixtures & Results' },
    { id: 'sync',      label: '🔧 Tools' },
    { id: 'teams',     label: '🏳️ Teams' },
    { id: 'users',     label: '👥 Users' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center text-2xl">⚙️</div>
        <div>
          <h1 className="font-display text-4xl text-[var(--text-primary)]">ADMIN PANEL</h1>
          <p className="text-[var(--text-secondary)] text-sm">Manage Predictator platform</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.id ? 'bg-primary-600 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Dashboard */}
      {tab === 'dashboard' && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard icon="👥" label="Total Users"       value={stats?.users}           color="text-blue-500" />
            <StatCard icon="📅" label="Fixtures"          value={stats?.fixtures}         color="text-primary-500" />
            <StatCard icon="🎯" label="Predictions"       value={stats?.predictions}      color="text-green-500" />
            <StatCard icon="✅" label="Completed Matches" value={stats?.completedMatches} color="text-yellow-500" />
          </div>
          <div className="card p-6">
            <h3 className="font-display text-xl text-[var(--text-primary)] mb-4">QUICK INFO</h3>
            <div className="space-y-2 text-sm text-[var(--text-secondary)]">
              <p>• Use <strong>Fixtures &amp; Results</strong> to enter final scores — points are calculated automatically</p>
              <p>• Use <strong>Teams</strong> to manually add or edit teams</p>
              <p>• Use <strong>Tools</strong> to recalculate points or generate the knockout bracket</p>
              <p>• Knockout stage generation uses Group Standings data</p>
            </div>
          </div>
        </div>
      )}

      {/* Fixtures & Results */}
      {tab === 'fixtures' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="card p-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Status</label>
              <select
                value={fixtureFilter.status}
                onChange={(e) => setFixtureFilter((f) => ({ ...f, status: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-primary-500"
              >
                <option value="">All Statuses</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Stage</label>
              <select
                value={fixtureFilter.stage}
                onChange={(e) => setFixtureFilter((f) => ({ ...f, stage: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-primary-500"
              >
                <option value="">All Stages</option>
                {Object.entries(STAGE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Group</label>
              <select
                value={fixtureFilter.group}
                onChange={(e) => setFixtureFilter((f) => ({ ...f, group: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-primary-500"
              >
                <option value="">All Groups</option>
                {'ABCDEFGHIJKL'.split('').map((g) => (
                  <option key={g} value={g}>Group {g}</option>
                ))}
              </select>
            </div>
            <button onClick={loadFixtures} className="btn-secondary text-sm flex items-center gap-2">
              {loadingFixtures ? <Spinner size="sm" /> : '🔍'} Filter
            </button>
          </div>

          {/* Fixtures list */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border)] flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--text-secondary)]">
                {fixtures.length} FIXTURE{fixtures.length !== 1 ? 'S' : ''}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">Click "Enter Result" to set final score</span>
            </div>

            {loadingFixtures ? (
              <div className="p-12 flex justify-center"><Spinner /></div>
            ) : fixtures.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-secondary)]">No fixtures found</div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {fixtures.map((fixture) => {
                  const home = fixture.homeTeam;
                  const away = fixture.awayTeam;
                  const hasResult = fixture.result?.homeScore !== null && fixture.result?.homeScore !== undefined;
                  const kickoff = new Date(fixture.matchDatetime);

                  return (
                    <div key={fixture._id} className="px-4 py-4 hover:bg-[var(--bg-secondary)] transition-colors">
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Date + stage */}
                        <div className="text-xs text-[var(--text-secondary)] w-24 flex-shrink-0">
                          <div className="font-medium">{kickoff.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                          <div>{kickoff.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</div>
                          <div className="mt-0.5 text-[10px]">{STAGE_LABELS[fixture.stage] || fixture.stage}{fixture.group ? ` · Grp ${fixture.group}` : ''}</div>
                        </div>

                        {/* Teams + score */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {home?.flagUrl && <img src={home.flagUrl} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />}
                            <span className="font-medium text-sm text-[var(--text-primary)] truncate">{home?.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {away?.flagUrl && <img src={away.flagUrl} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />}
                            <span className="font-medium text-sm text-[var(--text-primary)] truncate">{away?.name}</span>
                          </div>
                        </div>

                        {/* Score display */}
                        <div className="text-center w-16 flex-shrink-0">
                          {hasResult ? (
                              <div>
                                <div className="font-display text-xl text-[var(--text-primary)]">
                                  {fixture.result.homeScore} – {fixture.result.awayScore}
                                </div>

                                {/* Penalty shootout */}
                                {fixture.result.penalties === true &&
                                fixture.result.penaltyHomeScore != null &&
                                fixture.result.penaltyAwayScore != null && (
                                  <div className="text-[10px] text-[var(--text-secondary)]">
                                    pens ({fixture.result.penaltyHomeScore}–{fixture.result.penaltyAwayScore})
                                  </div>
                                )}

                                {/* Extra time but no penalties */}
                                {fixture.result.extraTime === true &&
                                fixture.result.penalties !== true && (
                                  <div className="text-[10px] text-[var(--text-secondary)]">AET</div>
                                )}

                                {/* Winner indicator for knockout matches */}
                                {fixture.result.winner && fixture.result.winner !== 'draw' && (
                                  <div className="text-[10px] text-primary-500 font-medium">
                                    {fixture.result.winner === 'home'
                                      ? `${fixture.homeTeam?.shortName} win`
                                      : `${fixture.awayTeam?.shortName} win`}
                                  </div>
                                )}
                              </div>
                          ) : (
                            <span className="text-[var(--text-secondary)] text-sm">vs</span>
                          )}
                        </div>

                        {/* Status badge */}
                        <div className="flex-shrink-0">
                          <span className={`text-[10px] font-semibold px-2 py-1 rounded-full uppercase ${STATUS_BADGE[fixture.status] || ''}`}>
                            {fixture.status}
                          </span>
                        </div>

                        {/* Action */}
                        <button
                          onClick={() => setSelectedFixture(fixture)}
                          className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                            hasResult
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'btn-primary text-xs py-1.5 px-3'
                          }`}
                        >
                          {hasResult ? '✏️ Edit Result' : '⚽ Enter Result'}
                        </button>
                      </div>

                      {/* Points calculated badge */}
                      {fixture.scoresCalculated && (
                        <div className="mt-2 text-[10px] text-green-600 dark:text-green-400">
                          ✓ Points calculated
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tools (formerly Sync & Tools) */}
      {tab === 'sync' && (
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="font-display text-xl text-[var(--text-primary)] mb-4">RECALCULATE</h3>
            <div className="space-y-3">
              <ActionButton label="Recalculate All Points" icon="🔢"
                loading={loadingAction === 'recalc-points'}
                onClick={() => doAction('recalc-points', () => api.post('/admin/recalculate-points'), 'Points recalculated!')} />
              <ActionButton label="Recalculate Group Standings" icon="📊"
                loading={loadingAction === 'recalc-standings'}
                onClick={() => doAction('recalc-standings', () => api.post('/admin/recalculate-standings'), 'Standings updated!')} />
            </div>
          </div>

          {/* Tools tab — replace the existing knockout card with this */}
            <div className="card p-6">
                <h3 className="font-display text-xl text-[var(--text-primary)] mb-3">
                  KNOCKOUT STAGE
                </h3>

                {/* Progress indicator */}
                {stats?.knockoutButton && (
                  <div className="mb-4">
                    {['Group Stage', 'Round of 32', 'Round of 16', 'Quarterfinal', 'Semifinal', 'Final'].map((stage, i) => {
                      const stageKeys = ['group_stage', 'round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'final'];
                      // Determine status from knockoutButton label
                      const labelStages = {
                        'Set Up Round of 32':        0,
                        'Generate Round of 16':      1,
                        'Generate Quarterfinal':     2,
                        'Generate Semifinal':        3,
                        'Generate Final + Third Place': 4,
                        'Tournament Complete 🏆':    5,
                      };
                      const currentIdx = labelStages[stats.knockoutButton.label] ?? 0;
                      const isDone     = i < currentIdx;
                      const isCurrent  = i === currentIdx;

                      return (
                        <div key={stage} className="flex items-center gap-2 mb-1">
                          <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] ${
                            isDone    ? 'bg-green-500 text-white' :
                            isCurrent ? 'bg-primary-500 text-white' :
                            'bg-[var(--border)] text-[var(--text-secondary)]'
                          }`}>
                            {isDone ? '✓' : i + 1}
                          </div>
                          <span className={`text-xs ${
                            isDone    ? 'text-green-500 line-through' :
                            isCurrent ? 'text-[var(--text-primary)] font-medium' :
                            'text-[var(--text-secondary)]'
                          }`}>
                            {stage}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Disabled reason */}
                {stats?.knockoutButton?.disabled && stats.knockoutButton.reason && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 rounded-lg mb-4">
                    ⏳ {stats.knockoutButton.reason}
                  </p>
                )}

                {/* Tournament complete */}
                {stats?.knockoutButton?.action === 'complete' && (
                  <p className="text-sm text-green-500 font-medium mb-4">
                    🏆 The tournament is complete!
                  </p>
                )}

                {/* The button — always rendered, disabled when needed */}
                {stats?.knockoutButton && stats.knockoutButton.action !== 'complete' && (
                  stats.knockoutButton.action === 'setup' ? (
                    <button
                      onClick={() => !stats.knockoutButton.disabled && navigate('/admin/knockout-setup')}
                      disabled={stats.knockoutButton.disabled}
                      className={`flex items-center gap-2 w-full justify-center px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                        stats.knockoutButton.disabled
                          ? 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] cursor-not-allowed opacity-60'
                          : 'btn-primary'
                      }`}
                    >
                      ⚽ {stats.knockoutButton.label}
                    </button>
                  ) : (
                    <button
                      disabled={stats.knockoutButton.disabled || loadingAction === 'gen-knockout'}
                      onClick={() => {
                        if (stats.knockoutButton.disabled) return;
                        doAction(
                          'gen-knockout',
                          () => api.post('/admin/generate-knockout/auto'),
                          `${stats.knockoutButton.label} generated!`,
                        ).then(() => {
                          api.get('/admin/stats').then((res) => setStats(res.data.stats));
                        });
                      }}
                      className={`flex items-center gap-2 w-full justify-center px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                        stats.knockoutButton.disabled
                          ? 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] cursor-not-allowed opacity-60'
                          : 'btn-primary'
                      }`}
                    >
                      {loadingAction === 'gen-knockout' ? <Spinner size="sm" /> : '⚡'}
                      {stats.knockoutButton.label}
                    </button>
                  )
                )}

                {/* Round of 32 Management */}
                  {stats?.roundOf32Exists && (
                    <div className="mt-4 pt-4 border-t border-[var(--border)]">
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                        ROUND OF 32 MANAGEMENT
                      </h4>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => navigate('/admin/knockout-setup')}
                          className="btn-secondary"
                        >
                          ✏️ Edit Round of 32
                        </button>

                        <button
                          disabled={loadingAction === 'reset-r32'}
                          onClick={() => {
                            if (
                              !window.confirm(
                                'Reset Round of 32? This will remove all Round of 32 fixtures.'
                              )
                            ) {
                              return;
                            }

                            doAction(
                              'reset-r32',
                              () =>
                                api.delete(
                                  '/admin/generate-knockout/round-of-32'
                                ),
                              'Round of 32 reset!'
                            ).then(() => {
                              api.get('/admin/stats').then((res) => {
                                setStats(res.data.stats);
                              });
                            });
                          }}
                          className="btn-secondary"
                        >
                          {loadingAction === 'reset-r32'
                            ? 'Resetting...'
                            : '🗑️ Reset Round of 32'}
                        </button>
                      </div>
                    </div>
                  )}
              </div>
        </div>
      )}

      {/* Teams */}
      {tab === 'teams' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-display text-xl text-[var(--text-primary)] mb-4">ADD TEAM</h3>
            <form onSubmit={handleCreateTeam} className="grid sm:grid-cols-3 gap-3">
              {[
                { key: 'name',      label: 'Full Name',     placeholder: 'Brazil',                   required: true },
                { key: 'shortName', label: 'Short Name',    placeholder: 'BRA' },
                { key: 'code',      label: 'Code (3 letters)', placeholder: 'BRA' },
                { key: 'group',     label: 'Group',         placeholder: 'A' },
                { key: 'flagUrl',   label: 'Flag URL',      placeholder: 'https://flagcdn.com/br.svg' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-xs text-[var(--text-secondary)] mb-1 block">{field.label}</label>
                  <input
                    type="text"
                    placeholder={field.placeholder}
                    value={newTeam[field.key]}
                    onChange={(e) => setNewTeam((t) => ({ ...t, [field.key]: e.target.value }))}
                    required={field.required}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">Confederation</label>
                <select
                  value={newTeam.confederation}
                  onChange={(e) => setNewTeam((t) => ({ ...t, confederation: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-primary-500"
                >
                  {['UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <button type="submit" className="btn-primary">Add Team</button>
              </div>
            </form>
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
              <span className="text-sm font-semibold text-[var(--text-secondary)]">{teams.length} TEAMS</span>
            </div>
            <div className="divide-y divide-[var(--border)] max-h-96 overflow-y-auto">
              {teams.map((team) => (
                <div key={team._id} className="flex items-center gap-3 px-4 py-3">
                  {team.flagUrl && (
                    <img src={team.flagUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-[var(--border)]"
                      onError={(e) => { e.target.style.display = 'none'; }} />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm text-[var(--text-primary)]">{team.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{team.confederation} · Group {team.group || '?'}</p>
                  </div>
                  <span className="font-mono text-xs text-[var(--text-secondary)]">{team.code}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border)] grid grid-cols-12 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            <div className="col-span-1">#</div>
            <div className="col-span-5">User</div>
            <div className="col-span-2 text-center">Role</div>
            <div className="col-span-2 text-center">Predictions</div>
            <div className="col-span-2 text-right">Points</div>
          </div>
          <div className="divide-y divide-[var(--border)] max-h-[32rem] overflow-y-auto">
            {users.map((u, i) => (
              <div key={u._id} className="grid grid-cols-12 gap-2 items-center px-4 py-3 hover:bg-[var(--bg-secondary)] transition-colors">
                <div className="col-span-1 text-xs font-mono text-[var(--text-secondary)]">{i + 1}</div>
                <div className="col-span-5 flex items-center gap-2 min-w-0">
                  <img
                    src={u.avatar || `https://ui-avatars.com/api/?name=${u.username}&size=32&background=2244f5&color=fff`}
                    alt={u.username}
                    className="w-8 h-8 rounded-full border border-[var(--border)] flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{u.username}</p>
                    <p className="text-xs text-[var(--text-secondary)] truncate">{u.email}</p>
                  </div>
                </div>
                <div className="col-span-2 text-center">
                  <span className={`badge ${u.role === 'admin' ? 'badge-yellow' : 'badge-gray'}`}>{u.role}</span>
                </div>
                <div className="col-span-2 text-center text-sm text-[var(--text-secondary)]">
                  {u.stats?.totalPredictions || 0}
                </div>
                <div className="col-span-2 text-right font-display text-lg text-primary-500">
                  {u.totalPoints}
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="p-8 text-center text-[var(--text-secondary)]">No users found</div>
            )}
          </div>
        </div>
      )}

      {/* Result Modal */}
      {selectedFixture && (
        <ResultModal
          fixture={selectedFixture}
          onClose={() => setSelectedFixture(null)}
          onSaved={handleResultSaved}
        />
      )}
    </div>
  );
}