
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center animate-fade-in">
        <div className="font-display text-9xl text-primary-200 dark:text-primary-900 mb-4">404</div>
        <div className="text-6xl mb-6">⚽</div>
        <h1 className="font-display text-3xl text-[var(--text-primary)] mb-3">OFFSIDE!</h1>
        <p className="text-[var(--text-secondary)] mb-8 max-w-sm mx-auto">
          Looks like this page was caught offside. The referee has blown the whistle.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/" className="btn-primary">🏠 Back to Home</Link>
          <Link to="/fixtures" className="btn-secondary">📅 View Fixtures</Link>
        </div>
      </div>
    </div>
  );
}