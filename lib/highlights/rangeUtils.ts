import { getXPath, getNodeFromXPath, getRelativeXPath, getNodeFromRelativeXPath } from './xpathUtils';

export interface SerializedRange {
  startContainerPath: string;
  startOffset: number;
  endContainerPath: string;
  endOffset: number;
  text: string;
  isRelative?: boolean;
  containerId?: string;
}

/**
 * Serialize a Range object to a storable format
 */
export function serializeRange(range: Range, container?: Element): SerializedRange {
  const text = range.toString();

  if (container) {
    return {
      startContainerPath: getRelativeXPath(range.startContainer, container),
      startOffset: range.startOffset,
      endContainerPath: getRelativeXPath(range.endContainer, container),
      endOffset: range.endOffset,
      text,
      isRelative: true,
      containerId: container.id || container.tagName.toLowerCase()
    };
  }

  return {
    startContainerPath: getXPath(range.startContainer),
    startOffset: range.startOffset,
    endContainerPath: getXPath(range.endContainer),
    endOffset: range.endOffset,
    text
  };
}

/**
 * Deserialize a stored range back to a Range object
 */
export function deserializeRange(serialized: SerializedRange, container?: Element): Range | null {
  try {
    const range = document.createRange();

    let startNode: Node | null;
    let endNode: Node | null;

    if (serialized.isRelative && container) {
      startNode = getNodeFromRelativeXPath(serialized.startContainerPath, container);
      endNode = getNodeFromRelativeXPath(serialized.endContainerPath, container);
    } else {
      startNode = getNodeFromXPath(serialized.startContainerPath);
      endNode = getNodeFromXPath(serialized.endContainerPath);
    }

    if (!startNode || !endNode) {
      console.warn('Could not find nodes for range:', serialized);
      return null;
    }

    range.setStart(startNode, serialized.startOffset);
    range.setEnd(endNode, serialized.endOffset);

    // Validate that the range text matches
    const currentText = range.toString();
    if (currentText !== serialized.text) {
      console.warn('Range text mismatch. Expected:', serialized.text, 'Got:', currentText);
      // Try to find the text using fuzzy matching
      return findRangeByText(serialized.text, container || document.body);
    }

    return range;
  } catch (error) {
    console.error('Error deserializing range:', error);
    return findRangeByText(serialized.text, container || document.body);
  }
}

/**
 * Find a range by searching for text content (fallback method)
 */
export function findRangeByText(text: string, container: Element = document.body): Range | null {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );

  const textNodes: Text[] = [];
  let node: Node | null;

  while (node = walker.nextNode()) {
    textNodes.push(node as Text);
  }

  // Join all text content and find the position
  const fullText = textNodes.map(n => n.textContent || '').join('');
  const startIndex = fullText.indexOf(text);

  if (startIndex === -1) {
    return null;
  }

  const endIndex = startIndex + text.length;

  // Find the text nodes that contain our range
  let currentIndex = 0;
  let startNode: Text | null = null;
  let startOffset = 0;
  let endNode: Text | null = null;
  let endOffset = 0;

  for (const textNode of textNodes) {
    const nodeText = textNode.textContent || '';
    const nodeLength = nodeText.length;

    if (startNode === null && currentIndex + nodeLength > startIndex) {
      startNode = textNode;
      startOffset = startIndex - currentIndex;
    }

    if (currentIndex + nodeLength >= endIndex) {
      endNode = textNode;
      endOffset = endIndex - currentIndex;
      break;
    }

    currentIndex += nodeLength;
  }

  if (!startNode || !endNode) {
    return null;
  }

  try {
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    return range;
  } catch (error) {
    console.error('Error creating range from text search:', error);
    return null;
  }
}

/**
 * Check if a range is valid and still exists in the DOM
 */
export function isRangeValid(range: Range): boolean {
  try {
    return (
      range.startContainer.isConnected &&
      range.endContainer.isConnected &&
      range.toString().length > 0
    );
  } catch (error) {
    return false;
  }
}

/**
 * Get the bounding rectangle for a range, handling multi-line selections
 */
export function getRangeBounds(range: Range): DOMRect {
  const rects = range.getClientRects();

  if (rects.length === 0) {
    return new DOMRect(0, 0, 0, 0);
  }

  if (rects.length === 1) {
    return rects[0];
  }

  // For multi-line selections, return the bounding box of all rectangles
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i];
    minX = Math.min(minX, rect.left);
    minY = Math.min(minY, rect.top);
    maxX = Math.max(maxX, rect.right);
    maxY = Math.max(maxY, rect.bottom);
  }

  return new DOMRect(minX, minY, maxX - minX, maxY - minY);
}