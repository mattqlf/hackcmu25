'use client';

import React, { useState } from 'react';
import { Vote } from '@/lib/supabase/sidenotes';
import { cn } from '@/lib/utils';

interface VoteButtonsProps {
  upvotes: number;
  downvotes: number;
  netVotes: number;
  userVote?: Vote | null;
  onVote: (voteType: -1 | 1) => Promise<boolean>;
  disabled?: boolean;
  size?: 'sm' | 'md';
  orientation?: 'horizontal' | 'vertical';
}

export function VoteButtons({
  upvotes,
  downvotes,
  netVotes,
  userVote,
  onVote,
  disabled = false,
  size = 'sm',
  orientation = 'horizontal'
}: VoteButtonsProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Ensure we have valid numbers
  const safeUpvotes = upvotes ?? 0;
  const safeDownvotes = downvotes ?? 0;
  const safeNetVotes = netVotes ?? 0;

  const handleVote = async (voteType: -1 | 1) => {
    if (isLoading || disabled) return;

    setIsLoading(true);
    try {
      await onVote(voteType);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: {
      button: 'w-6 h-6 text-xs',
      icon: 'w-3 h-3',
      text: 'text-xs'
    },
    md: {
      button: 'w-8 h-8 text-sm',
      icon: 'w-4 h-4',
      text: 'text-sm'
    }
  };

  const currentSize = sizeClasses[size];

  const upvoteActive = userVote?.vote_type === 1;
  const downvoteActive = userVote?.vote_type === -1;

  if (orientation === 'vertical') {
    return (
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={() => handleVote(1)}
          disabled={isLoading || disabled}
          className={cn(
            'flex items-center justify-center rounded transition-colors select-none',
            currentSize.button,
            upvoteActive
              ? 'bg-green-100 hover:bg-green-200'
              : 'hover:bg-slate-100',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          title="Upvote"
        >
          <span className={cn(currentSize.text, upvoteActive ? 'filter grayscale-0' : 'filter grayscale hover:grayscale-0')}>
            👍
          </span>
        </button>

        <span className={cn(
          'font-medium text-center min-w-[1.5rem]',
          currentSize.text,
          safeNetVotes > 0 ? 'text-green-600' : safeNetVotes < 0 ? 'text-red-600' : 'text-slate-600'
        )}>
          {safeNetVotes}
        </span>

        <button
          onClick={() => handleVote(-1)}
          disabled={isLoading || disabled}
          className={cn(
            'flex items-center justify-center rounded transition-colors select-none',
            currentSize.button,
            downvoteActive
              ? 'bg-red-100 hover:bg-red-200'
              : 'hover:bg-slate-100',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          title="Downvote"
        >
          <span className={cn(currentSize.text, downvoteActive ? 'filter grayscale-0' : 'filter grayscale hover:grayscale-0')}>
            👎
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleVote(1)}
        disabled={isLoading || disabled}
        className={cn(
          'flex items-center justify-center rounded transition-colors select-none',
          currentSize.button,
          upvoteActive
            ? 'bg-green-100 hover:bg-green-200'
            : 'hover:bg-slate-100',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        title="Upvote"
      >
        <span className={cn(currentSize.text, upvoteActive ? 'filter grayscale-0' : 'filter grayscale hover:grayscale-0')}>
          👍
        </span>
      </button>

      <span className={cn(
        'font-medium text-center min-w-[1.5rem]',
        currentSize.text,
        safeNetVotes > 0 ? 'text-green-600' : safeNetVotes < 0 ? 'text-red-600' : 'text-slate-600'
      )}>
        {safeNetVotes}
      </span>

      <button
        onClick={() => handleVote(-1)}
        disabled={isLoading || disabled}
        className={cn(
          'flex items-center justify-center rounded transition-colors select-none',
          currentSize.button,
          downvoteActive
            ? 'bg-red-100 hover:bg-red-200'
            : 'hover:bg-slate-100',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        title="Downvote"
      >
        <span className={cn(currentSize.text, downvoteActive ? 'filter grayscale-0' : 'filter grayscale hover:grayscale-0')}>
          👎
        </span>
      </button>
    </div>
  );
}