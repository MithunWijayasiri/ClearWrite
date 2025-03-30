import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { debounce } from 'lodash'; // Need to install lodash: npm install lodash @types/lodash
import './App.css';

// Interfaces
interface ApiReplacement {
  value: string;
}

interface ApiMatch {
  message: string;
  shortMessage: string;
  offset: number;
  length: number;
  replacements: ApiReplacement[];
  context: {
    text: string;
    offset: number;
    length: number;
  };
  rule: {
    id: string;
    description: string;
    issueType: string;
    category: {
      id: string;
      name: string;
    };
  };
}

interface ApiResponse {
  matches: ApiMatch[];
}

interface Suggestion {
  id: string;
  original: string;
  suggestion: string;
  explanation: string;
  offset: number;
  length: number;
  category: string;
}

interface SynonymWord {
    word: string;
    score: number;
}

interface SynonymPopupState {
    visible: boolean;
    loading: boolean;
    error: string | null;
    synonyms: string[];
    x: number;
    y: number;
    word: string | null;
}

// API Call Function for Grammar
const checkGrammarWithAPI = async (text: string): Promise<Suggestion[]> => {
  if (!text.trim()) return [];
  const params = new URLSearchParams();
  params.append('text', text);
  params.append('language', 'en-US');
  params.append('level', 'picky');
  params.append('enabledOnly', 'false');

  try {
    const response = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!response.ok) {
      let errorBody = 'Unknown API Error';
      try { const errorData = await response.json(); errorBody = errorData.message || JSON.stringify(errorData); } catch (_e) { errorBody = response.statusText; }
      throw new Error(`API Error: ${response.status} ${errorBody}`);
    }
    const data: ApiResponse = await response.json();
    const suggestions: Suggestion[] = data.matches.map((match, index) => ({
      id: `${match.offset}-${match.length}-${match.rule.id}-${match.replacements[0]?.value || 'no-rep'}-${index}`,
      original: text.substring(match.offset, match.offset + match.length),
      suggestion: match.replacements.length > 0 ? match.replacements[0].value : 'N/A',
      explanation: match.message,
      offset: match.offset,
      length: match.length,
      category: match.rule.category.name,
    }));
    suggestions.sort((a, b) => a.offset - b.offset);
    return suggestions;
  } catch (error) {
    console.error('Error checking grammar:', error);
    if (error instanceof Error && error.message.includes('429')) { throw new Error('API usage limit likely reached. Please try again later.'); }
    throw error;
  }
};

