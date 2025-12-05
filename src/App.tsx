import React, { useState, useEffect } from 'react';
import { Editor } from './components/Editor';
import { Sidebar } from './components/Sidebar';
import { SidebarErrorItem, EditorStats } from './types';
import { FileText, Github, Sun, Moon, Copy, Check, Wand2 } from 'lucide-react';

export type ProcessingState = 'enhance' | 'summarize' | null;

function App() {
  const [stats, setStats] = useState<EditorStats>({ words: 0, characters: 0 });
  const [errors, setErrors] = useState<SidebarErrorItem[]>([]);
  const [processingState, setProcessingState] = useState<ProcessingState>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isCopied, setIsCopied] = useState(false);
  const [activeErrorId, setActiveErrorId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [editorAction, setEditorAction] = useState<{ 
    type: 'fix' | 'enhance' | 'summarize' | 'fixAll' | 'scroll' | 'copy', 
    payload?: any 
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'assistant'>('editor');
  const [isGrammarChecking, setIsGrammarChecking] = useState(false);

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

  const handleAIError = (message: string) => {
    setNotification({ message, type: 'error' });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleScrollToError = (from: number) => {
    setEditorAction({ type: 'scroll', payload: from });
    // Switch to editor view on mobile when clicking an error
    setActiveTab('editor');
  };

  const handleActionComplete = () => {
    setEditorAction(null);
  };

  const handleErrorClick = (id: string | null) => {
    setActiveErrorId(id);
    if (id) {
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-background overflow-hidden font-sans transition-colors duration-300">

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Content Area (Left) */}
        <main className={`flex-1 flex flex-col relative min-w-0 ${activeTab === 'assistant' ? 'hidden md:flex' : 'flex'}`}>
          {/* Minimal Header */}
          <header className="h-14 border-b border-text/10 flex items-center justify-between px-4 md:px-6 bg-background/80 backdrop-blur-sm z-10 transition-colors shrink-0">
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
              <div className="w-px h-4 bg-text/10 mx-1 hidden sm:block"></div>
              <a
                href="https://github.com/MithunWijayasiri/ClearWrite"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-text transition-colors items-center gap-2 hidden sm:flex"
              >
                <Github size={16} />
              </a>
            </div>
          </header>

          {/* Editor Container - Removing overflow-y-auto here to let Editor handle it with line numbers */}
          <div className="flex-1 overflow-hidden relative">
            <div className="max-w-7xl mx-auto h-full">
              <Editor
                onStatsUpdate={setStats}
                onErrorsUpdate={setErrors}
                processingState={processingState}
                setProcessingState={setProcessingState}
                externalAction={editorAction}
                onActionComplete={handleActionComplete}
                onErrorClick={handleErrorClick}
                onAIError={handleAIError}
                setIsGrammarChecking={setIsGrammarChecking}
              />
            </div>
          </div>

          {/* Notification Toast */}
          {notification && (
            <div className={`absolute bottom-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-50 transition-all duration-300 w-max max-w-[90%] text-center ${
              notification.type === 'error'
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-green-500/10 text-green-400 border border-green-500/20'
            }`}>
              {notification.message}
            </div>
          )}

          {/* Status Bar */}
          <footer className="h-8 border-t border-text/10 bg-background flex items-center justify-between px-4 md:px-6 text-[10px] font-mono text-gray-500 uppercase tracking-wider transition-colors shrink-0">
            <div className="flex gap-4">
              <span className="truncate max-w-[100px] sm:max-w-none">Draft.txt</span>
              {processingState && <span className="text-accent animate-pulse hidden sm:inline">AI Processing...</span>}
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
              <span>{stats.words} <span className="hidden sm:inline">Words</span><span className="sm:hidden">w</span></span>
              <span>{stats.characters} <span className="hidden sm:inline">Chars</span><span className="sm:hidden">c</span></span>
            </div>
          </footer>
        </main>

        {/* Sidebar (Right) */}
        <aside className={`h-full shrink-0 ${activeTab === 'editor' ? 'hidden md:block w-80' : 'w-full md:w-80'}`}>
          <Sidebar
            errors={errors}
            processingState={processingState}
            onFixError={handleFixError}
            onFixAll={handleFixAll}
            onEnhance={handleEnhance}
            onSummarize={handleSummarize}
            onScrollToError={handleScrollToError}
            activeErrorId={activeErrorId}
            isGrammarChecking={isGrammarChecking}
          />
        </aside>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden h-14 bg-surface border-t border-text/10 flex items-center justify-around shrink-0 z-50">
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${
            activeTab === 'editor' ? 'text-accent' : 'text-text/40 hover:text-text/60'
          }`}
        >
          <FileText size={20} />
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Editor</span>
        </button>
        <button
          onClick={() => setActiveTab('assistant')}
          className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors relative ${
            activeTab === 'assistant' ? 'text-accent' : 'text-text/40 hover:text-text/60'
          }`}
        >
          <div className="relative">
            <Wand2 size={20} />
            {errors.length > 0 && (
              <span className="absolute -top-1 -right-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-error text-[8px] font-bold text-white">
                {errors.length > 9 ? '!' : errors.length}
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Assistant</span>
        </button>
      </div>
    </div>
  );
}

export default App;
