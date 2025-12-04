import React, { useLayoutEffect, useRef } from 'react';
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
  const toolbarRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    // Use offsetParent (which is the relative container in Editor)
    const container = toolbar.offsetParent as HTMLElement;
    if (!container) return;

    const toolbarWidth = toolbar.offsetWidth;
    const containerWidth = container.offsetWidth;

    // The 'left' prop is the center point.
    // Calculate theoretical edges:
    const leftEdge = position.left - toolbarWidth / 2;
    const rightEdge = position.left + toolbarWidth / 2;

    let offset = 0;
    const PADDING = 8; // Keep some distance from the edge

    if (leftEdge < PADDING) {
        // If clipping on left, shift right
        offset = PADDING - leftEdge;
    } else if (rightEdge > containerWidth - PADDING) {
        // If clipping on right, shift left
        offset = -(rightEdge - (containerWidth - PADDING));
    }

    toolbar.style.setProperty('--toolbar-offset-x', `${offset}px`);

  }, [position]);

  return (
    <div
      ref={toolbarRef}
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
