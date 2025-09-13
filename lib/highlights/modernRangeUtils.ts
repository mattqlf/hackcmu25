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
  /** Start character position in container */
  startOffset: number;
  /** End character position in container */
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
      highlightSpan.className = `highlight-${id} bg-yellow-200 rounded-sm px-1`;
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
 * Calculate character position of a node/offset within a container
 * Uses character counting approach similar to Rangy
 */
function getCharacterOffsetWithin(container: Element, node: Node, offset: number): number {
  let charCount = 0;
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (textNode) => {
        // Skip script and style content
        const parent = textNode.parentElement;
        if (parent) {
          const tagName = parent.tagName.toLowerCase();
          if (tagName === 'script' || tagName === 'style') {
            return NodeFilter.FILTER_REJECT;
          }
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let currentNode: Node | null;
  while (currentNode = walker.nextNode()) {
    if (currentNode === node) {
      return charCount + offset;
    }
    charCount += currentNode.textContent?.length || 0;
  }

  return charCount;
}

/**
 * Convert character offset back to node/offset position
 * Uses character counting approach similar to Rangy
 */
function getNodeAndOffsetFromCharacterOffset(container: Element, characterOffset: number): { node: Node; offset: number } | null {
  let charCount = 0;
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (textNode) => {
        // Skip script and style content
        const parent = textNode.parentElement;
        if (parent) {
          const tagName = parent.tagName.toLowerCase();
          if (tagName === 'script' || tagName === 'style') {
            return NodeFilter.FILTER_REJECT;
          }
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let currentNode: Node | null;
  let lastNode: Node | null = null;
  while (currentNode = walker.nextNode()) {
    lastNode = currentNode;
    const nodeLength = currentNode.textContent?.length || 0;

    if (charCount + nodeLength >= characterOffset) {
      return {
        node: currentNode,
        offset: characterOffset - charCount
      };
    }

    charCount += nodeLength;
  }

  // If we get here, the offset is beyond the end of the content
  // Return the last text node with its max offset
  if (lastNode) {
    return {
      node: lastNode,
      offset: lastNode.textContent?.length || 0
    };
  }

  return null;
}


/**
 * Serialize a Range to a robust format using character-based positioning
 */
export function serializeRange(range: Range, container: Element): SerializedRange {
  // Preserve original text as selected by user
  const originalText = range.toString();

  // Calculate character positions within the container
  const startOffset = getCharacterOffsetWithin(container, range.startContainer, range.startOffset);
  const endOffset = getCharacterOffsetWithin(container, range.endContainer, range.endOffset);

  // Get context by extracting text around the positions
  const fullText = getTextContent(container);
  const contextLength = 50;
  const beforeContext = fullText.substring(Math.max(0, startOffset - contextLength), startOffset);
  const afterContext = fullText.substring(endOffset, Math.min(fullText.length, endOffset + contextLength));

  return {
    id: generateHighlightId(),
    text: originalText,
    startOffset,
    endOffset,
    beforeContext,
    afterContext,
    containerSelector: container.id ? `#${container.id}` : container.tagName.toLowerCase()
  };
}

/**
 * Get plain text content from container (for context generation)
 */
function getTextContent(container: Element): string {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (textNode) => {
        // Skip script and style content
        const parent = textNode.parentElement;
        if (parent) {
          const tagName = parent.tagName.toLowerCase();
          if (tagName === 'script' || tagName === 'style') {
            return NodeFilter.FILTER_REJECT;
          }
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let text = '';
  let node: Node | null;
  while (node = walker.nextNode()) {
    text += node.textContent || '';
  }

  return text;
}


/**
 * Deserialize to a Range object using character-based positioning
 */
export function deserializeRange(serialized: SerializedRange, container: Element): Range | null {
  // Try direct character position restoration first
  const startResult = getNodeAndOffsetFromCharacterOffset(container, serialized.startOffset);
  const endResult = getNodeAndOffsetFromCharacterOffset(container, serialized.endOffset);

  if (startResult && endResult) {
    try {
      const range = document.createRange();
      range.setStart(startResult.node, startResult.offset);
      range.setEnd(endResult.node, endResult.offset);

      // Verify the range makes sense
      if (range.toString().trim().length > 0) {
        return range;
      }
    } catch (error) {
      console.warn('Error creating range from character offsets:', error);
    }
  }

  // Fallback: try to find by text content and context
  const fullText = getTextContent(container);
  const targetText = serialized.text;

  // Look for the text using context
  let searchText = serialized.beforeContext + targetText + serialized.afterContext;
  let searchIndex = fullText.indexOf(searchText);

  if (searchIndex !== -1) {
    const adjustedStart = searchIndex + serialized.beforeContext.length;
    const adjustedEnd = adjustedStart + targetText.length;

    const fallbackStart = getNodeAndOffsetFromCharacterOffset(container, adjustedStart);
    const fallbackEnd = getNodeAndOffsetFromCharacterOffset(container, adjustedEnd);

    if (fallbackStart && fallbackEnd) {
      try {
        const range = document.createRange();
        range.setStart(fallbackStart.node, fallbackStart.offset);
        range.setEnd(fallbackEnd.node, fallbackEnd.offset);

        if (range.toString().trim().length > 0) {
          return range;
        }
      } catch (error) {
        console.warn('Error creating fallback range:', error);
      }
    }
  }

  // Final fallback: try to find just the target text
  const directIndex = fullText.indexOf(targetText);
  if (directIndex !== -1) {
    const finalStart = getNodeAndOffsetFromCharacterOffset(container, directIndex);
    const finalEnd = getNodeAndOffsetFromCharacterOffset(container, directIndex + targetText.length);

    if (finalStart && finalEnd) {
      try {
        const range = document.createRange();
        range.setStart(finalStart.node, finalStart.offset);
        range.setEnd(finalEnd.node, finalEnd.offset);

        if (range.toString().trim().length > 0) {
          return range;
        }
      } catch (error) {
        console.warn('Error creating final fallback range:', error);
      }
    }
  }

  console.warn('Could not deserialize range for text:', serialized.text);
  return null;
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
  } catch {
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
  } catch {
    return new DOMRect(0, 0, 0, 0);
  }
}