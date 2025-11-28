import React, { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';
import { checkGrammar } from '../services/grammarService';
import { enhanceText, summarizeText } from '../services/aiService';
import { GrammarMatch, SidebarErrorItem, EditorStats } from '../types';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Node as PMNode } from '@tiptap/pm/model';
import { ProcessingState } from '../App';

// Debounce helper
const useDebounce = (effect: () => void, dependencies: any[], delay: number) => {
  const callback = useCallback(effect, dependencies);
  useEffect(() => {
    const timeout = setTimeout(callback, delay);
    return () => clearTimeout(timeout);
  }, [callback, delay]);
};

const textOffsetToPos = (doc: PMNode, offset: number): number => {
  let currentTextOffset = 0;
  let targetPos = 0;
  let found = false;

  doc.descendants((node, pos) => {
    if (found) return false;

    if (node.isText) {
      const len = node.text?.length || 0;
      if (offset >= currentTextOffset && offset <= currentTextOffset + len) {
        targetPos = pos + (offset - currentTextOffset);
        found = true;
        return false;
      }
      currentTextOffset += len;
    } else if (node.isBlock) {
      if (currentTextOffset > 0) {
        currentTextOffset += 1;
        if (offset === currentTextOffset - 1) {
            targetPos = pos; 
            found = true;
            return false;
        }
      }
    }
    return true;
  });

  if (!found) {
    return doc.content.size - 1;
  }

  return targetPos;
};

interface EditorProps {
  onStatsUpdate: (stats: EditorStats) => void;
  onErrorsUpdate: (errors: SidebarErrorItem[]) => void;
  processingState: ProcessingState;
  setProcessingState: (state: ProcessingState) => void;
  externalAction: { type: 'fix' | 'enhance' | 'summarize' | 'fixAll' | 'scroll' | 'copy', payload?: any } | null;
  onActionComplete: () => void;
  onErrorClick: (id: string | null) => void;
}

export const Editor: React.FC<EditorProps> = ({ 
  onStatsUpdate, 
  onErrorsUpdate,
  processingState,
  setProcessingState,
  externalAction,
  onActionComplete,
  onErrorClick
}) => {
  const [content, setContent] = useState('');
  const [matches, setMatches] = useState<GrammarMatch[]>([]);
  const [visualLineCount, setVisualLineCount] = useState(1);
  const isCheckingRef = useRef(false);
  const lastActionRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize Tiptap
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Highlight.configure({ multicolor: true }),
    ],
    editorProps: {
      attributes: {
        // Removed prose classes to ensure strict grid alignment for line numbers.
        // Using global CSS variables defined in index.html for sizing.
        // Removed min-h to allow height to be determined exactly by content for line counts.
        class: 'focus:outline-none',
        spellcheck: 'false',
      },
      decorations(state) {
        const { doc } = state;
        const decorations: Decoration[] = [];
        
        matches.forEach((match, idx) => {
          const from = textOffsetToPos(doc, match.offset);
          const to = textOffsetToPos(doc, match.offset + match.length);
          
          if (to <= doc.content.size) {
            decorations.push(
              Decoration.inline(from, to, {
                class: match.rule.issueType === 'misspelling' ? 'grammar-error' : 'grammar-warning',
                'data-error-id': `${match.offset}-${match.rule.id}-${idx}`,
              })
            );
          }
        });

        return DecorationSet.create(doc, decorations);
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
        setMatches([]);
        onErrorsUpdate([]);
        return;
      }

      isCheckingRef.current = true;
      const foundMatches = await checkGrammar(text);
      isCheckingRef.current = false;

      const doc = editor.state.doc;
      const validMatches = foundMatches.filter(m => {
          const to = textOffsetToPos(doc, m.offset + m.length);
          return to <= doc.content.size;
      });

      setMatches(validMatches);

      const sidebarItems: SidebarErrorItem[] = validMatches.map((m, idx) => {
        const fromPos = textOffsetToPos(doc, m.offset);
        const toPos = textOffsetToPos(doc, m.offset + m.length);

        return {
          id: `${m.offset}-${m.rule.id}-${idx}`,
          from: fromPos,
          to: toPos,
          message: m.shortMessage || m.message,
          replacements: m.replacements.map(r => r.value),
          context: text.substring(Math.max(0, m.offset - 10), Math.min(text.length, m.offset + m.length + 10)),
          type: m.rule.issueType === 'misspelling' ? 'error' : 'warning',
        };
      });

      onErrorsUpdate(sidebarItems);
      editor.view.dispatch(editor.state.tr);
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
      editor.chain().focus().setTextSelection({ from: error.from, to: error.to }).insertContent(replacement).run();
      setMatches(prev => prev.filter((m, idx) => `${m.offset}-${m.rule.id}-${idx}` !== error.id));
      onActionComplete();
    }

    if (externalAction.type === 'fixAll') {
      const sortedErrors = [...externalAction.payload.errors].sort((a, b) => b.from - a.from);
      const chain = editor.chain().focus();
      sortedErrors.forEach((error: SidebarErrorItem) => {
         if (error.replacements.length > 0) {
            chain.setTextSelection({ from: error.from, to: error.to }).insertContent(error.replacements[0]);
         }
      });
      chain.run();
      setMatches([]);
      onErrorsUpdate([]);
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
        } catch (e) {
          console.error(e);
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
          } catch (e) {
            console.error(e);
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

  return (
    <div 
      className="w-full h-full relative cursor-text flex overflow-hidden" 
      onClick={() => editor.chain().focus().run()}
      ref={containerRef}
    >
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
