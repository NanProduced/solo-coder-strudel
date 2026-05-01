import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { highlightSpecialChars } from '@codemirror/view';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { theme, initTheme } from '@strudel/codemirror';
import { miniNotationHighlightExtension, updateMiniNotationHighlight, toggleMiniNotationHighlight, renderMiniNotationHTML } from '@src/i18n/mini-notation-highlighter.mjs';
import { getSyntaxElements } from '@src/i18n/ast-validator.mjs';
import { COLOR_MAP } from '@src/i18n/mini-notation-highlighter.mjs';

export { renderMiniNotationHTML, COLOR_MAP };

const tutorialEditorTheme = EditorView.baseTheme({
  '&.cm-editor': {
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
    fontSize: '16px',
    fontFamily: 'monospace',
  },
  '& .cm-scroller': {
    fontFamily: 'monospace',
    lineHeight: '1.6',
  },
  '& .cm-content': {
    fontFamily: 'monospace',
    padding: '8px 12px',
  },
  '& .cm-line': {
    padding: '0',
  },
  '& .cm-cursor': {
    borderLeftColor: 'var(--foreground)',
    borderLeftWidth: '2px',
  },
  '& .cm-selectionBackground': {
    backgroundColor: 'var(--lineHighlight)',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'var(--lineHighlight)',
  },
});

const createTutorialEditorState = (initialCode = '', extensions = []) => {
  return EditorState.create({
    doc: initialCode,
    extensions: [
      history(),
      highlightSpecialChars(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      tutorialEditorTheme,
      theme('strudelTheme'),
      miniNotationHighlightExtension,
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const code = update.state.doc.toString();
          updateMiniNotationHighlight(update.view, code);
        }
      }),
      ...extensions,
    ],
  });
};

export const TutorialCodeEditor = forwardRef(function TutorialCodeEditor(props, ref) {
  const {
    initialCode = '',
    onChange,
    onEvaluate,
    readOnly = false,
    className = '',
    theme: editorTheme = 'strudelTheme',
    fontSize = 16,
  } = props;

  const containerRef = useRef(null);
  const viewRef = useRef(null);
  const previousCodeRef = useRef(initialCode);

  useImperativeHandle(ref, () => ({
    getCode: () => {
      return viewRef.current?.state.doc.toString() || '';
    },
    setCode: (code) => {
      if (viewRef.current) {
        const currentCode = viewRef.current.state.doc.toString();
        if (currentCode !== code) {
          viewRef.current.dispatch({
            changes: {
              from: 0,
              to: viewRef.current.state.doc.length,
              insert: code,
            },
          });
          updateMiniNotationHighlight(viewRef.current, code);
        }
      }
    },
    getView: () => viewRef.current,
    focus: () => {
      viewRef.current?.focus();
    },
    highlight: (code) => {
      if (viewRef.current) {
        updateMiniNotationHighlight(viewRef.current, code || viewRef.current.state.doc.toString());
      }
    },
  }));

  useEffect(() => {
    initTheme(editorTheme);
  }, [editorTheme]);

  useEffect(() => {
    if (!containerRef.current) return;

    const state = createTutorialEditorState(initialCode, [
      EditorView.editable.of(!readOnly),
      EditorView.contentAttributes.of({
        spellcheck: 'false',
        autocorrect: 'off',
        autocapitalize: 'off',
      }),
    ]);

    const view = new EditorView({
      state,
      parent: containerRef.current,
      dispatch: (tr) => {
        view.update([tr]);
        if (tr.docChanged) {
          const newCode = view.state.doc.toString();
          onChange?.(newCode);
        }
      },
    });

    viewRef.current = view;
    toggleMiniNotationHighlight(view, true);
    updateMiniNotationHighlight(view, initialCode);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (viewRef.current && initialCode !== previousCodeRef.current) {
      const currentCode = viewRef.current.state.doc.toString();
      if (currentCode !== initialCode) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: viewRef.current.state.doc.length,
            insert: initialCode,
          },
        });
        updateMiniNotationHighlight(viewRef.current, initialCode);
      }
      previousCodeRef.current = initialCode;
    }
  }, [initialCode]);

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: [
          EditorView.editable.of(!readOnly),
        ],
      });
    }
  }, [readOnly]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.fontSize = `${fontSize}px`;
    }
  }, [fontSize]);

  return (
    <div className={`tutorial-code-editor ${className}`}>
      <div 
        ref={containerRef} 
        className="w-full min-h-[100px] bg-background border border-muted rounded-lg overflow-hidden"
      />
    </div>
  );
});

export function SyntaxLegend({ language, t }) {
  const items = [
    { type: 'note', label: 'miniNotation.terms.note', color: COLOR_MAP.note },
    { type: 'group', label: 'miniNotation.terms.group', color: COLOR_MAP.group },
    { type: 'fast', label: 'miniNotation.terms.fast', color: COLOR_MAP.fast },
    { type: 'slowcat', label: 'miniNotation.terms.slowcat', color: COLOR_MAP.slowcat },
    { type: 'stack', label: 'miniNotation.terms.stack', color: COLOR_MAP.stack },
  ];

  return (
    <div className="flex flex-wrap gap-3 p-3 bg-lineHighlight/50 rounded-lg">
      {items.map((item) => (
        <div key={item.type} className="flex items-center gap-1.5">
          <span 
            className="w-3 h-3 rounded-sm" 
            style={{ backgroundColor: item.color }} 
          />
          <span className="text-xs text-foreground/70">
            {t ? t(item.label) : item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CodeWithHighlight({ code, className = '' }) {
  if (!code) return null;
  
  const elements = getSyntaxElements(code);
  
  return (
    <code className={`font-mono ${className}`}>
      {renderCodeWithElements(code, elements)}
    </code>
  );
}

function renderCodeWithElements(code, elements) {
  if (!elements || elements.length === 0) {
    return <span>{code}</span>;
  }

  const sortedElements = [...elements].sort((a, b) => a.start - b.start);
  const nonOverlapping = removeOverlaps(sortedElements);
  
  const result = [];
  let lastIndex = 0;

  for (const elem of nonOverlapping) {
    if (elem.start > lastIndex) {
      result.push(
        <span key={`text-${lastIndex}`}>
          {code.slice(lastIndex, elem.start)}
        </span>
      );
    }

    const color = COLOR_MAP[elem.type] || COLOR_MAP.note;
    const text = code.slice(elem.start, elem.end);

    result.push(
      <span
        key={`elem-${elem.start}-${elem.end}`}
        style={{
          color: color,
          textDecoration: 'underline',
          textDecorationColor: color,
          textDecorationThickness: '3px',
          textUnderlineOffset: '3px',
        }}
      >
        {text}
      </span>
    );

    lastIndex = elem.end;
  }

  if (lastIndex < code.length) {
    result.push(
      <span key={`text-${lastIndex}`}>
        {code.slice(lastIndex)}
      </span>
    );
  }

  return result;
}

function removeOverlaps(elements) {
  if (elements.length === 0) return [];

  const result = [];
  let current = { ...elements[0] };

  for (let i = 1; i < elements.length; i++) {
    const next = elements[i];

    if (next.start < current.end) {
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

export default TutorialCodeEditor;
