/**
 * Utility functions for working with XPath in the context of text highlighting
 */

/**
 * Get XPath for a given DOM node
 */
export function getXPath(node: Node): string {
  if (node.nodeType === Node.DOCUMENT_NODE) {
    return '';
  }

  if (node.nodeType === Node.ATTRIBUTE_NODE) {
    return getXPath((node as Attr).ownerElement!) + '/@' + node.nodeName;
  }

  const parts: string[] = [];
  let current: Node | null = node;

  while (current && current.nodeType !== Node.DOCUMENT_NODE) {
    let index = 1;
    let sibling = current.previousSibling;

    while (sibling) {
      if (sibling.nodeType === current.nodeType && sibling.nodeName === current.nodeName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }

    const tagName = current.nodeType === Node.ELEMENT_NODE
      ? current.nodeName.toLowerCase()
      : 'text()';

    const predicate = index > 1 ? `[${index}]` : '';
    parts.unshift(tagName + predicate);

    current = current.parentNode;
  }

  return '/' + parts.join('/');
}

/**
 * Get DOM node from XPath string
 */
export function getNodeFromXPath(xpath: string, contextNode: Node = document): Node | null {
  try {
    const result = document.evaluate(
      xpath,
      contextNode,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return result.singleNodeValue;
  } catch (error) {
    console.error('Error evaluating XPath:', error);
    return null;
  }
}

/**
 * Get relative XPath from a container element
 */
export function getRelativeXPath(node: Node, container: Element): string {
  if (!container.contains(node as Element) && node !== container) {
    throw new Error('Node is not contained within the specified container');
  }

  const parts: string[] = [];
  let current: Node | null = node;

  while (current && current !== container) {
    let index = 1;
    let sibling = current.previousSibling;

    while (sibling) {
      if (sibling.nodeType === current.nodeType && sibling.nodeName === current.nodeName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }

    const tagName = current.nodeType === Node.ELEMENT_NODE
      ? current.nodeName.toLowerCase()
      : 'text()';

    const predicate = index > 1 ? `[${index}]` : '';
    parts.unshift(tagName + predicate);

    current = current.parentNode;
  }

  return './' + parts.join('/');
}

/**
 * Get node from relative XPath within a container
 */
export function getNodeFromRelativeXPath(xpath: string, container: Element): Node | null {
  try {
    const result = document.evaluate(
      xpath,
      container,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return result.singleNodeValue;
  } catch (error) {
    console.error('Error evaluating relative XPath:', error);
    return null;
  }
}