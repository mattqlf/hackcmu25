'use client';

import React from 'react';
import { ModernTextHighlighter } from './ModernTextHighlighter';

interface SidenoteManagerProps {
  children: React.ReactNode;
  pageUrl: string;
  docId?: string;
  className?: string;
}

export function SidenoteManager({
  children,
  pageUrl,
  docId = 'article',
  className = ''
}: SidenoteManagerProps) {
  return (
    <div className={className}>
      <ModernTextHighlighter
        pageUrl={pageUrl}
        docId={docId}
        className="max-w-4xl mx-auto px-6 py-8" // Centered content with padding
      >
        {children}
      </ModernTextHighlighter>
    </div>
  );
}