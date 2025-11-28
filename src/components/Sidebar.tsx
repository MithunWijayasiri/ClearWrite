import React, { useEffect, useRef } from 'react';
import { SidebarErrorItem } from '../types';
import { Wand2, CheckCheck, AlertCircle, AlertTriangle, FileText } from 'lucide-react';
import { ProcessingState } from '../App';

interface SidebarProps {
  errors: SidebarErrorItem[];
  processingState: ProcessingState;
  onFixError: (error: SidebarErrorItem, replacement: string) => void;
  onFixAll: () => void;
  onEnhance: () => void;
  onSummarize: () => void;
  onScrollToError: (from: number) => void;
  activeErrorId: string | null;
}

const WavyText = ({ text }: { text: string }) => {
  return (
    <span className="flex">
      {text.split('').map((char, index) => (
        <span
          key={index}
          className="animate-pulse"
          style={{ 
            animationDelay: `${index * 100}ms`,
            animationDuration: '1.5s' 
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  errors,
  processingState,
  onFixError,
  onFixAll,
  onEnhance,
  onSummarize,
  onScrollToError,
  activeErrorId
}) => {
  const itemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (activeErrorId && itemRefs.current[activeErrorId]) {
      itemRefs.current[activeErrorId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeErrorId]);

  const isEnhancing = processingState === 'enhance';
  const isSummarizing = processingState === 'summarize';
  const isBusy = processingState !== null;

  return (
    <aside className="w-full h-full flex flex-col bg-surface border-l border-text/10 transition-colors duration-300">
      {/* Header */}
      <div className="p-6 border-b border-text/10 shrink-0">
        <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-text/50 mb-4">
          Assistant
        </h2>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onEnhance}
            disabled={isBusy}
            className={`flex items-center justify-center gap-2 py-3 px-2 font-mono text-xs border transition-all duration-200 ${
              isBusy && !isEnhancing
                ? 'opacity-50 cursor-not-allowed border-text/5'
                : isEnhancing
                  ? 'border-accent text-accent bg-accent/5'
                  : 'border-text/20 text-text hover:bg-text hover:text-background hover:border-transparent active:scale-[0.98]'
            }`}
            title="Improve vocabulary and tone"
          >
            <Wand2 size={14} className={isEnhancing ? "text-accent" : ""} />
            {isEnhancing ? <WavyText text="Enhancing..." /> : 'Enhance'}
          </button>

          <button
            onClick={onSummarize}
            disabled={isBusy}
            className={`flex items-center justify-center gap-2 py-3 px-2 font-mono text-xs border transition-all duration-200 ${
              isBusy && !isSummarizing
                ? 'opacity-50 cursor-not-allowed border-text/5'
                : isSummarizing
                  ? 'border-accent text-accent bg-accent/5'
                  : 'border-text/20 text-text hover:bg-text hover:text-background hover:border-transparent active:scale-[0.98]'
            }`}
            title="Summarize text"
          >
            <FileText size={14} className={isSummarizing ? "text-accent" : ""} />
            {isSummarizing ? <WavyText text="Summarizing..." /> : 'Summarize'}
          </button>
        </div>
      </div>

      {/* Error Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 minimal-scrollbar">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-text/50">
            {errors.length} {errors.length === 1 ? 'ISSUE' : 'ISSUES'} FOUND
          </span>
          {errors.length > 0 && (
            <button
              onClick={onFixAll}
              className="text-xs font-mono text-green-500 hover:text-green-400 flex items-center gap-1 transition-colors uppercase"
            >
              <CheckCheck size={12} />
              FIX ALL
            </button>
          )}
        </div>

        {errors.length === 0 ? (
          <div className="text-center py-10 text-text/30 font-mono text-sm">
            <div className="flex justify-center mb-2 opacity-50">
               <CheckCheck size={24} />
            </div>
            All clear.
          </div>
        ) : (
          errors.map((error) => {
            const isActive = error.id === activeErrorId;
            return (
              <div 
                key={error.id}
                ref={el => { itemRefs.current[error.id] = el }}
                className={`rounded border p-3 transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'bg-text/10 border-accent shadow-sm scale-[1.02]' 
                    : 'bg-background/50 border-text/5 hover:border-text/20'
                }`}
                onClick={() => onScrollToError(error.from)}
              >
                <div className="flex items-start gap-2 mb-2">
                  {error.type === 'error' ? (
                    <AlertCircle size={14} className="text-error mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
                  )}
                  <p className="text-xs text-text/80 leading-relaxed font-sans">
                    {error.message}
                  </p>
                </div>

                {/* Context Preview */}
                <div className="text-xs font-mono text-text/50 mb-3 bg-text/5 p-1.5 rounded truncate">
                  ...{error.context}...
                </div>

                {/* Suggestions */}
                <div className="flex flex-wrap gap-2">
                  {error.replacements.slice(0, 3).map((rep, idx) => (
                    <button
                      key={`${error.id}-${idx}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFixError(error, rep);
                      }}
                      className="text-xs font-mono bg-text/5 hover:bg-green-500/20 hover:text-green-500 text-text/60 px-2 py-1 rounded transition-colors"
                    >
                      {rep}
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <div className="p-4 border-t border-text/10 text-center shrink-0">
         <p className="text-[10px] text-text/40 font-mono">
            Powered by LanguageTool & Gemini
         </p>
      </div>
    </aside>
  );
};
