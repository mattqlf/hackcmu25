'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, GripHorizontal } from 'lucide-react';

interface IframeEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string) => void;
  initialContent?: string;
  title?: string;
  placeholder?: string;
}

export function IframeEditor({
  isOpen,
  onClose,
  onSave,
  initialContent = '',
  title = 'Edit Note',
  placeholder = 'Enter your note...'
}: IframeEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [content, setContent] = useState(initialContent);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editorSize, setEditorSize] = useState({ width: 700, height: 400 });
  const [editorPosition, setEditorPosition] = useState({ x: 20, y: 100 }); // x from left, y from top in pixels
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ width: 0, height: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setContent(initialContent);
    setHasUnsavedChanges(false);
  }, [initialContent]);

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmClose = confirm('You have unsaved changes. Are you sure you want to close without saving?');
      if (!confirmClose) return;
    }
    setHasUnsavedChanges(false);
    onClose();
  };

  // Handle dragging
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (modalRef.current) {
      setIsDragging(true);
      const rect = modalRef.current.getBoundingClientRect();
      dragStartPos.current = {
        x: e.clientX - editorPosition.x,
        y: e.clientY - editorPosition.y
      };
    }
    e.preventDefault();
    e.stopPropagation();
  }, [editorPosition]);

  // Handle resizing
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    resizeStartPos.current = { x: e.clientX, y: e.clientY };
    resizeStartSize.current = { ...editorSize };
    e.preventDefault();
    e.stopPropagation();
  }, [editorSize]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = Math.max(0, Math.min(window.innerWidth - editorSize.width, e.clientX - dragStartPos.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - editorSize.height, e.clientY - dragStartPos.current.y));
      setEditorPosition({ x: newX, y: newY });
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStartPos.current.x;
      const deltaY = e.clientY - resizeStartPos.current.y;
      const newWidth = Math.max(400, Math.min(window.innerWidth - 40, resizeStartSize.current.width + deltaX));
      const newHeight = Math.max(300, Math.min(window.innerHeight - 40, resizeStartSize.current.height + deltaY));
      setEditorSize({ width: newWidth, height: newHeight });

      // Keep modal in bounds when resizing
      const maxX = window.innerWidth - newWidth;
      const maxY = window.innerHeight - newHeight;
      setEditorPosition(prev => ({
        x: Math.min(prev.x, maxX),
        y: Math.min(prev.y, maxY)
      }));
    }
  }, [isDragging, isResizing, editorSize]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  // Add resize and drag event listeners
  useEffect(() => {
    if (isResizing || isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (isOpen && iframeRef.current) {
      // Create the HTML content for the iframe
      const iframeDoc = iframeRef.current.contentDocument;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Note Editor</title>
              <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
              <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
              <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
              <style>
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }

                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif;
                  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%);
                  color: #1e293b;
                  padding: 20px;
                  line-height: 1.5;
                  min-height: 100vh;
                }

                .editor-container {
                  width: 100%;
                  height: 100vh;
                  display: flex;
                  flex-direction: column;
                }

                .editor-content {
                  flex: 1;
                  display: flex;
                  gap: 16px;
                }

                .editor-pane {
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                  background: rgba(255, 255, 255, 0.1);
                  backdrop-filter: blur(10px);
                  border-radius: 12px;
                  padding: 16px;
                }

                .preview-pane {
                  flex: 1;
                  border-left: 1px solid rgba(255, 255, 255, 0.2);
                  padding-left: 16px;
                  display: flex;
                  flex-direction: column;
                  background: rgba(255, 255, 255, 0.05);
                  backdrop-filter: blur(8px);
                  border-radius: 12px;
                  padding: 16px;
                }

                .preview-header {
                  font-size: 14px;
                  font-weight: 600;
                  color: #374151;
                  margin-bottom: 8px;
                  padding-bottom: 8px;
                  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
                }

                .preview-content {
                  flex: 1;
                  overflow-y: auto;
                  font-size: 14px;
                  line-height: 1.5;
                  color: #475569;
                  padding: 12px;
                  background: rgba(255, 255, 255, 0.2);
                  border: 1px solid rgba(255, 255, 255, 0.3);
                  border-radius: 8px;
                  backdrop-filter: blur(8px);
                }

                .editor-label {
                  font-size: 14px;
                  font-weight: 600;
                  color: #374151;
                  margin-bottom: 8px;
                  letter-spacing: -0.025em;
                }

                .editor-header {
                  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                  padding-bottom: 16px;
                  margin-bottom: 16px;
                }

                .editor-title {
                  font-size: 18px;
                  font-weight: 600;
                  color: #1e293b;
                  letter-spacing: -0.05em;
                }

                .editor-textarea {
                  flex: 1;
                  width: 100%;
                  border: none;
                  outline: none;
                  resize: none;
                  font-family: inherit;
                  font-size: 14px;
                  line-height: 1.5;
                  padding: 0;
                  background: transparent;
                  color: #1e293b;
                }

                .editor-textarea::placeholder {
                  color: #64748b;
                }

                .editor-textarea:focus {
                  outline: none;
                }

                .editor-footer {
                  border-top: 1px solid rgba(255, 255, 255, 0.2);
                  padding-top: 16px;
                  margin-top: 16px;
                  display: flex;
                  gap: 8px;
                  justify-content: flex-end;
                }

                .btn {
                  padding: 8px 16px;
                  border-radius: 8px;
                  font-size: 14px;
                  font-weight: 500;
                  cursor: pointer;
                  border: 1px solid transparent;
                  transition: all 0.2s ease;
                  backdrop-filter: blur(8px);
                  letter-spacing: -0.025em;
                }

                .btn-primary {
                  background: rgba(59, 130, 246, 0.8);
                  color: white;
                  border-color: rgba(59, 130, 246, 0.3);
                }

                .btn-primary:hover {
                  background: rgba(37, 99, 235, 0.9);
                  border-color: rgba(37, 99, 235, 0.4);
                }

                .btn-secondary {
                  background: rgba(255, 255, 255, 0.3);
                  color: #374151;
                  border-color: rgba(255, 255, 255, 0.4);
                }

                .btn-secondary:hover {
                  background: rgba(255, 255, 255, 0.4);
                  border-color: rgba(255, 255, 255, 0.5);
                }

                .char-counter {
                  font-size: 12px;
                  color: #64748b;
                  margin-top: 8px;
                }
              </style>
            </head>
            <body>
              <div class="editor-container">
                <div class="editor-header">
                  <div class="editor-title">${title}</div>
                </div>

                <div class="editor-content">
                  <div class="editor-pane">
                    <div class="editor-label">Editor (Markdown + LaTeX)</div>
                    <textarea
                      class="editor-textarea"
                      placeholder="${placeholder}

Use LaTeX for math: $inline$ or $$display$$
Examples:
- Inline: The equation $E = mc^2$ is famous
- Display: $$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$"
                      id="content-textarea"
                    >${content}</textarea>
                    <div class="char-counter">
                      <span id="char-count">0</span> characters
                    </div>
                  </div>

                  <div class="preview-pane">
                    <div class="preview-header">Preview</div>
                    <div class="preview-content" id="preview-content">
                      Preview will appear here...
                    </div>
                  </div>
                </div>

                <div class="editor-footer">
                  <button class="btn btn-secondary" id="cancel-btn">Cancel</button>
                  <button class="btn btn-primary" id="save-btn">Save</button>
                </div>
              </div>

              <script>
                const textarea = document.getElementById('content-textarea');
                const charCount = document.getElementById('char-count');
                const saveBtn = document.getElementById('save-btn');
                const cancelBtn = document.getElementById('cancel-btn');
                const previewContent = document.getElementById('preview-content');

                function updateCharCount() {
                  charCount.textContent = textarea.value.length;
                }

                function updatePreview() {
                  const text = textarea.value;
                  if (!text.trim()) {
                    previewContent.innerHTML = '<em style="color: #9ca3af;">Preview will appear here...</em>';
                    return;
                  }

                  // Simple markdown-like processing
                  let html = text
                    .split('\\n').map(line => line + '<br>').join('')
                    .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
                    .replace(/(?<!\\*)\\*([^*]+?)\\*(?!\\*)/g, '<em>$1</em>')
                    .replace(/^#{1,6}\\s(.*)(<br>|$)/gm, (match, content) => {
                      const level = (match.match(/#/g) || []).length;
                      return \`<h\${level} style="margin: 16px 0 8px 0; font-weight: 600; font-size: \${20-level}px;">\${content}</h\${level}><br>\`;
                    })
                    .replace(/^-\\s(.*?)(<br>|$)/gm, '<li style="margin: 2px 0;">$1</li>')
                    .replace(/(<li[^>]*>.*?<\\/li>)+/g, '<ul style="margin: 8px 0; padding-left: 20px;">$&</ul>');

                  previewContent.innerHTML = html;

                  // Render LaTeX after setting HTML
                  setTimeout(() => {
                    if (window.renderMathInElement && typeof window.renderMathInElement === 'function') {
                      try {
                        window.renderMathInElement(previewContent, {
                          delimiters: [
                            {left: '$$', right: '$$', display: true},
                            {left: '$', right: '$', display: false}
                          ],
                          throwOnError: false,
                          strict: false
                        });
                      } catch (e) {
                        console.error('LaTeX rendering error:', e);
                      }
                    } else {
                      console.warn('KaTeX renderMathInElement not available');
                    }
                  }, 10);
                }

                textarea.addEventListener('input', function() {
                  updateCharCount();
                  updatePreview();
                  window.parent.postMessage({ type: 'contentChanged', content: textarea.value }, '*');
                });
                textarea.addEventListener('keydown', function(e) {
                  if (e.key === 'Escape') {
                    window.parent.postMessage({ type: 'cancel' }, '*');
                  }
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    window.parent.postMessage({ type: 'save', content: textarea.value }, '*');
                  }
                });

                saveBtn.addEventListener('click', function() {
                  window.parent.postMessage({ type: 'save', content: textarea.value }, '*');
                });

                cancelBtn.addEventListener('click', function() {
                  window.parent.postMessage({ type: 'cancel' }, '*');
                });

                // Focus the textarea when loaded
                textarea.focus();
                textarea.setSelectionRange(textarea.value.length, textarea.value.length);

                // Initial char count and preview
                updateCharCount();

                // Wait for KaTeX to load then update preview
                function initPreview() {
                  if (window.renderMathInElement && window.katex) {
                    console.log('KaTeX loaded successfully');
                    updatePreview();
                  } else {
                    console.log('Waiting for KaTeX to load...');
                    setTimeout(initPreview, 200);
                  }
                }

                // Also try to load from window.onload
                window.onload = function() {
                  setTimeout(initPreview, 100);
                };

                // Initial load attempt
                setTimeout(initPreview, 100);
              </script>
            </body>
          </html>
        `);
        iframeDoc.close();
      }
    }
  }, [isOpen, content, title, placeholder]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'save') {
        setHasUnsavedChanges(false);
        onSave(event.data.content);
        onClose();
      } else if (event.data.type === 'cancel') {
        handleClose();
      } else if (event.data.type === 'contentChanged') {
        const hasChanges = event.data.content !== initialContent;
        setHasUnsavedChanges(hasChanges);
      }
    };

    if (isOpen) {
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [isOpen, onSave, onClose, initialContent, hasUnsavedChanges]);

  // Handle ESC key globally for the modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Full-screen backdrop behind everything */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        style={{
          zIndex: 9998
        }}
        onClick={handleClose}
      />

      {/* Editor modal that can move anywhere */}
      <div
        ref={modalRef}
        className="glass-card-strong border border-white/30 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          width: `${editorSize.width}px`,
          height: `${editorSize.height}px`,
          position: 'fixed',
          left: `${editorPosition.x}px`,
          top: `${editorPosition.y}px`,
          cursor: isDragging ? 'grabbing' : 'default',
          userSelect: isDragging ? 'none' : 'auto',
          zIndex: 9999,
          pointerEvents: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between p-4 border-b border-white/20 cursor-move select-none bg-white/5"
          onMouseDown={handleDragStart}
        >
          <h2 className="modern-heading text-lg font-semibold text-slate-900 flex items-center gap-2">
            {title}
            {hasUnsavedChanges && (
              <span className="w-2 h-2 bg-yellow-500 rounded-full" title="Unsaved changes" />
            )}
          </h2>
          <button
            onClick={handleClose}
            className="glass-button h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <iframe
          ref={iframeRef}
          className="w-full h-[calc(100%-72px)] border-0"
          title="Note Editor"
          sandbox="allow-scripts allow-same-origin"
        />

        {/* Resize handle */}
        <div
          className="absolute bottom-1 right-1 w-6 h-6 cursor-se-resize hover:bg-white/20 rounded flex items-center justify-center"
          onMouseDown={handleResizeStart}
          style={{ pointerEvents: 'auto' }}
        >
          <GripHorizontal className="w-3 h-3 text-slate-600 rotate-45" />
        </div>
      </div>
    </>
  );
}