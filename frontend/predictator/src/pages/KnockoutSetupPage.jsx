import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Spinner } from '../components/common/LoadingScreen';

const d = (dateStr) => new Date(dateStr);

const R32_SLOTS = [
  { matchNumber: 73,  label: 'Match 73', date: d('2026-06-29T00:45'),  },
  { matchNumber: 74,  label: 'Match 74', date: d('2026-06-29T22:45'),  },
  { matchNumber: 75,  label: 'Match 75', date: d('2026-06-30T02:15'),  },
  { matchNumber: 76,  label: 'Match 76', date: d('2026-06-30T06:45'),  },
  { matchNumber: 77,  label: 'Match 77', date: d('2026-06-30T22:45'),  },
  { matchNumber: 78,  label: 'Match 78', date: d('2026-07-01T02:45'),  },
  { matchNumber: 79,  label: 'Match 79', date: d('2026-07-01T06:45'),  },
  { matchNumber: 80,  label: 'Match 80', date: d('2026-07-01T21:45'),  },
  { matchNumber: 81,  label: 'Match 81', date: d('2026-07-02T01:45'),  },
  { matchNumber: 82,  label: 'Match 82', date: d('2026-07-02T05:45'),  },
  { matchNumber: 83,  label: 'Match 83', date: d('2026-07-03T00:45'),  },
  { matchNumber: 84,  label: 'Match 84', date: d('2026-07-03T04:45'),  },
  { matchNumber: 85,  label: 'Match 85', date: d('2026-07-03T08:45'),  },
  { matchNumber: 86,  label: 'Match 86', date: d('2026-07-03T23:45'),  },
  { matchNumber: 87,  label: 'Match 87', date: d('2026-07-04T03:45'),  },
  { matchNumber: 88,  label: 'Match 88', date: d('2026-07-04T07:15'),  },
];

const FLAG_MAP = {
  MEX:'🇲🇽', ECU:'🇪🇨', SEN:'🇸🇳', NZL:'🇳🇿', ARG:'🇦🇷', EGY:'🇪🇬',
  RSA:'🇿🇦', UKR:'🇺🇦', USA:'🇺🇸', PAN:'🇵🇦', ALB:'🇦🇱', CMR:'🇨🇲',
  FRA:'🇫🇷', NED:'🇳🇱', KSA:'🇸🇦', VEN:'🇻🇪', ESP:'🇪🇸', BRA:'🇧🇷',
  SRB:'🇷🇸', NGA:'🇳🇬', POR:'🇵🇹', GER:'🇩🇪', CRC:'🇨🇷', MOZ:'🇲🇿',
  ENG:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', COL:'🇨🇴', SNG:'🇸🇳', SVK:'🇸🇰', JPN:'🇯🇵', KOR:'🇰🇷',
  BEL:'🇧🇪', MLI:'🇲🇱', CAN:'🇨🇦', MAR:'🇲🇦', CRO:'🇭🇷', AUS:'🇦🇺',
  URU:'🇺🇾', IRN:'🇮🇷', SUI:'🇨🇭', CIV:'🇨🇮', DEN:'🇩🇰', PAR:'🇵🇾',
  CUB:'🇨🇺', QAT:'🇶🇦', POL:'🇵🇱', AUT:'🇦🇹', CHI:'🇨🇱', IDN:'🇮🇩',
};

const getFlagEmoji = (code) => FLAG_MAP[code] || '🏳';

function TeamSelect({ value, onChange, teams, excludeId }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-primary-500"
    >
      <option value="">Select team…</option>
      {teams.map((t) => (
        <option key={t._id} value={t._id} disabled={t._id === excludeId}>
          {t.flag} {t.name} ({t.code})
        </option>
      ))}
    </select>
  );
}

