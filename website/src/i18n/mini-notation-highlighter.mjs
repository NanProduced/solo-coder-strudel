import { RangeSetBuilder, StateEffect, StateField, Prec } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
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
};

export function getColorForType(type) {
  return COLOR_MAP[type] || COLOR_MAP.note;
}

export const setMiniNotationHighlight = StateEffect.define();
export const enableMiniNotationHighlight = StateEffect.define();

const miniNotationHighlightEnabled = StateField.define({
  create() {
    return false;
  },
  update(enabled, tr) {
    for (let e of tr.effects) {
      if (e.is(enableMiniNotationHighlight)) {
        return e.value;
      }
    }
    return enabled;
  },
});

const miniNotationDecorations = StateField.define({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    if (tr.docChanged) {
      decorations = decorations.map(tr.changes);
    }

    for (let e of tr.effects) {
      if (e.is(setMiniNotationHighlight)) {
        const { code, from = 0, to = null } = e.value;
        const actualTo = to !== null ? to : code.length;
        const relevantCode = code.slice(from, actualTo);
        const elements = getSyntaxElements(relevantCode);
        
        const builder = new RangeSetBuilder();
        
        for (const elem of elements) {
          const elemFrom = from + elem.start;
          const elemTo = from + elem.end;
          const color = getColorForType(elem.type);
          
          const mark = Decoration.mark({
            attributes: {
              style: `text-decoration: underline; text-decoration-color: ${color}; text-decoration-thickness: 3px; text-underline-offset: 3px;`,
              'data-syntax-type': elem.type,
              'data-syntax-text': elem.text,
            },
          });
          
          builder.add(elemFrom, elemTo, mark);
        }
        
        decorations = builder.finish();
      }
    }

    return decorations;
  },
});

const miniNotationHighlights = EditorView.decorations.compute(
  [miniNotationDecorations, miniNotationHighlightEnabled],
  (state) => {
    const enabled = state.field(miniNotationHighlightEnabled);
    if (!enabled) {
      return Decoration.none;
    }
    return state.field(miniNotationDecorations);
  },
);

export function updateMiniNotationHighlight(view, code, from = 0, to = null) {
  view.dispatch({
    effects: setMiniNotationHighlight.of({ code, from, to }),
  });
}

export function toggleMiniNotationHighlight(view, enabled) {
  view.dispatch({
    effects: enableMiniNotationHighlight.of(enabled),
  });
}

export const miniNotationHighlightExtension = [
  miniNotationHighlightEnabled,
  miniNotationDecorations,
  Prec.highest(miniNotationHighlights),
];

export function isMiniNotationHighlightEnabled(state) {
  return state.field(miniNotationHighlightEnabled);
}

export function getMiniNotationDecorations(state) {
  return state.field(miniNotationDecorations);
}

export function renderMiniNotationHTML(code) {
  if (!code) return '';
  
  const elements = getSyntaxElements(code);
  
  if (elements.length === 0) {
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
    
    result += `<span style="color: ${color}; text-decoration: underline; text-decoration-color: ${color}; text-decoration-thickness: 3px; text-underline-offset: 3px;">${escapedText}</span>`;
    
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

export default {
  miniNotationHighlightExtension,
  updateMiniNotationHighlight,
  toggleMiniNotationHighlight,
  renderMiniNotationHTML,
  COLOR_MAP,
  getColorForType,
};
