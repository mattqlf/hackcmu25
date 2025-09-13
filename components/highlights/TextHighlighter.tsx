'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { HighlightPopover } from './HighlightPopover';
import { serializeRange, deserializeRange, getRangeBounds, type SerializedRange } from '@/lib/highlights/rangeUtils';
import { createSidenote, getSidenotesForPage, subscribeSidenotes, type FullSidenote } from '@/lib/supabase/sidenotes';

interface TextHighlighterProps {
  children: React.ReactNode;
  pageUrl: string;
  onSidenoteCreate?: (sidenote: FullSidenote) => void;
  onSidenoteUpdate?: (sidenote: FullSidenote) => void;
  onSidenoteDelete?: (id: string) => void;
  className?: string;
}

interface PopoverState {
  visible: boolean;
  position: { x: number; y: number };
  range: Range | null;
}

export function TextHighlighter({
  children,
  pageUrl,
  onSidenoteCreate,
  onSidenoteUpdate,
  onSidenoteDelete,
  className = ''
}: TextHighlighterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [popover, setPopover] = useState<PopoverState>({
    visible: false,
    position: { x: 0, y: 0 },
    range: null
  });
  const [sidenotes, setSidenotes] = useState<FullSidenote[]>([]);
  const [highlightElements, setHighlightElements] = useState<Set<Element>>(new Set());

  // Load existing sidenotes on mount
  useEffect(() => {
    loadSidenotes();
  }, [pageUrl]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeSidenotes(
      pageUrl,
      (newSidenote) => {
        setSidenotes(prev => [...prev, newSidenote]);
        renderHighlight(newSidenote);
        onSidenoteCreate?.(newSidenote);
      },
      (updatedSidenote) => {
        setSidenotes(prev =>
          prev.map(s => s.id === updatedSidenote.id ? { ...s, ...updatedSidenote } : s)
        );
        onSidenoteUpdate?.(updatedSidenote as FullSidenote);
      },
      (deletedId) => {
        setSidenotes(prev => prev.filter(s => s.id !== deletedId));
        removeHighlight(deletedId);
        onSidenoteDelete?.(deletedId);
      }
    );

    return unsubscribe;
  }, [pageUrl]);

  // Render highlights when sidenotes change
  useEffect(() => {
    renderAllHighlights();
  }, [sidenotes]);

  const loadSidenotes = async () => {
    const data = await getSidenotesForPage(pageUrl);
    setSidenotes(data);
  };

  const handleMouseUp = useCallback((_event: MouseEvent) => {
    if (!containerRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.toString().trim().length === 0) {
      setPopover(prev => ({ ...prev, visible: false }));
      return;
    }

    const range = selection.getRangeAt(0);

    // Check if selection is within our container
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      setPopover(prev => ({ ...prev, visible: false }));
      return;
    }

    // Don't show popover if selecting existing highlights
    const rangeBounds = getRangeBounds(range);
    const elementsInRange = document.elementsFromPoint(
      rangeBounds.left + rangeBounds.width / 2,
      rangeBounds.top + rangeBounds.height / 2
    );

    const hasHighlight = elementsInRange.some(el =>
      el.classList.contains('text-highlight') || el.closest('.text-highlight')
    );

    if (hasHighlight) {
      setPopover(prev => ({ ...prev, visible: false }));
      return;
    }

    const selectionBounds = selection.getRangeAt(0).getBoundingClientRect();
    setPopover({
      visible: true,
      position: {
        x: selectionBounds.left + selectionBounds.width / 2,
        y: selectionBounds.top
      },
      range: range.cloneRange()
    });
  }, []);

  const handleAddNote = async () => {
    if (!popover.range || !containerRef.current) return;

    const content = prompt('Enter your note:');
    if (!content) return;

    try {
      const serializedRange = serializeRange(popover.range, containerRef.current);
      const newSidenote = await createSidenote(content, serializedRange, pageUrl);

      if (newSidenote) {
        // Clear selection
        window.getSelection()?.removeAllRanges();

        // The real-time subscription will handle adding to state and rendering
      } else {
        alert('Failed to create sidenote. Please try again.');
      }
    } catch (error) {
      console.error('Error creating sidenote:', error);
      alert('Failed to create sidenote. Please try again.');
    }
  };

  const renderAllHighlights = () => {
    if (!containerRef.current) return;

    // Clear existing highlights
    highlightElements.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el);
        parent.normalize();
      }
    });
    setHighlightElements(new Set());

    // Render all highlights
    sidenotes.forEach(sidenote => {
      renderHighlight(sidenote);
    });
  };

  const renderHighlight = (sidenote: FullSidenote) => {
    if (!containerRef.current || !sidenote.highlights[0]) return;

    const highlight = sidenote.highlights[0];
    const serializedRange: SerializedRange = {
      startContainerPath: highlight.start_container_path,
      startOffset: highlight.start_offset,
      endContainerPath: highlight.end_container_path,
      endOffset: highlight.end_offset,
      text: highlight.highlighted_text,
      isRelative: true
    };

    const range = deserializeRange(serializedRange, containerRef.current);
    if (!range) return;

    try {
      // Create highlight wrapper
      const highlightSpan = document.createElement('span');
      highlightSpan.className = 'text-highlight bg-yellow-200 cursor-pointer rounded-sm px-1 transition-colors hover:bg-yellow-300';
      highlightSpan.setAttribute('data-sidenote-id', sidenote.id);
      highlightSpan.title = `Note: ${sidenote.content}`;

      // Add click handler
      highlightSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        // TODO: Open sidenote in sidebar or modal
        alert(`Sidenote: ${sidenote.content}`);
      });

      range.surroundContents(highlightSpan);
      setHighlightElements(prev => new Set([...prev, highlightSpan]));
    } catch (error) {
      console.error('Error rendering highlight:', error);
    }
  };

  const removeHighlight = (sidenoteId: string) => {
    const highlightEl = containerRef.current?.querySelector(`[data-sidenote-id="${sidenoteId}"]`);
    if (highlightEl) {
      const parent = highlightEl.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(highlightEl.textContent || ''), highlightEl);
        parent.normalize();
      }
      setHighlightElements(prev => {
        const newSet = new Set(prev);
        newSet.delete(highlightEl);
        return newSet;
      });
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseUp]);

  return (
    <>
      <div
        ref={containerRef}
        className={`relative ${className}`}
        style={{ userSelect: 'text' }}
      >
        {children}
      </div>

      <HighlightPopover
        visible={popover.visible}
        position={popover.position}
        onAddNote={handleAddNote}
        onClose={() => setPopover(prev => ({ ...prev, visible: false }))}
      />
    </>
  );
}