'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Type, Eye } from 'lucide-react';
import { renderLatex, renderMarkdown } from '@/lib/utils/latexRenderer';

interface MinimalEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string) => void;
  initialContent?: string;
  title?: string;
  placeholder?: string;
}

export function MinimalEditor({
  isOpen,
  onClose,
  onSave,
  initialContent = '',
  title = 'Edit Note',
  placeholder = 'Enter your note...'
}: MinimalEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(initialContent);
    setHasUnsavedChanges(false);
  }, [initialContent]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmClose = confirm('You have unsaved changes. Are you sure you want to close without saving?');
      if (!confirmClose) return;
    }
    setHasUnsavedChanges(false);
    setIsPreview(false);
    onClose();
  };

  const handleSave = () => {
    onSave(content);
    setHasUnsavedChanges(false);
    setIsPreview(false);
    onClose();
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    setHasUnsavedChanges(value !== initialContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSave();
    }
  };

  // Enhanced markdown and LaTeX preview rendering
  const renderPreview = (text: string) => {
    return text
      .split('\n')
      .map((line, i) => {
        // Headers
        if (line.startsWith('# ')) {
          return <h1 key={i} className="text-lg font-bold mb-2 text-slate-900">{line.slice(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-base font-semibold mb-2 text-slate-900">{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-sm font-medium mb-1 text-slate-900">{line.slice(4)}</h3>;
        }

        // Code blocks
        if (line.startsWith('```')) {
          return <div key={i} className="bg-slate-100 p-2 rounded text-xs font-mono my-2 border"></div>;
        }

        // Lists
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={i} className="flex items-start gap-2 mb-1">
              <span className="text-slate-400 mt-1">•</span>
              <span className="text-slate-700 text-sm">{line.slice(2)}</span>
            </div>
          );
        }

        if (/^\d+\.\s/.test(line)) {
          const match = line.match(/^(\d+)\.\s(.*)$/);
          return (
            <div key={i} className="flex items-start gap-2 mb-1">
              <span className="text-slate-400 mt-1 text-xs">{match?.[1]}.</span>
              <span className="text-slate-700 text-sm">{match?.[2]}</span>
            </div>
          );
        }

        if (line.trim() === '') {
          return <br key={i} />;
        }

        // Process markdown first, then LaTeX
        let processedLine = renderMarkdown(line);
        processedLine = renderLatex(processedLine);

        return (
          <p
            key={i}
            className="mb-1 text-slate-700 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: processedLine }}
          />
        );
      });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - minimal overlay without blur to keep paper visible */}
      <div
        className="absolute inset-0 bg-black/10"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="glass-card-strong w-full max-w-2xl max-h-[80vh] flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-300/20">
          <div className="flex items-center gap-3">
            <h2 className="section-subheader mb-0">{title}</h2>
            {hasUnsavedChanges && (
              <span className="w-2 h-2 bg-yellow-500 rounded-full" title="Unsaved changes" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPreview(!isPreview)}
              className={`glass-button-icon-sm ${isPreview ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              title={isPreview ? 'Edit' : 'Preview'}
            >
              {isPreview ? <Type className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>

            <button
              onClick={handleClose}
              className="glass-button-icon-sm text-slate-500 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 min-h-0">
          {isPreview ? (
            <div className="h-full overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                {content.trim() ? renderPreview(content) : (
                  <p className="body-text-muted italic">Nothing to preview...</p>
                )}
              </div>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`${placeholder}

Supports formatting:
# Heading 1, ## Heading 2
**bold** *italic* \`code\`
- bullet points
1. numbered lists
[link text](url)
$inline math$ $$display math$$`}
              className="w-full h-full bg-transparent border-none outline-none resize-none body-text text-slate-900 placeholder:text-slate-500"
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-300/20">
          <div className="text-xs body-text-muted">
            {isPreview ? 'Preview mode' : `${content.length} characters • ⌘+Enter to save • Esc to close`}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="glass-button-sm text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!content.trim()}
              className="glass-button-sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}