import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';
import { checkGrammar } from '../services/grammarService';
import { enhanceText, summarizeText } from '../services/aiService';
import { GrammarMatch, SidebarErrorItem, EditorStats } from '../types';
import { ProcessingState } from '../App';
import { SelectionToolbar } from './SelectionToolbar';
import { GrammarExtension, grammarPluginKey } from '../extensions/GrammarExtension';

// Debounce helper
const useDebounce = (effect: () => void, dependencies: any[], delay: number) => {
  const callback = useCallback(effect, dependencies);
  useEffect(() => {
    const timeout = setTimeout(callback, delay);
    return () => clearTimeout(timeout);
  }, [callback, delay]);
};

interface EditorProps {
  onStatsUpdate: (stats: EditorStats) => void;
  onErrorsUpdate: (errors: SidebarErrorItem[]) => void;
  processingState: ProcessingState;
  setProcessingState: (state: ProcessingState) => void;
  externalAction: { type: 'fix' | 'enhance' | 'summarize' | 'fixAll' | 'scroll' | 'copy', payload?: any } | null;
  onActionComplete: () => void;
  onErrorClick: (id: string | null) => void;
  onAIError: (message: string) => void;
}

export const Editor: React.FC<EditorProps> = ({
  onStatsUpdate,
  onErrorsUpdate,
  processingState,
  setProcessingState,
  externalAction,
  onActionComplete,
  onErrorClick,
  onAIError
}) => {
  const [content, setContent] = useState('');
  const [visualLineCount, setVisualLineCount] = useState(1);
  const [selectionCoords, setSelectionCoords] = useState<{ top: number; left: number } | null>(null);
  const isCheckingRef = useRef(false);
  const lastActionRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize Tiptap
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Highlight.configure({ multicolor: true }),
      GrammarExtension.configure({
        onErrorsUpdate: (errors) => {
          onErrorsUpdate(errors);
        }
      }),
    ],
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
        spellcheck: 'false',
      },
      handleClick(view, pos, event) {
        const target = event.target as HTMLElement;
        const errorId = target.closest('.grammar-error, .grammar-warning')?.getAttribute('data-error-id');

        if (errorId) {
          onErrorClick(errorId);
        } else {
          onErrorClick(null);
        }
        return false;
      }
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      setContent(text);

      const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
      const characters = text.length;
      onStatsUpdate({ words, characters });
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to, empty } = editor.state.selection;
      if (!empty && containerRef.current) {
        const { view } = editor;
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);
        const containerRect = containerRef.current.getBoundingClientRect();

        // Position toolbar above selection, centered
        const top = start.top - containerRect.top - 45;
        const left = (start.left + end.left) / 2 - containerRect.left;

        setSelectionCoords({ top: Math.max(0, top), left });
      } else {
        setSelectionCoords(null);
      }
    },
  });

  // Calculate Visual Lines based on Editor Scroll Height
  const updateLineNumbers = useCallback(() => {
    if (containerRef.current) {
      const editorElement = containerRef.current.querySelector('.ProseMirror');
      if (editorElement) {
        // Get the computed line height (approx 1.6rem = 25.6px at 16px root)
        // We must match the CSS variable --editor-line-height
        const style = window.getComputedStyle(editorElement);
        const lineHeight = parseFloat(style.lineHeight);
        const scrollHeight = editorElement.scrollHeight;

        if (lineHeight && scrollHeight) {
          // Calculate lines based on content height. 
          const lines = Math.max(1, Math.round(scrollHeight / lineHeight));
          setVisualLineCount(lines);
        }
      }
    }
  }, []);

  // Monitor resize/content changes to update line numbers
  useEffect(() => {
    updateLineNumbers();
    const observer = new ResizeObserver(updateLineNumbers);
    const currentContainer = containerRef.current;

    // Observe the editor content specifically
    const editorEl = currentContainer?.querySelector('.ProseMirror');

    if (editorEl) {
      observer.observe(editorEl);
    }

    return () => observer.disconnect();
  }, [editor, content, updateLineNumbers]);


  // Debounced Grammar Check
  useDebounce(() => {
    const runCheck = async () => {
      if (!editor || isCheckingRef.current) return;

      const text = editor.getText();
      if (text.length < 2) {
        editor.commands.setGrammarMatches([]);
        onErrorsUpdate([]);
        return;
      }

      isCheckingRef.current = true;
      const foundMatches = await checkGrammar(text);
      isCheckingRef.current = false;

      editor.commands.setGrammarMatches(foundMatches);
    };

    runCheck();
  }, [content], 1000);

  // External Actions Hook
  useEffect(() => {
    if (!editor || !externalAction) return;

    if (lastActionRef.current === externalAction) {
      return;
    }
    lastActionRef.current = externalAction;

    if (externalAction.type === 'fix') {
      const { error, replacement } = externalAction.payload;

      let targetFrom = error.from;
      let targetTo = error.to;
      const { id } = error;

      const pluginState = grammarPluginKey.getState(editor.state);
      if (pluginState) {
          const decorations = pluginState.find();
          const currentDeco = decorations.find((d: any) => d.spec.originalId === id);
          if (currentDeco) {
              targetFrom = currentDeco.from;
              targetTo = currentDeco.to;
          }
      }

      editor.chain().focus().setTextSelection({ from: targetFrom, to: targetTo }).insertContent(replacement).run();
      onActionComplete();
    }

    if (externalAction.type === 'fixAll') {
      const sortedErrors = [...externalAction.payload.errors].sort((a: SidebarErrorItem, b: SidebarErrorItem) => b.from - a.from);
      const chain = editor.chain().focus();

      sortedErrors.forEach((error: SidebarErrorItem) => {
        if (error.replacements.length > 0) {
           chain.setTextSelection({ from: error.from, to: error.to }).insertContent(error.replacements[0]);
        }
      });
      chain.run();
      onActionComplete();
    }

    if (externalAction.type === 'enhance') {
      const performEnhancement = async () => {
        setProcessingState('enhance');
        const currentText = editor.getText();
        try {
          const { from, to, empty } = editor.state.selection;
          if (!empty) {
            const textToEnhance = editor.state.doc.textBetween(from, to);
            const enhanced = await enhanceText(textToEnhance);
            editor.chain().focus().insertContent(enhanced).run();
          } else {
            const enhanced = await enhanceText(currentText);
            editor.commands.setContent(enhanced);
          }
        } catch (e: any) {
          console.error(e);
          onAIError(e.name === 'AIProviderError' ? 'AI provider not configured.' : 'Failed to enhance text.');
        } finally {
          setProcessingState(null);
          onActionComplete();
        }
      };
      performEnhancement();
    }

    if (externalAction.type === 'summarize') {
      const performSummarization = async () => {
        setProcessingState('summarize');
        const currentText = editor.getText();
        try {
          const { from, to, empty } = editor.state.selection;
          if (!empty) {
            const textToSummarize = editor.state.doc.textBetween(from, to);
            const summary = await summarizeText(textToSummarize);
            editor.chain().focus().insertContent(summary).run();
          } else {
            const summary = await summarizeText(currentText);
            editor.commands.setContent(summary);
          }
        } catch (e: any) {
          console.error(e);
          onAIError(e.name === 'AIProviderError' ? 'AI provider not configured.' : 'Failed to summarize text.');
        } finally {
          setProcessingState(null);
          onActionComplete();
        }
      };
      performSummarization();
    }

    if (externalAction.type === 'scroll') {
      const pos = externalAction.payload;
      editor.chain().focus().setTextSelection(pos).scrollIntoView().run();
      onActionComplete();
    }

    if (externalAction.type === 'copy') {
      const text = editor.getText();
      navigator.clipboard.writeText(text).then(() => onActionComplete()).catch(() => onActionComplete());
    }

  }, [externalAction, editor, setProcessingState, onActionComplete, onErrorsUpdate]);

  if (!editor) {
    return null;
  }

  // Selection-based enhance handler
  const handleSelectionEnhance = async () => {
    const { from, to, empty } = editor.state.selection;
    if (empty) return;

    setProcessingState('enhance');
    try {
      const textToEnhance = editor.state.doc.textBetween(from, to);
      const enhanced = await enhanceText(textToEnhance);
      editor.chain().focus().insertContent(enhanced).run();
    } catch (e: any) {
      console.error(e);
      onAIError(e.name === 'AIProviderError' ? 'AI provider not configured.' : 'Failed to enhance text.');
    } finally {
      setProcessingState(null);
      setSelectionCoords(null);
    }
  };

  // Selection-based summarize handler
  const handleSelectionSummarize = async () => {
    const { from, to, empty } = editor.state.selection;
    if (empty) return;

    setProcessingState('summarize');
    try {
      const textToSummarize = editor.state.doc.textBetween(from, to);
      const summary = await summarizeText(textToSummarize);
      editor.chain().focus().insertContent(summary).run();
    } catch (e: any) {
      console.error(e);
      onAIError(e.name === 'AIProviderError' ? 'AI provider not configured.' : 'Failed to summarize text.');
    } finally {
      setProcessingState(null);
      setSelectionCoords(null);
    }
  };

  return (
    <div
      className="w-full h-full relative cursor-text flex overflow-hidden"
      onClick={() => editor.chain().focus().run()}
      ref={containerRef}
    >
      {/* Selection Toolbar */}
      {selectionCoords && (
        <SelectionToolbar
          position={selectionCoords}
          onEnhance={handleSelectionEnhance}
          onSummarize={handleSelectionSummarize}
          processingState={processingState}
        />
      )}

      {/* Scrollable Container with Line Numbers + Editor */}
      <div className="flex-1 minimal-scrollbar overflow-y-auto h-full flex">
        {/* Line Numbers Gutter */}
        <div className="min-w-[3rem] pt-12 pr-4 text-right select-none text-text/30 font-mono text-[1rem] leading-[1.6rem] border-r border-text/5 bg-background/50">
          {Array.from({ length: visualLineCount }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        {/* Editor Content Area */}
        <div className="flex-1 pt-12 pr-12 pb-20 pl-4">
          <EditorContent editor={editor} className="w-full" />
        </div>
      </div>
    </div>
  );
};
