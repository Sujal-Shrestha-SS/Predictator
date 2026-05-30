import React from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';

const stageLabelMap = {
  group_stage: 'Group Stage',
};

const TeamDisplay = ({ team, side, score }) => (
  <div className={`flex items-center gap-3 ${side === 'away' ? 'flex-row-reverse' : ''}`}>
    {team?.flagUrl ? (
      <img
        src={team.flagUrl}
        alt={team.name}
        className="w-10 h-10 object-cover rounded-full border border-[var(--border)]"
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    ) : (
      <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-lg">
        🏳️
      </div>
    )}

    <div className={side === 'away' ? 'text-right' : ''}>
      <p className="font-semibold text-[var(--text-primary)] text-sm">
        {team?.shortName || team?.name || 'TBD'}
      </p>
      <p className="text-xs text-[var(--text-secondary)] hidden sm:block">
        {team?.name}
      </p>
    </div>

    {score !== undefined && (
      <span className="font-display text-3xl text-[var(--text-primary)]">
        {score ?? '-'}
      </span>
    )}
  </div>
);

export default function FixtureCard({ fixture, prediction }) {
  const {
    _id,
    homeTeam,
    awayTeam,
    matchDatetime,
    stage,
    group,
  } = fixture;

  const kickoff = new Date(matchDatetime);

  // Live system (95 minutes match duration)
  const matchEnd = new Date(kickoff.getTime() + 95 * 60 * 1000);

  // live clock (updates automatically)
  const [now, setNow] = React.useState(new Date());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000); // update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const isUpcoming = now < kickoff;
  const isLive = now >= kickoff && now < matchEnd;
  const isCompleted = now >= matchEnd;

  // Status badge
  const statusBadge = isLive ? (
    <span className="badge badge-red">LIVE</span>
  ) : isCompleted ? (
    <span className="badge badge-gray">FT</span>
  ) : (
    <span className="badge badge-blue">
      {formatDistanceToNow(kickoff, { addSuffix: true })}
    </span>
  );

  return (
    <Link to={`/fixtures/${_id}`} className="block group">
      <div className="card p-5 transition-all duration-200 hover:shadow-lg">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {stageLabelMap[stage] || stage}
            </span>

            {group && (
              <span className="text-xs font-mono text-primary-500 bg-primary-50 dark:bg-primary-900/20 px-1.5 py-0.5 rounded">
                Group {group}
              </span>
            )}
          </div>

          {statusBadge}
        </div>

        {/* MATCH */}
        <div className="flex items-center justify-between gap-2">

          <TeamDisplay
            team={homeTeam}
            side="home"
            score={isLive || isCompleted ? fixture.result?.homeScore : undefined}
          />

          <div className="flex flex-col items-center min-w-[60px]">

            {isLive ? (
              <span className="text-red-500 font-bold text-sm">LIVE</span>
            ) : isUpcoming ? (
              <>
                <span className="font-display text-xl text-[var(--text-secondary)]">
                  VS
                </span>
                <span className="text-xs text-[var(--text-secondary)] mt-1">
                  {format(kickoff, 'HH:mm')}
                </span>
              </>
            ) : (
              <span className="text-gray-500 font-semibold">FT</span>
            )}

          </div>

          <TeamDisplay
            team={awayTeam}
            side="away"
            score={isLive || isCompleted ? fixture.result?.awayScore : undefined}
          />
        </div>

        {/* FOOTER (PREDICTIONS) */}
        <div className="mt-4 flex items-center justify-between">

          <div className="flex items-center gap-2 flex-shrink-0">

            {isUpcoming && prediction == null && (
              <span className="badge badge-green text-xs">Predict</span>
            )}

            {isUpcoming && prediction == null && (
              <span className="text-xs text-[var(--text-secondary)]">
                Locked
              </span>
            )}

          </div>

        </div>
      </div>
    </Link>
  );
}