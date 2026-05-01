import { getSyntaxElements } from './ast-validator.mjs';

export const COLOR_MAP = {
  note: '#60a5fa',
  group: '#34d399',
  fast: '#fbbf24',
  slowcat: '#a78bfa',
  stack: '#f472b6',
  sequence: '#94a3b8',
  number: '#c084fc',
  operator: '#64748b',
  bracket: '#4ade80',
  rest: '#6b7280',
};

export function getColorForType(type) {
  return COLOR_MAP[type] || COLOR_MAP.note;
}

export function drawMiniNotation(code, format = 'html') {
  if (!code || typeof code !== 'string') {
    return '';
  }

  const elements = getSyntaxElements(code);
  
  if (format === 'html') {
    return renderAsHTML(code, elements);
  } else if (format === 'codemirror') {
    return renderAsCodeMirrorDecorations(code, elements);
  }
  
  return code;
}

function renderAsHTML(code, elements) {
  if (!elements || elements.length === 0) {
    return escapeHtml(code);
  }

  const sortedElements = [...elements].sort((a, b) => a.start - b.start);
  
  const mergedElements = mergeOverlappingElements(sortedElements);
  
  let result = '';
  let lastIndex = 0;
  
  for (const elem of mergedElements) {
    if (elem.start > lastIndex) {
      result += escapeHtml(code.slice(lastIndex, elem.start));
    }
    
    const color = getColorForType(elem.type);
    const text = code.slice(elem.start, elem.end);
    const escapedText = escapeHtml(text);
    
    result += `<span style="color: ${color}; text-decoration: underline; text-decoration-color: ${color}; text-decoration-thickness: 2px; text-underline-offset: 2px;">${escapedText}</span>`;
    
    lastIndex = elem.end;
  }
  
  if (lastIndex < code.length) {
    result += escapeHtml(code.slice(lastIndex));
  }
  
  return result;
}

function mergeOverlappingElements(elements) {
  if (elements.length === 0) return [];
  
  const result = [];
  let current = { ...elements[0] };
  
  for (let i = 1; i < elements.length; i++) {
    const next = elements[i];
    
    if (next.start <= current.end) {
      const priority = getTypePriority(current.type) - getTypePriority(next.type);
      if (priority < 0) {
        if (next.start > current.start) {
          result.push({ ...current, end: next.start });
        }
        current = { ...next };
      } else if (next.end > current.end) {
        current = { ...current, end: next.end };
      }
    } else {
      result.push(current);
      current = { ...next };
    }
  }
  
  result.push(current);
  return result;
}

function getTypePriority(type) {
  const priorities = {
    group: 10,
    stack: 9,
    slowcat: 8,
    fast: 7,
    note: 5,
    number: 4,
    operator: 3,
    bracket: 2,
    sequence: 1,
  };
  return priorities[type] || 0;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function renderAsCodeMirrorDecorations(code, elements) {
  if (!elements || elements.length === 0) {
    return [];
  }

  const decorations = [];
  
  for (const elem of elements) {
    const color = getColorForType(elem.type);
    
    decorations.push({
      from: elem.start,
      to: elem.end,
      type: 'underline',
      color: color,
      syntaxType: elem.type,
      text: elem.text,
    });
  }
  
  return decorations;
}

export function applyCodeMirrorDecorations(editorView, code) {
  if (!editorView || !code) return;
  
  const elements = getSyntaxElements(code);
  const decorations = renderAsCodeMirrorDecorations(code, elements);
  
  return decorations;
}

export function createMiniNotationHighlighter() {
  return {
    highlight: (code) => drawMiniNotation(code, 'html'),
    getDecorations: (code) => {
      const elements = getSyntaxElements(code);
      return renderAsCodeMirrorDecorations(code, elements);
    },
    getColorForType,
    COLOR_MAP,
  };
}

export default createMiniNotationHighlighter;
