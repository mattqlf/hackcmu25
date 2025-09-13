// Simple LaTeX and markdown rendering utilities
export const renderLatex = (text: string) => {
  // This is a basic LaTeX renderer - in production you'd use KaTeX or MathJax
  return text
    .replace(/\$\$([^$]+)\$\$/g, '<div class="math-display">$1</div>')
    .replace(/\$([^$]+)\$/g, '<span class="math-inline">$1</span>');
};

export const renderMarkdown = (text: string) => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 underline">$1</a>');
};

export const renderContent = (text: string) => {
  // First apply markdown rendering
  let processed = renderMarkdown(text);
  // Then apply LaTeX rendering
  processed = renderLatex(processed);
  return processed;
};