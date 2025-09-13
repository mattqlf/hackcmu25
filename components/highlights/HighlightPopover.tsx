'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { MessageSquarePlus, X } from 'lucide-react';

interface HighlightPopoverProps {
  position: { x: number; y: number };
  onAddNote: () => void;
  onClose: () => void;
  visible: boolean;
}

export function HighlightPopover({ position, onAddNote, onClose, visible }: HighlightPopoverProps) {
  const [isVisible, setIsVisible] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible) {
      // Small delay to ensure smooth animation
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [visible]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [visible, onClose]);

  if (!visible) {
    return null;
  }

  // Calculate position to keep popover in viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200), // Assume popover width ~200px
    y: position.y - 60 // Position above the selection
  };

  // If popover would go above viewport, position below
  if (adjustedPosition.y < 10) {
    adjustedPosition.y = position.y + 20;
  }

  return (
    <div
      ref={popoverRef}
      className={`fixed z-50 transition-all duration-200 ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        transform: 'translateX(-50%)'
      }}
    >
      <Card className="p-3 shadow-lg border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onAddNote();
              onClose();
            }}
            className="glass-button-sm flex items-center gap-2"
          >
            <MessageSquarePlus className="w-4 h-4" />
            Add Note
          </button>
          <button
            onClick={onClose}
            className="glass-button-icon-sm text-slate-500 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </Card>
      {/* Arrow pointing to selection */}
      <div
        className="absolute left-1/2 transform -translate-x-1/2 w-3 h-3 bg-background border rotate-45"
        style={{
          top: adjustedPosition.y < position.y ? '-6px' : 'calc(100% - 6px)',
          borderColor: 'hsl(var(--border))'
        }}
      />
    </div>
  );
}