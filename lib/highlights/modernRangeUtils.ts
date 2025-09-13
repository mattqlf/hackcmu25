/**
 * Modern Range Utilities using CSS Custom Highlight API
 *
 * This implementation provides robust text highlighting without DOM manipulation,
 * using the modern CSS Custom Highlight API for better performance and reliability.
 */

export interface SerializedRange {
  /** Unique identifier for this highlight */
  id: string;
  /** Selected text content */
  text: string;
  /** Start position in normalized text */
  startOffset: number;
  /** End position in normalized text */
  endOffset: number;
  /** Context around selection for better matching */
  beforeContext: string;
  afterContext: string;
  /** Container element selector for scoped searching */
  containerSelector?: string;
}

export interface HighlightManager {
  /** Add a new highlight */
  addHighlight(id: string, range: Range): void;
  /** Remove a highlight by ID */
  removeHighlight(id: string): void;
  /** Remove all highlights */
  clearHighlights(): void;
  /** Check if highlights are supported */
  isSupported(): boolean;
  /** Get all active highlight IDs */
  getHighlightIds(): string[];
  /** Set selected highlight */
  setSelectedHighlight(id: string | null): void;
}

/**
 * Creates and manages highlights using CSS Custom Highlight API
 */
class CSSHighlightManager implements HighlightManager {
  private highlights = new Map<string, Highlight>();
  private allRanges = new Set<Range>();
  private globalHighlight: Highlight | null = null;
  private selectedHighlightId: string | null = null;

  isSupported(): boolean {
    return typeof CSS !== 'undefined' && 'highlights' in CSS;
  }

  addHighlight(id: string, range: Range): void {
    if (!this.isSupported()) return;

    // Store the individual highlight
    const highlight = new Highlight(range);
    this.highlights.set(id, highlight);

    // Add to global collection
    this.allRanges.add(range);

    // Update the global highlight with all ranges
    this.updateGlobalHighlight();
  }

  removeHighlight(id: string): void {
    if (!this.isSupported()) return;

    const highlight = this.highlights.get(id);
    if (highlight) {
      // Remove ranges from global collection
      for (const range of highlight) {
        if (range instanceof Range) {
          this.allRanges.delete(range);
        }
      }
      this.highlights.delete(id);
    }

    // Update the global highlight
    this.updateGlobalHighlight();
  }

  clearHighlights(): void {
    if (!this.isSupported()) return;

    this.highlights.clear();
    this.allRanges.clear();

    if (this.globalHighlight) {
      CSS.highlights.delete('sidenote-highlights');
      this.globalHighlight = null;
    }
  }

  private updateGlobalHighlight(): void {
    if (this.globalHighlight) {
      CSS.highlights.delete('sidenote-highlights');
    }

    if (this.allRanges.size > 0) {
      this.globalHighlight = new Highlight(...Array.from(this.allRanges));
      CSS.highlights.set('sidenote-highlights', this.globalHighlight);
    } else {
      this.globalHighlight = null;
    }
  }

  getHighlightIds(): string[] {
    return Array.from(this.highlights.keys());
  }

  setSelectedHighlight(id: string | null): void {
    if (!this.isSupported()) return;

    // Clear previous selection
    CSS.highlights.delete('selected-highlight');

    this.selectedHighlightId = id;

    if (id) {
      const highlight = this.highlights.get(id);
      if (highlight) {
        // Create a selected highlight
        const selectedHighlight = new Highlight(...Array.from(highlight));
        CSS.highlights.set('selected-highlight', selectedHighlight);
      }
    }
  }
}

/**
 * Fallback highlight manager for browsers without CSS Custom Highlight API support
 */
class DOMHighlightManager implements HighlightManager {
  private highlights = new Map<string, Element[]>();
  private selectedHighlightId: string | null = null;

  isSupported(): boolean {
    return true; // Always supported as fallback
  }

  addHighlight(id: string, range: Range): void {
    try {
      const contents = range.extractContents();
      const highlightSpan = document.createElement('span');
      highlightSpan.className = `highlight-${id} bg-yellow-200 dark:bg-yellow-800 rounded-sm px-1`;
      highlightSpan.setAttribute('data-highlight-id', id);
      highlightSpan.appendChild(contents);
      range.insertNode(highlightSpan);

      this.highlights.set(id, [highlightSpan]);
    } catch (error) {
      console.error('Error creating DOM highlight:', error);
    }
  }

  removeHighlight(id: string): void {
    const elements = this.highlights.get(id);
    if (!elements) return;

    elements.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el);
        parent.normalize();
      }
    });

    this.highlights.delete(id);
  }

  clearHighlights(): void {
    for (const id of this.highlights.keys()) {
      this.removeHighlight(id);
    }
  }

  getHighlightIds(): string[] {
    return Array.from(this.highlights.keys());
  }

  setSelectedHighlight(id: string | null): void {
    // Clear previous selection
    if (this.selectedHighlightId) {
      const prevElements = this.highlights.get(this.selectedHighlightId);
      if (prevElements) {
        prevElements.forEach(el => {
          el.classList.remove('highlight-selected');
        });
      }
    }

    this.selectedHighlightId = id;

    // Set new selection
    if (id) {
      const elements = this.highlights.get(id);
      if (elements) {
        elements.forEach(el => {
          el.classList.add('highlight-selected');
        });
      }
    }
  }
}

/**
 * Get text content with normalized whitespace for consistent positioning
 */