// API Call Function for Synonyms
const fetchSynonyms = async (word: string): Promise<string[]> => {
    if (!word || word.length < 3 || !/^[a-zA-Z]+$/.test(word)) return [];
    try {
        const response = await fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}&max=10`);
        if (!response.ok) throw new Error(`Synonym API Error: ${response.status}`);
        const data: SynonymWord[] = await response.json();
        return data.map(item => item.word);
    } catch (error) {
        console.error('Error fetching synonyms:', error);
        throw error;
    }
};

// Icons
const SunIcon = () => <div className="w-5 h-5 border-2 border-current rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-current rounded-full"></div></div>;
const MoonIcon = () => <div className="w-5 h-5 border-2 border-current rounded-full flex items-center justify-center"><div className="w-3 h-3 bg-current rounded-full transform -translate-x-0.5 translate-y-0.5 scale-75"></div></div>;

export default function GrammarCheckerPage() {
  const [text, setText] = useState<string>('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [grammarDebounceTimeout, setGrammarDebounceTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isLoadingGrammar, setIsLoadingGrammar] = useState<boolean>(false);
  const [grammarError, setGrammarError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [processingSuggestionId, setProcessingSuggestionId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [synonymPopupState, setSynonymPopupState] = useState<SynonymPopupState>({ visible: false, loading: false, error: null, synonyms: [], x: 0, y: 0, word: null });
  const hoveredWordRef = useRef<string | null>(null);

  useEffect(() => {
    const htmlElement = document.documentElement;
    if (isDarkMode) htmlElement.classList.add('dark'); else htmlElement.classList.remove('dark');
  }, [isDarkMode]);

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
    setGrammarError(null);
    setSynonymPopupState(prev => ({ ...prev, visible: false, word: null }));
    hoveredWordRef.current = null;
  };

  useEffect(() => {
    if (grammarDebounceTimeout) clearTimeout(grammarDebounceTimeout);
    setProcessingSuggestionId(null);
    const timeoutId = setTimeout(async () => {
      if (text.trim()) {
        setIsLoadingGrammar(true); setGrammarError(null);
        try {
          const foundSuggestions = await checkGrammarWithAPI(text);
          setSuggestions(foundSuggestions);
        } catch (err: any) { setGrammarError(err.message || 'Failed to check grammar.'); setSuggestions([]); }
        finally { setIsLoadingGrammar(false); }
      } else { setSuggestions([]); setGrammarError(null); setIsLoadingGrammar(false); }
    }, 750);
    setGrammarDebounceTimeout(timeoutId);
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const applySuggestion = (suggestionToApply: Suggestion) => {
    const { id, offset, length, suggestion } = suggestionToApply;
    if (suggestion === 'N/A') return;
    setProcessingSuggestionId(id);
    const newText = text.substring(0, offset) + suggestion + text.substring(offset + length);
    setText(newText);
    setSuggestions(prev => prev.filter(s => s.id !== id));
    setSynonymPopupState(prev => ({ ...prev, visible: false, word: null }));
    hoveredWordRef.current = null;
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLTextAreaElement>) => {
    if (!textareaRef.current) return;
    const target = textareaRef.current;
    const rect = target.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        if (synonymPopupState.visible) {
             setSynonymPopupState(prev => ({ ...prev, visible: false, word: null }));
             hoveredWordRef.current = null;
        }
        return;
    }

    let word: string | null = null;
    let wordRect: DOMRect | null = null;

    if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(x, y);
        if (range) {
            range.expand('word');
            const potentialWord = range.toString().trim().replace(/[^a-zA-Z]/g, '');
            if (potentialWord.length > 2) {
                word = potentialWord;
                wordRect = range.getBoundingClientRect();
            }
        }
    }

    if (word && word !== hoveredWordRef.current) {
        hoveredWordRef.current = word;
        const popupX = wordRect ? wordRect.left + window.scrollX : event.pageX;
        const popupY = wordRect ? wordRect.bottom + window.scrollY + 5 : event.pageY + 15;

        setSynonymPopupState({ visible: true, loading: true, error: null, synonyms: [], x: popupX, y: popupY, word: word });

        fetchSynonyms(word)
            .then(syns => { if (hoveredWordRef.current === word) setSynonymPopupState(prev => ({ ...prev, loading: false, synonyms: syns })); })
            .catch(err => { if (hoveredWordRef.current === word) setSynonymPopupState(prev => ({ ...prev, loading: false, error: 'Could not fetch synonyms.' })); });
    } else if (!word && hoveredWordRef.current) {
        hoveredWordRef.current = null;
    }
  }, [synonymPopupState.visible]);

  const debouncedMouseMove = useMemo(() => debounce(handleMouseMove, 300), [handleMouseMove]);

  const handleMouseLeave = () => {
      setSynonymPopupState(prev => ({ ...prev, visible: false, word: null }));
      hoveredWordRef.current = null;
  };

  useEffect(() => {
    const handleScroll = () => {
      if (synonymPopupState.visible) {
        setSynonymPopupState(prev => ({ ...prev, visible: false, word: null }));
        hoveredWordRef.current = null;
      }
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [synonymPopupState.visible]);

  const shouldShowSuggestions = !isLoadingGrammar && !grammarError && suggestions.length > 0;
  const shouldShowLooksGood = !isLoadingGrammar && !grammarError && text.trim() && suggestions.length === 0;

  return (
    <div className={`grammar-checker ${isDarkMode ? 'dark' : ''}`}>
      <div className="container py-12">
        {/* Header */}
        <header className="header">
          <h1 className="title">Grammar Checker</h1>
          <button onClick={toggleDarkMode} className="theme-toggle" aria-label="Toggle theme">
            {isDarkMode ? <SunIcon /> : <MoonIcon />}
          </button>
        </header>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Elevate Your Writing with Perfect Grammar and Style.</p>

        {/* Main Content Area */}
        <main className="space-y-8 relative">
          {/* Text Area */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              rows={12}
              className="text-area"
              placeholder="Paste or type your text here..."
              value={text}
              onChange={handleTextChange}
              onMouseMove={debouncedMouseMove}
              onMouseLeave={handleMouseLeave}
            />
            {isLoadingGrammar && <div className="checking-indicator">Checking...</div>}
          </div>

          {/* Grammar Error Display */}
          {grammarError && (
            <div className="error-message">
              <p><span className="font-semibold">Error:</span> {grammarError}</p>
            </div>
          )}

          {/* Grammar Suggestions List */}
          <div className="space-y-4">
             <h2 className={`suggestion-heading ${shouldShowSuggestions ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>Suggestions:</h2>
             <ul className={`suggestion-list ${isLoadingGrammar ? 'loading' : ''}`}>  
              {suggestions.map((suggestion) => {
                const categoryClass = 
                  suggestion.category.toLowerCase() === 'grammar' ? 'suggestion-item-grammar' :
                  suggestion.category.toLowerCase() === 'typos' ? 'suggestion-item-typos' :
                  ['style', 'clarity', 'conciseness'].includes(suggestion.category.toLowerCase()) ? 'suggestion-item-style' :
                  suggestion.category.toLowerCase() === 'punctuation' ? 'suggestion-item-punctuation' : 'suggestion-item-default';
                
                const categoryBadgeClass = 
                  suggestion.category.toLowerCase() === 'grammar' ? 'category-badge-grammar' :
                  suggestion.category.toLowerCase() === 'typos' ? 'category-badge-typos' :
                  ['style', 'clarity', 'conciseness'].includes(suggestion.category.toLowerCase()) ? 'category-badge-style' :
                  suggestion.category.toLowerCase() === 'punctuation' ? 'category-badge-punctuation' : 'category-badge-default';
                
                return (
                  <li key={suggestion.id} className={`suggestion-item ${categoryClass} ${processingSuggestionId === suggestion.id ? 'opacity-0' : 'opacity-100'}`}>  
                    {/* Suggestion Content */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                      <div className="mb-3 sm:mb-0 flex-1 mr-4">
                        <span className={`category-badge ${categoryBadgeClass}`}>{suggestion.category}</span>
                        <p className="issue-text">Issue near: "...<span className="original-text">{suggestion.original}</span>..."</p>
                        {suggestion.suggestion !== 'N/A' && (
                          <p className="suggestion-text mt-1">
                            Suggest: <span className="suggestion-text-highlight">{suggestion.suggestion}</span>
                          </p>
                        )}
                        <p className="explanation-text">{suggestion.explanation}</p>
                      </div>
                      {suggestion.suggestion !== 'N/A' && (
                        <button 
                          onClick={() => applySuggestion(suggestion)} 
                          className="apply-button" 
                          disabled={processingSuggestionId === suggestion.id}
                        >
                          Apply
                        </button>
                      )}
                    </div>
                    {/* End Suggestion Content */}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* "Looks good" Message */}
          <div className={`success-message ${shouldShowLooksGood ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>  
             {shouldShowLooksGood && <p>Looks good! No suggestions found.</p>}
          </div>

          {/* Synonym Popup */}
          {synonymPopupState.visible && synonymPopupState.word && (
            <div
              className="synonym-popup"
              style={{ left: `${synonymPopupState.x}px`, top: `${synonymPopupState.y}px`, opacity: synonymPopupState.visible ? 1 : 0 }}
            >
              <div className="synonym-header">Synonyms for "{synonymPopupState.word}"</div>
              {synonymPopupState.loading && <div className="synonym-loading">Loading...</div>}
              {synonymPopupState.error && <div className="synonym-error">{synonymPopupState.error}</div>}
              {!synonymPopupState.loading && !synonymPopupState.error && synonymPopupState.synonyms.length === 0 && (
                <div className="synonym-empty">No synonyms found.</div>
              )}
              {!synonymPopupState.loading && !synonymPopupState.error && synonymPopupState.synonyms.length > 0 && (
                <ul className="synonym-list space-y-1">
                  {synonymPopupState.synonyms.map((syn, index) => (
                    <li key={index} className="synonym-item">{syn}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </main>
        {/* End Main Content Area */}
      </div>
    </div>
  );
}
