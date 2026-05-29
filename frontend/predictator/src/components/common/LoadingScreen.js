import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <div className="text-center animate-fade-in">
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center text-white text-3xl mb-4 mx-auto animate-pulse-slow">
          ⚽
        </div>
        <p className="font-display text-2xl text-[var(--text-primary)] tracking-wider">PREDICTATOR</p>
        <p className="text-[var(--text-secondary)] text-sm mt-2">Loading...</p>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="skeleton h-4 w-24 rounded" />
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="skeleton w-10 h-10 rounded-full" />
          <div className="skeleton h-4 w-20 rounded" />
        </div>
        <div className="skeleton h-8 w-16 rounded-lg" />
        <div className="flex items-center gap-3 flex-row-reverse">
          <div className="skeleton w-10 h-10 rounded-full" />
          <div className="skeleton h-4 w-20 rounded" />
        </div>
      </div>
      <div className="skeleton h-3 w-32 rounded mx-auto" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-3 px-4">
      <div className="skeleton h-4 w-6 rounded" />
      <div className="skeleton w-9 h-9 rounded-full" />
      <div className="skeleton h-4 w-32 rounded" />
      <div className="skeleton h-4 w-16 rounded ml-auto" />
    </div>
  );
}

export function Spinner({ size = 'md' }) {
  const sizeMap = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={`${sizeMap[size]} border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin`} />
  );
}