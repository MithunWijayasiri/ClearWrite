import React from 'react';
import { Wand2, FileText } from 'lucide-react';
import { ProcessingState } from '../App';

interface SelectionToolbarProps {
  position: { top: number; left: number };
  onEnhance: () => void;
  onSummarize: () => void;
  processingState: ProcessingState;
}

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  position,
  onEnhance,
  onSummarize,
  processingState,
}) => {
  const isBusy = processingState !== null;

  return (
    <div
      className="selection-toolbar"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <button
        onClick={onEnhance}
        disabled={isBusy}
        className="selection-toolbar-btn"
        title="Enhance selected text"
      >
        <Wand2 size={14} />
        <span>Enhance</span>
      </button>
      <div className="selection-toolbar-divider" />
      <button
        onClick={onSummarize}
        disabled={isBusy}
        className="selection-toolbar-btn"
        title="Summarize selected text"
      >
        <FileText size={14} />
        <span>Summarize</span>
      </button>
    </div>
  );
};
