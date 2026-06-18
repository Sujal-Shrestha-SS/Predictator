import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import FixtureCard from '../components/fixtures/FixtureCard';
import { SkeletonCard } from '../components/common/LoadingScreen';

const STAGES = [
  { value: '', label: 'All Stages' },
  { value: 'group_stage', label: 'Group Stage' },
  { value: 'round_of_32', label: 'Round of 32' },
  { value: 'round_of_16', label: 'Round of 16' },
  { value: 'quarterfinal', label: 'Quarterfinals' },
  { value: 'semifinal', label: 'Semifinals' },
  { value: 'third_place', label: 'Third Place' },
  { value: 'final', label: 'Final' },
];

const STATUSES = [
  { value: '', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
];

const GROUPS = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export default function FixturesPage() {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState('');
  const [status, setStatus] = useState('');
  const [group, setGroup] = useState('');
  const [pagination, setPagination] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get('page')) || 1;

  const setPage = (newPage) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);

      if (newPage <= 1) {
        params.delete('page');
      } else {
        params.set('page', String(newPage));
      }

      return params;
    });
  };

  const fetchFixtures = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '12',
      });

      if (stage) params.set('stage', stage);
      if (status) params.set('status', status);
      if (group) params.set('group', group);

      const res = await api.get(`/fixtures?${params.toString()}`);

      setFixtures(res.data.fixtures || []);
      setPagination(res.data.pagination || null);
    } catch (err) {
      console.error('Failed to fetch fixtures:', err);
    } finally {
      setLoading(false);
    }
  }, [page, stage, status, group]);

  useEffect(() => {
    fetchFixtures();
  }, [fetchFixtures]);

  const handleStageChange = (value) => {
    setStage(value);
    setPage(1);
  };

  const handleStatusChange = (value) => {
    setStatus(value);
    setPage(1);
  };

  const handleGroupChange = (value) => {
    setGroup(value);
    setPage(1);
  };

  const FilterBtn = ({ label, value, current, onChange }) => (
    <button
      onClick={() => onChange(value)}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        current === value
          ? 'bg-primary-600 text-white'
          : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display text-4xl text-[var(--text-primary)] mb-2">
          FIXTURES
        </h1>
        <p className="text-[var(--text-secondary)]">
          All FIFA World Cup 2026 matches
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 space-y-3">
        <div>
          <p className="text-xs text-[var(--text-secondary)] mb-2 font-medium">
            STAGE
          </p>

          <div className="flex flex-wrap gap-2">
            {STAGES.map((s) => (
              <FilterBtn
                key={s.value}
                {...s}
                current={stage}
                onChange={handleStageChange}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-6 flex-wrap">
          <div>
            <p className="text-xs text-[var(--text-secondary)] mb-2 font-medium">
              STATUS
            </p>

            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <FilterBtn
                  key={s.value}
                  {...s}
                  current={status}
                  onChange={handleStatusChange}
                />
              ))}
            </div>
          </div>

          {(stage === 'group_stage' || !stage) && (
            <div>
              <p className="text-xs text-[var(--text-secondary)] mb-2 font-medium">
                GROUP
              </p>

              <div className="flex flex-wrap gap-2">
                {GROUPS.map((g) => (
                  <FilterBtn
                    key={g || 'all'}
                    label={g || 'All'}
                    value={g}
                    current={group}
                    onChange={handleGroupChange}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixtures */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : fixtures.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-5xl mb-4">📅</div>

          <h3 className="font-display text-2xl text-[var(--text-primary)] mb-2">
            No Fixtures Found
          </h3>

          <p className="text-[var(--text-secondary)]">
            Try adjusting your filters
          </p>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {fixtures.map((fixture) => (
              <FixtureCard key={fixture._id} fixture={fixture} />
            ))}
          </div>

          {/* Pagination */}
          {pagination?.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="btn-secondary disabled:opacity-40"
              >
                ← Prev
              </button>

              <span className="text-sm text-[var(--text-secondary)] px-4">
                Page {page} of {pagination.pages}
              </span>

              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage(page + 1)}
                className="btn-secondary disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