function getNormalizedText(container: Element): string {
  return container.textContent?.replace(/\s+/g, ' ').trim() || '';
}

/**
 * Find text position in normalized content
 */
function findTextPosition(text: string, normalizedContent: string, beforeContext: string, afterContext: string): { start: number; end: number } | null {
  // First try exact match
  let startPos = normalizedContent.indexOf(text);

  if (startPos !== -1) {
    return { start: startPos, end: startPos + text.length };
  }

  // Try with context
  const contextPattern = beforeContext + text + afterContext;
  const contextMatch = normalizedContent.indexOf(contextPattern);

  if (contextMatch !== -1) {
    return {
      start: contextMatch + beforeContext.length,
      end: contextMatch + beforeContext.length + text.length
    };
  }

  // Fuzzy matching for similar text
  const words = text.split(/\s+/);
  if (words.length > 1) {
    // Try finding by first and last words
    const firstWord = words[0];
    const lastWord = words[words.length - 1];

    const firstIndex = normalizedContent.indexOf(firstWord);
    const lastIndex = normalizedContent.indexOf(lastWord, firstIndex);

    if (firstIndex !== -1 && lastIndex !== -1) {
      return { start: firstIndex, end: lastIndex + lastWord.length };
    }
  }

  return null;
}

/**
 * Convert text position back to DOM Range
 */
function textPositionToRange(container: Element, startPos: number, endPos: number): Range | null {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );

  let currentPos = 0;
  let startNode: Node | null = null;
  let startOffset = 0;
  let endNode: Node | null = null;
  let endOffset = 0;

  let node: Node | null;
  while (node = walker.nextNode()) {
    const textContent = node.textContent || '';
    const normalizedText = textContent.replace(/\s+/g, ' ');
    const nodeLength = normalizedText.length;

    if (!startNode && currentPos + nodeLength > startPos) {
      startNode = node;
      startOffset = Math.min(startPos - currentPos, textContent.length);
    }

    if (currentPos + nodeLength >= endPos) {
      endNode = node;
      endOffset = Math.min(endPos - currentPos, textContent.length);
      break;
    }

    currentPos += nodeLength + (nodeLength > 0 ? 1 : 0); // Add space between nodes
  }

  if (!startNode || !endNode) {
    return null;
  }

  try {
    const range = document.createRange();
    range.setStart(startNode, Math.max(0, startOffset));
    range.setEnd(endNode, Math.max(0, endOffset));

    // Validate range has content
    if (range.toString().trim().length === 0) {
      return null;
    }

    return range;
  } catch (error) {
    console.error('Error creating range:', error);
    return null;
  }
}

/**
 * Serialize a Range to a robust format
 */
export function serializeRange(range: Range, container: Element): SerializedRange {
  const text = range.toString().replace(/\s+/g, ' ').trim();
  const normalizedContent = getNormalizedText(container);

  // Find position in normalized content
  const startPos = normalizedContent.indexOf(text);
  const endPos = startPos + text.length;

  // Get context for better matching
  const contextLength = 50;
  const beforeContext = normalizedContent.substring(Math.max(0, startPos - contextLength), startPos);
  const afterContext = normalizedContent.substring(endPos, Math.min(normalizedContent.length, endPos + contextLength));

  return {
    id: generateHighlightId(),
    text,
    startOffset: startPos,
    endOffset: endPos,
    beforeContext,
    afterContext,
    containerSelector: container.id ? `#${container.id}` : container.tagName.toLowerCase()
  };
}

/**
 * Deserialize to a Range object
 */
export function deserializeRange(serialized: SerializedRange, container: Element): Range | null {
  const normalizedContent = getNormalizedText(container);

  // Find text position using context
  const position = findTextPosition(
    serialized.text,
    normalizedContent,
    serialized.beforeContext,
    serialized.afterContext
  );

  if (!position) {
    console.warn('Could not find text position for:', serialized.text);
    return null;
  }

  return textPositionToRange(container, position.start, position.end);
}

/**
 * Generate unique highlight ID
 */
function generateHighlightId(): string {
  return `highlight-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create appropriate highlight manager based on browser support
 */
export function createHighlightManager(): HighlightManager {
  const cssManager = new CSSHighlightManager();

  if (cssManager.isSupported()) {
    return cssManager;
  }

  console.warn('CSS Custom Highlight API not supported, falling back to DOM manipulation');
  return new DOMHighlightManager();
}

/**
 * Check if range is valid and meaningful
 */
export function isValidRange(range: Range): boolean {
  try {
    return (
      range.startContainer.isConnected &&
      range.endContainer.isConnected &&
      range.toString().trim().length >= 3 && // Minimum meaningful text
      !range.collapsed
    );
  } catch (error) {
    return false;
  }
}

/**
 * Get safe bounding rectangle for range
 */
export function getRangeBounds(range: Range): DOMRect {
  try {
    const rects = range.getClientRects();

    if (rects.length === 0) {
      return new DOMRect(0, 0, 0, 0);
    }

    if (rects.length === 1) {
      return rects[0];
    }

    // Multi-line selection: return bounding box
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      minX = Math.min(minX, rect.left);
      minY = Math.min(minY, rect.top);
      maxX = Math.max(maxX, rect.right);
      maxY = Math.max(maxY, rect.bottom);
    }

    return new DOMRect(minX, minY, maxX - minX, maxY - minY);
  } catch (error) {
    return new DOMRect(0, 0, 0, 0);
  }
}