export default function KnockoutSetupPage() {
  const navigate  = useNavigate();
  const [teams, setTeams]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [resetting, setResetting] = useState(false);
  const [editMode, setEditMode]   = useState(false); // false = view, true = edit
  const [existing, setExisting]   = useState(false); // whether R32 fixtures exist
  const [hasResults, setHasResults] = useState(false); // whether any R32 has results

  const emptySelections = () => {
    const init = {};
    R32_SLOTS.forEach((s) => { init[s.matchNumber] = { homeTeamId: '', awayTeamId: '' }; });
    return init;
  };

  const [selections, setSelections] = useState(emptySelections);

  useEffect(() => {
    const load = async () => {
      try {
        const [teamsRes, fixturesRes] = await Promise.all([
          api.get('/admin/teams'),
          api.get('/admin/fixtures', { params: { stage: 'round_of_32' } }),
        ]);

        const sorted = (teamsRes.data.teams || [])
          .sort((a, b) => (a.group || '').localeCompare(b.group || '') || a.name.localeCompare(b.name))
          .map((t) => ({ ...t, flag: getFlagEmoji(t.code) }));

        setTeams(sorted);

        const existingFixtures = fixturesRes.data.fixtures || [];

        if (existingFixtures.length > 0) {
          setExisting(true);

          // Check if any have results
          const anyResults = existingFixtures.some((f) => f.status === 'completed');
          setHasResults(anyResults);

          // Pre-fill selections from saved fixtures
          const filled = emptySelections();
          existingFixtures.forEach((f) => {
            if (filled[f.matchNumber] !== undefined) {
              filled[f.matchNumber] = {
                homeTeamId: f.homeTeam?._id || '',
                awayTeamId: f.awayTeam?._id || '',
              };
            }
          });
          setSelections(filled);
          setEditMode(false); // start in view mode
        } else {
          setExisting(false);
          setEditMode(true); // no fixtures yet — go straight to edit mode
        }
      } catch (err) {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const setHome = (matchNumber, teamId) =>
    setSelections((prev) => ({ ...prev, [matchNumber]: { ...prev[matchNumber], homeTeamId: teamId } }));

  const setAway = (matchNumber, teamId) =>
    setSelections((prev) => ({ ...prev, [matchNumber]: { ...prev[matchNumber], awayTeamId: teamId } }));

  // Duplicate detection
  const usedTeams  = {};
  const duplicates = new Set();
  R32_SLOTS.forEach((s) => {
    const { homeTeamId, awayTeamId } = selections[s.matchNumber];
    [homeTeamId, awayTeamId].forEach((id) => {
      if (id) {
        if (usedTeams[id]) duplicates.add(id);
        usedTeams[id] = true;
      }
    });
  });

  const allFilled = R32_SLOTS.every(
    (s) => selections[s.matchNumber]?.homeTeamId && selections[s.matchNumber]?.awayTeamId
  );

  // Reset — deletes existing R32 fixtures and enters edit mode
  const handleReset = async () => {
    if (!window.confirm('This will delete all Round of 32 fixtures and let you reassign teams. Continue?')) return;
    setResetting(true);
    try {
      await api.delete('/admin/generate-knockout/round-of-32');
      toast.success('Round of 32 cleared — reassign teams below');
      setExisting(false);
      setEditMode(true);
      setSelections(emptySelections());
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset');
    } finally {
      setResetting(false);
    }
  };

  // Cancel edit — revert to saved state
  const handleCancelEdit = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/fixtures', { params: { stage: 'round_of_32' } });
      const existingFixtures = res.data.fixtures || [];
      const filled = emptySelections();
      existingFixtures.forEach((f) => {
        if (filled[f.matchNumber] !== undefined) {
          filled[f.matchNumber] = {
            homeTeamId: f.homeTeam?._id || '',
            awayTeamId: f.awayTeam?._id || '',
          };
        }
      });
      setSelections(filled);
      setEditMode(false);
    } catch {
      toast.error('Failed to reload fixtures');
    } finally {
      setLoading(false);
    }
  };

 const handleSave = async () => {
  if (!allFilled) { toast.error('Please fill in all 16 matches'); return; }
  if (duplicates.size > 0) { toast.error('Some teams are assigned to multiple matches'); return; }

  setSaving(true);
  try {
    const fixtures = R32_SLOTS.map((s) => ({
      matchNumber: s.matchNumber,
      homeTeamId:  selections[s.matchNumber].homeTeamId,
      awayTeamId:  selections[s.matchNumber].awayTeamId,
    }));

    // If fixtures already exist, clear them first then reinsert
    if (existing) {
      await api.delete('/admin/generate-knockout/round-of-32');
    }

    await api.post('/admin/generate-knockout/round-of-32', { fixtures });
    toast.success('Round of 32 saved!');
    setExisting(true);
    setEditMode(false);
  } catch (err) {
    toast.error(err.response?.data?.error || 'Failed to save');
  } finally {
    setSaving(false);
  }
};

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Spinner /></div>;
  }

  const filledCount = R32_SLOTS.filter(
    (s) => selections[s.matchNumber]?.homeTeamId && selections[s.matchNumber]?.awayTeamId
  ).length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Back */}
      <button
        onClick={() => navigate('/admin')}
        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm mb-4 block"
      >
        ← Back to Admin
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl text-[var(--text-primary)]">ROUND OF 32</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            {!existing
              ? 'Assign the 32 qualified teams to their Round of 32 matches'
              : editMode
              ? 'Editing fixture assignments — save when done'
              : 'Round of 32 fixtures are set — click Edit to make changes'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Edit / Cancel buttons when fixtures exist */}
          {existing && !editMode && (
            <>
              {!hasResults && (
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="btn-secondary flex items-center gap-2 text-sm text-red-500 hover:text-red-600"
                >
                  {resetting ? <Spinner size="sm" /> : '🗑'}
                  Reset All
                </button>
              )}
              <button
                onClick={() => setEditMode(true)}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                ✏️ Edit Teams
              </button>
            </>
          )}

          {/* Save / Cancel when in edit mode */}
          {editMode && existing && (
            <button
              onClick={handleCancelEdit}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
          )}

          {editMode && (
            <>
              <div className={`text-xs ${allFilled && duplicates.size === 0 ? 'text-green-500' : 'text-[var(--text-secondary)]'}`}>
                {filledCount}/16 filled
                {duplicates.size > 0 && <span className="text-red-500 ml-2">⚠ duplicates</span>}
              </div>
              <button
                onClick={handleSave}
                disabled={saving || !allFilled || duplicates.size > 0}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {saving ? <Spinner size="sm" /> : '💾'}
                Save
              </button>
            </>
          )}
        </div>
      </div>

      {/* Warning if has results */}
      {existing && hasResults && (
        <div className="card p-4 mb-6 border-yellow-400 dark:border-yellow-600">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            ⚠️ Some Round of 32 matches already have results entered. Team reassignment is locked to prevent data inconsistency. To make changes, clear the results first from the Fixtures tab.
          </p>
        </div>
      )}

      {/* Info banner in edit mode */}
      {editMode && !existing && (
        <div className="card p-4 mb-6 text-sm text-[var(--text-secondary)]">
          Teams are sorted by group. Each team can only appear once across all 16 matches — duplicates are highlighted in red.
        </div>
      )}

      {/* Match cards */}
      <div className="space-y-3">
        {R32_SLOTS.map((slot) => {
          const sel  = selections[slot.matchNumber];
          const homeIsDup = sel.homeTeamId && duplicates.has(sel.homeTeamId);
          const awayIsDup = sel.awayTeamId && duplicates.has(sel.awayTeamId);
          const homeTeam  = teams.find((t) => t._id === sel.homeTeamId);
          const awayTeam  = teams.find((t) => t._id === sel.awayTeamId);

          return (
            <div
              key={slot.matchNumber}
              className={`card p-4 transition-all ${
                homeIsDup || awayIsDup
                  ? 'border-red-400 dark:border-red-600'
                  : editMode && sel.homeTeamId && sel.awayTeamId
                  ? 'border-green-400/50 dark:border-green-600/50'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3 flex-wrap">
                {/* Match info */}
                <div className="w-28 flex-shrink-0">
                  <div className="font-display text-base text-[var(--text-primary)]">{slot.label}</div>
                  <div className="text-xs text-[var(--text-secondary)]">{slot.date.toLocaleDateString()}</div>
                </div>

                {/* View mode */}
                {!editMode ? (
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{homeTeam ? getFlagEmoji(homeTeam.code) : '🏳'}</span>
                      <span className="font-medium text-sm text-[var(--text-primary)]">{homeTeam?.name || '—'}</span>
                    </div>
                    <span className="text-[var(--text-secondary)] font-display text-sm">vs</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{awayTeam ? getFlagEmoji(awayTeam.code) : '🏳'}</span>
                      <span className="font-medium text-sm text-[var(--text-primary)]">{awayTeam?.name || '—'}</span>
                    </div>
                  </div>
                ) : (
                  /* Edit mode */
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`flex-1 ${homeIsDup ? 'ring-2 ring-red-400 rounded-lg' : ''}`}>
                      <TeamSelect
                        value={sel.homeTeamId}
                        onChange={(v) => setHome(slot.matchNumber, v)}
                        teams={teams}
                        excludeId={sel.awayTeamId}
                      />
                    </div>
                    <span className="text-[var(--text-secondary)] font-display text-sm flex-shrink-0">vs</span>
                    <div className={`flex-1 ${awayIsDup ? 'ring-2 ring-red-400 rounded-lg' : ''}`}>
                      <TeamSelect
                        value={sel.awayTeamId}
                        onChange={(v) => setAway(slot.matchNumber, v)}
                        teams={teams}
                        excludeId={sel.homeTeamId}
                      />
                    </div>
                  </div>
                )}

                {/* Status indicator */}
                <div className="flex-shrink-0 w-6 text-center">
                  {!editMode ? (
                    <span className="text-green-500 text-sm">✓</span>
                  ) : sel.homeTeamId && sel.awayTeamId && !homeIsDup && !awayIsDup ? (
                    <span className="text-green-500 text-sm">✓</span>
                  ) : (
                    <span className="text-[var(--text-secondary)] text-sm">○</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom save button */}
      {editMode && (
        <div className="mt-6 flex justify-end gap-3">
          {existing && (
            <button onClick={handleCancelEdit} className="btn-secondary">
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !allFilled || duplicates.size > 0}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? <Spinner size="sm" /> : '💾'}
            Save Round of 32
          </button>
        </div>
      )}
    </div>
  );
}