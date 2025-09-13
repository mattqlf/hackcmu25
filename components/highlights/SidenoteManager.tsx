'use client';

import React from 'react';
import { IntegratedTextHighlighter } from './IntegratedTextHighlighter';

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
    <div className={`max-w-6xl mx-auto ${className}`}>
      <IntegratedTextHighlighter
        pageUrl={pageUrl}
        docId={docId}
        className="pr-80" // Leave space for sidenotes
      >
        {children}
      </IntegratedTextHighlighter>
    </div>
  );
}