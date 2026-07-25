import React from 'react';

interface LoadingSkeletonProps {
  rows?: number;
}

export function LoadingSkeleton({ rows = 3 }: LoadingSkeletonProps) {
  return (
    <div className="space-y-4 w-full">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center animate-pulse">
          <div className="h-10 w-10 bg-white/[0.04] rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-white/[0.04] rounded w-1/3" />
            <div className="h-3 bg-white/[0.02] rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
