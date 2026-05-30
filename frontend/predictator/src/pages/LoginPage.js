import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/common/LoadingScreen';

export default function LoginPage() {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const handleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      await loginWithGoogle(credentialResponse.credential);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Card */}
        <div className="card p-10 text-center">
          {/* Logo */}
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center text-white text-4xl mx-auto mb-6 shadow-lg shadow-primary-500/25">
            ⚽
          </div>
          <h1 className="font-display text-4xl text-[var(--text-primary)] tracking-wider mb-2">
            PREDICTATOR
          </h1>
          <p className="text-[var(--text-secondary)] mb-2">FIFA World Cup 2026</p>
          <p className="text-sm text-[var(--text-secondary)] mb-8">
            Sign in to predict match scores and compete on the leaderboard
          </p>

          {/* Points preview */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { pts: 30, label: 'Exact score', color: 'text-green-500' },
              { pts: 20, label: 'Right winner', color: 'text-blue-500' },
              { pts: 15, label: 'Correct draw', color: 'text-yellow-500' },
            ].map((item) => (
              <div key={item.label} className="bg-[var(--bg-secondary)] rounded-xl p-3">
                <div className={`font-display text-2xl ${item.color}`}>{item.pts}</div>
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>

          {/* Google Login */}
          <div className="flex justify-center">
            {loading ? (
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <Spinner size="sm" /> Signing in...
              </div>
            ) : (
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={() => {}}
                size="large"
                shape="rectangular"
                text="signin_with"
                theme="outline"
              />
            )}
          </div>

          <p className="text-xs text-[var(--text-secondary)] mt-6">
            By signing in, you agree to play fair and predict responsibly 🤝
          </p>
        </div>

        {/* Features */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            { icon: '🔒', label: 'Secure OAuth' },
            { icon: '🌍', label: '48 Teams' },
            { icon: '📊', label: 'Live Rankings' },
          ].map((f) => (
            <div key={f.label} className="text-[var(--text-secondary)] text-sm">
              <div className="text-2xl mb-1">{f.icon}</div>
              {f.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}