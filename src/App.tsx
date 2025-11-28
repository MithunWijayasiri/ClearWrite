import React, { useState, useEffect } from 'react';
import { Editor } from './components/Editor';
import { Sidebar } from './components/Sidebar';
import { SidebarErrorItem, EditorStats } from './types';
import { FileText, Github, Sun, Moon, Copy, Check } from 'lucide-react';

export type ProcessingState = 'enhance' | 'summarize' | null;

function App() {
  const [stats, setStats] = useState<EditorStats>({ words: 0, characters: 0 });
  const [errors, setErrors] = useState<SidebarErrorItem[]>([]);
  const [processingState, setProcessingState] = useState<ProcessingState>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isCopied, setIsCopied] = useState(false);
  const [activeErrorId, setActiveErrorId] = useState<string | null>(null);
  const [editorAction, setEditorAction] = useState<{ 
    type: 'fix' | 'enhance' | 'summarize' | 'fixAll' | 'scroll' | 'copy', 
    payload?: any 
  } | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleCopy = () => {
    setEditorAction({ type: 'copy' });
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleFixError = (error: SidebarErrorItem, replacement: string) => {
    setEditorAction({ type: 'fix', payload: { error, replacement } });
    setActiveErrorId(null);
  };

  const handleFixAll = () => {
    setEditorAction({ type: 'fixAll', payload: { errors } });
    setActiveErrorId(null);
  };

  const handleEnhance = () => {
    setEditorAction({ type: 'enhance' });
  };

  const handleSummarize = () => {
    setEditorAction({ type: 'summarize' });
  };

  const handleScrollToError = (from: number) => {
    setEditorAction({ type: 'scroll', payload: from });
  };

  const handleActionComplete = () => {
    setEditorAction(null);
  };

  const handleErrorClick = (id: string | null) => {
    setActiveErrorId(id);
  };

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden font-sans transition-colors duration-300">
      {/* Main Content Area (Left) */}
      <main className="flex-1 flex flex-col relative">
        {/* Minimal Header */}
        <header className="h-14 border-b border-text/10 flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm z-10 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-text/10 rounded flex items-center justify-center">
              <FileText size={16} className="text-text" />
            </div>
            <h1 className="text-lg font-mono font-bold tracking-tight text-text">
              ClearWrite
            </h1>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
            <button 
              onClick={toggleTheme}
              className="hover:text-text transition-colors p-1.5 rounded hover:bg-text/5"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="w-px h-4 bg-text/10 mx-1"></div>
            <a href="#" className="hover:text-text transition-colors flex items-center gap-2">
              <Github size={16} />
            </a>
          </div>
        </header>

        {/* Editor Container - Removing overflow-y-auto here to let Editor handle it with line numbers */}
        <div className="flex-1 overflow-hidden relative">
          <div className="max-w-4xl mx-auto h-full">
            <Editor 
              onStatsUpdate={setStats} 
              onErrorsUpdate={setErrors}
              processingState={processingState}
              setProcessingState={setProcessingState}
              externalAction={editorAction}
              onActionComplete={handleActionComplete}
              onErrorClick={handleErrorClick}
            />
          </div>
        </div>

        {/* Status Bar */}
        <footer className="h-8 border-t border-text/10 bg-background flex items-center justify-between px-6 text-[10px] font-mono text-gray-500 uppercase tracking-wider transition-colors">
          <div className="flex gap-4">
             <span>Draft.txt</span>
             {processingState && <span className="text-accent animate-pulse">AI Processing...</span>}
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleCopy}
              className="hover:text-text transition-colors flex items-center justify-center"
              title="Copy text"
            >
              {isCopied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
            </button>
            <div className="w-px h-3 bg-text/20"></div>
            <span>{stats.words} Words</span>
            <span>{stats.characters} Chars</span>
          </div>
        </footer>
      </main>

      {/* Sidebar (Right) */}
      <aside className="w-80 h-full shrink-0">
        <Sidebar 
          errors={errors}
          processingState={processingState}
          onFixError={handleFixError}
          onFixAll={handleFixAll}
          onEnhance={handleEnhance}
          onSummarize={handleSummarize}
          onScrollToError={handleScrollToError}
          activeErrorId={activeErrorId}
        />
      </aside>
    </div>
  );
}

export default App;
