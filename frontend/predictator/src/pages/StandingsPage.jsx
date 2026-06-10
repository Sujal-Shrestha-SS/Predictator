import  { useState, useEffect } from 'react';
import api from '../services/api';
import { Spinner } from '../components/common/LoadingScreen';

function GroupTable({ group, standings }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 flex items-center gap-2">
        <span className="font-display text-xl text-white tracking-wider">GROUP {group}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              <th className="px-3 py-2 text-left w-6">#</th>
              <th className="px-3 py-2 text-left">Team</th>
              <th className="px-3 py-2 text-center">P</th>
              <th className="px-3 py-2 text-center">W</th>
              <th className="px-3 py-2 text-center">D</th>
              <th className="px-3 py-2 text-center">L</th>
              <th className="px-3 py-2 text-center">GF</th>
              <th className="px-3 py-2 text-center">GA</th>
              <th className="px-3 py-2 text-center">GD</th>
              <th className="px-3 py-2 text-center font-bold">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {standings.map((s, i) => (
              <tr
                key={s._id}
                className={`transition-colors hover:bg-[var(--bg-secondary)] `}
              >
                <td className={`px-3 py-2.5 text-[var(--text-secondary)] text-xs font-mono ${i < 2 ? 'border-l-4 border-l-green-500' : i === 2
      ? 'border-l-4 border-l-yellow-500' : ''}`}>{i + 1}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {s.team?.flagUrl ? (
                      <img src={s.team.flagUrl} alt={s.team.name}
                        className="w-6 h-6 rounded-full object-cover border border-[var(--border)]"
                        onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <span className="text-sm">🏳️</span>
                    )}
                    <span className="font-medium text-[var(--text-primary)] hidden sm:block">{s.team?.name}</span>
                    <span className="font-medium text-[var(--text-primary)] sm:hidden">{s.team?.code || s.team?.shortName}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-center text-[var(--text-secondary)]">{s.played}</td>
                <td className="px-3 py-2.5 text-center text-green-500 font-medium">{s.won}</td>
                <td className="px-3 py-2.5 text-center text-[var(--text-secondary)]">{s.drawn}</td>
                <td className="px-3 py-2.5 text-center text-red-400">{s.lost}</td>
                <td className="px-3 py-2.5 text-center text-[var(--text-secondary)]">{s.goalsFor}</td>
                <td className="px-3 py-2.5 text-center text-[var(--text-secondary)]">{s.goalsAgainst}</td>
                <td className="px-3 py-2.5 text-center text-[var(--text-secondary)]">
                  {s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}
                </td>
                <td className="px-3 py-2.5 text-center font-display text-lg text-primary-600 dark:text-primary-400">
                  {s.points}
                </td>
              </tr>
            ))}
            {standings.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-[var(--text-secondary)] text-sm">
                  No matches played yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 bg-[var(--bg-secondary)] border-t border-[var(--border)]">
        <div className="flex flex-wrap gap-4 text-xs text-[var(--text-secondary)]">
          <span className="flex items-center">
            <span className="w-3 h-3 bg-green-500 rounded-sm mr-1" />
            Qualified for Round of 32
          </span>

          <span className="flex items-center">
            <span className="w-3 h-3 bg-yellow-500 rounded-sm mr-1" />
            Still alive
          </span>
        </div>
      </div>
    </div>
  );
}

function BestThirdPlacedTable({ teams }) {
  return (
    <div className="card overflow-hidden mb-8">
      <div className="px-4 py-3 bg-gradient-to-r from-yellow-600 to-yellow-700">
        <span className="font-display text-xl text-white tracking-wider">
          BEST THIRD-PLACED TEAMS
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              <th className="px-3 py-2 text-left">Rank</th>
              <th className="px-3 py-2 text-left">Team</th>
              <th className="px-3 py-2 text-center">Group</th>
              <th className="px-3 py-2 text-center">Pts</th>
              <th className="px-3 py-2 text-center">GD</th>
              <th className="px-3 py-2 text-center">GF</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border)]">
            {teams.map((team, index) => (
              <tr
                key={team._id}
                className="hover:bg-[var(--bg-secondary)]"
              >
                <td className="px-3 py-2.5 font-medium text-green-500">
                  {index + 1}
                </td>

                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {team.team?.flagUrl && (
                      <img
                        src={team.team.flagUrl}
                        alt={team.team.name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    )}

                    <span>{team.team?.name}</span>
                  </div>
                </td>

                <td className="px-3 py-2.5 text-center">
                  {team.group}
                </td>

                <td className="px-3 py-2.5 text-center font-bold">
                  {team.points}
                </td>

                <td className="px-3 py-2.5 text-center">
                  {team.goalDifference > 0
                    ? `+${team.goalDifference}`
                    : team.goalDifference}
                </td>

                <td className="px-3 py-2.5 text-center">
                  {team.goalsFor}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 bg-[var(--bg-secondary)] border-t border-[var(--border)]">
        <span className="text-xs text-[var(--text-secondary)]">
          Top 8 third-placed teams qualify for the Round of 32
        </span>
      </div>
    </div>
  );
}

export default function StandingsPage() {
  const [standings, setStandings] = useState({});
  const [bestThirdPlacedTeams, setBestThirdPlacedTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/standings')
    .then((res) => {
      setStandings(res.data.standings || {});
      setBestThirdPlacedTeams(
        res.data.bestThirdPlacedTeams || []
      );
    })
    .finally(() => setLoading(false));
  }, []);

  const groups = Object.keys(standings).sort();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display text-4xl text-[var(--text-primary)] mb-2">GROUP STANDINGS</h1>
        <p className="text-[var(--text-secondary)]">FIFA World Cup 2026 · 12 Groups · 48 Teams</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : groups.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="font-display text-2xl text-[var(--text-primary)] mb-2">No Standings Yet</h3>
          <p className="text-[var(--text-secondary)]">Standings will appear once the group stage begins</p>
        </div>
      ) : (
            <>
        <div className="grid lg:grid-cols-2 gap-6">
          {groups.map((group) => (
            <GroupTable
              key={group}
              group={group}
              standings={standings[group]}
            />
          ))}
        </div>

        {bestThirdPlacedTeams.length > 0 && (
          <div className="mt-8">
            <BestThirdPlacedTable
              teams={bestThirdPlacedTeams}
            />
          </div>
        )}
      </>
      )}
    </div>
  );
}