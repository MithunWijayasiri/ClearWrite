// App.tsx
// Clear Write - A tool to elevate your writing with perfect grammar and style
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { debounce } from 'lodash';
import './App.css';

// Enhanced Interfaces
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
    urls?: Array<{ value: string }>;
  };
}

interface ApiResponse {
  matches: ApiMatch[];
  language?: {
    name: string;
    code: string;
  };
}

interface Suggestion {
  id: string;
  original: string;
  suggestion: string;
  explanation: string;
  offset: number;
  length: number;
  category: string;
  ruleId: string;
  urls?: string[];
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

interface LanguageOption {
  code: string;
  name: string;
}

// Supported Languages
const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
];

// Enhanced API Call Function
const checkGrammarWithAPI = async (text: string, language: string): Promise<Suggestion[]> => {
  if (!text.trim()) return [];
  
  // Ensure we have a valid language code
  const actualLanguage = language || 'en-US';
  
  const params = new URLSearchParams();
  params.append('text', text);
  params.append('language', actualLanguage);
  params.append('level', 'picky');
  params.append('enabledOnly', 'false');
  params.append('disabledRules', 'UPPERCASE_SENTENCE_START');

  try {
    const response = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params.toString(),
    });

    if (!response.ok) {
      let errorBody = 'Unknown API Error';
      try {
        const errorData = await response.json();
        errorBody = errorData.message || JSON.stringify(errorData);
      } catch (_e) {
        errorBody = response.statusText;
      }
      
      if (response.status === 429) {
        throw new Error('API rate limit exceeded. Please try again later.');
      }
      throw new Error(`API Error: ${response.status} ${errorBody}`);
    }

    const data: ApiResponse = await response.json();
    
    console.log('LanguageTool API response:', data);
    
    if (!data.matches || !Array.isArray(data.matches)) {
      console.warn('Unexpected API response format:', data);
      return [];
    }
    
    const suggestions: Suggestion[] = data.matches.map((match, index) => ({
      id: `${match.offset}-${match.length}-${match.rule.id}-${index}`,
      original: text.substring(match.offset, match.offset + match.length),
      suggestion: match.replacements.length > 0 ? match.replacements[0].value : 'N/A',
      explanation: match.message,
      offset: match.offset,
      length: match.length,
      category: match.rule.category.name,
      ruleId: match.rule.id,
      urls: match.rule.urls?.map(url => url.value),
    }));

    // Sort suggestions by their position in the text
    suggestions.sort((a, b) => a.offset - b.offset);
    return suggestions;
  } catch (error) {
    console.error('Error checking grammar:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Unknown error while checking grammar');
    }
  }
};

// API Call Function for Synonyms
const fetchSynonyms = async (word: string): Promise<string[]> => {
  if (!word || word.length < 3 || !/^[a-zA-Z]+$/.test(word)) return [];
  
  try {
    const response = await fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}&max=8`);
    if (!response.ok) throw new Error(`Synonym API Error: ${response.status}`);
    const data: SynonymWord[] = await response.json();
    return data.map(item => item.word);
  } catch (error) {
    console.error('Error fetching synonyms:', error);
    throw error;
  }
};

// Icons
const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
  </svg>
);

const ClearWritePage = () => {
  const [text, setText] = useState<string>('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoadingGrammar, setIsLoadingGrammar] = useState<boolean>(false);
  const [grammarError, setGrammarError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [processingSuggestionId, setProcessingSuggestionId] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en-US');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [synonymPopupState, setSynonymPopupState] = useState<SynonymPopupState>({ 
    visible: false, 
    loading: false, 
    error: null, 
    synonyms: [], 
    x: 0, 
    y: 0, 
    word: null 
  });
  const hoveredWordRef = useRef<string | null>(null);

  // Apply dark mode class to HTML element
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // Debounced grammar check
  const debouncedCheckGrammar = useMemo(() => debounce(async (textToCheck: string, language: string) => {
    if (!textToCheck.trim()) {
      setSuggestions([]);
      setGrammarError(null);
      setIsLoadingGrammar(false);
      return;
    }

    setIsLoadingGrammar(true);
    setGrammarError(null);
    
    try {
      const foundSuggestions = await checkGrammarWithAPI(textToCheck, language);
      setSuggestions(foundSuggestions);
    } catch (err: any) {
      setGrammarError(err.message || 'Failed to check grammar.');
      setSuggestions([]);
    } finally {
      setIsLoadingGrammar(false);
    }
  }, 750), []);

  // Handle text changes
  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = event.target.value;
    setText(newText);
    setGrammarError(null);
    setSynonymPopupState(prev => ({ ...prev, visible: false, word: null }));
    hoveredWordRef.current = null;
    
    // Trigger debounced grammar check
    debouncedCheckGrammar(newText, selectedLanguage);
  };

  // Apply suggestion to text
  const applySuggestion = (suggestionToApply: Suggestion) => {
    const { id, offset, length, suggestion } = suggestionToApply;
    if (suggestion === 'N/A') return;
    
    setProcessingSuggestionId(id);
    const newText = text.substring(0, offset) + suggestion + text.substring(offset + length);
    setText(newText);
    setSuggestions(prev => prev.filter(s => s.id !== id));
    setSynonymPopupState(prev => ({ ...prev, visible: false, word: null }));
    hoveredWordRef.current = null;
    
    // Recheck grammar after applying suggestion
    debouncedCheckGrammar(newText, selectedLanguage);
  };

  // Handle word hover for synonyms
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLTextAreaElement>) => {
    if (!textareaRef.current) return;
    
    const target = textareaRef.current;
    const rect = target.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    // Check if mouse is outside textarea
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      if (synonymPopupState.visible) {
        setSynonymPopupState(prev => ({ ...prev, visible: false, word: null }));
        hoveredWordRef.current = null;
      }
      return;
    }

    // Get word at cursor position
    let word: string | null = null;
    let wordRect: DOMRect | null = null;

    try {
      if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(x, y);
        if (range && range.startContainer) {
          // Only try to expand if the node is a text node (nodeType 3)
          // This helps avoid issues in Chrome where non-text nodes might be selected
          if (range.startContainer.nodeType === Node.TEXT_NODE) {
            range.expand('word');
            const potentialWord = range.toString().trim().replace(/[^a-zA-Z'-]/g, '');
            
            // More strict validation for words - ensure it's a real word
            if (potentialWord.length > 2 && /^[a-zA-Z'-]+$/.test(potentialWord)) {
              // Skip words that might be UI elements like "Suggestions" or "Checking"
              const commonUIWords = ['suggestions', 'checking', 'synonyms', 'loading', 'apply'];
              if (!commonUIWords.includes(potentialWord.toLowerCase())) {
                word = potentialWord;
                wordRect = range.getBoundingClientRect();
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error getting word at cursor position:', error);
    }

    // Handle new word hover
    if (word && word !== hoveredWordRef.current) {
      hoveredWordRef.current = word;
      const popupX = wordRect ? wordRect.left + window.scrollX : event.pageX;
      const popupY = wordRect ? wordRect.bottom + window.scrollY + 5 : event.pageY + 15;

      setSynonymPopupState({ 
        visible: true, 
        loading: true, 
        error: null, 
        synonyms: [], 
        x: popupX, 
        y: popupY, 
        word: word 
      });

      // Fetch synonyms
      fetchSynonyms(word)
        .then(syns => {
          if (hoveredWordRef.current === word) {
            setSynonymPopupState(prev => ({ 
              ...prev, 
              loading: false, 
              synonyms: syns 
            }));
          }
        })
        .catch(err => {
          if (hoveredWordRef.current === word) {
            setSynonymPopupState(prev => ({ 
              ...prev, 
              loading: false, 
              error: 'Could not fetch synonyms.' 
            }));
          }
        });
    } else if (!word && hoveredWordRef.current) {
      hoveredWordRef.current = null;
      
      // Hide popup when we don't have a valid word
      if (synonymPopupState.visible) {
        setSynonymPopupState(prev => ({ ...prev, visible: false, word: null }));
      }
    }
  }, [synonymPopupState.visible]);

  // Debounce mouse move events
  const debouncedMouseMove = useMemo(() => debounce(handleMouseMove, 300), [handleMouseMove]);

  // Hide synonym popup when mouse leaves textarea
  const handleMouseLeave = () => {
    setSynonymPopupState(prev => ({ ...prev, visible: false, word: null }));
    hoveredWordRef.current = null;
  };

  // Hide synonym popup on scroll
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

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      debouncedCheckGrammar.cancel();
    };
  }, [debouncedCheckGrammar]);

  // UI state variables
  const shouldShowSuggestions = !isLoadingGrammar && !grammarError && suggestions.length > 0;
  const shouldShowLooksGood = !isLoadingGrammar && !grammarError && text.trim() && suggestions.length === 0;

  return (
    <div className={`clear-write ${isDarkMode ? 'dark' : ''}`}>
      <div className="container py-4 md:py-6">
        {/* Header */}
        <header className="header mb-4">
          <div>
            <h1 className="title">Clear Write</h1>
            {/* Added subheading class */}
            <p className="subheading text-sm mt-1">
              Elevate Your Writing with Perfect Grammar and Style.
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Language Selector */}
            <select
              value={selectedLanguage}
              onChange={(e) => {
                setSelectedLanguage(e.target.value);
                debouncedCheckGrammar(text, e.target.value);
              }}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="theme-toggle p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="space-y-4 relative">
          {/* Text Area */}
          <div className="relative mb-4">
            <textarea
              ref={textareaRef}
              rows={10}
              className="text-area transition-colors duration-200"
              placeholder="Paste or type your text here..."
              value={text}
              onChange={handleTextChange}
              onMouseMove={debouncedMouseMove}
              onMouseLeave={handleMouseLeave}
            />
            {isLoadingGrammar && (
              <div className="checking-indicator flex items-center">
                <span className="mr-2">Checking</span>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Grammar Error Display */}
          {grammarError && (
            <div className="error-message animate-fade-in mb-4">
              <p className="font-semibold">Error:</p>
              <p>{grammarError}</p>
              {grammarError.includes('rate limit') && (
                <p className="text-sm mt-2">Free API has limits. Consider self-hosting for higher usage.</p>
              )}
            </div>
          )}

          {/* Grammar Suggestions List */}
          <div className="space-y-2 pt-2">
            <h2 className={`suggestion-heading transition-all duration-200 ${
              shouldShowSuggestions ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'
            }`}>
              Suggestions ({suggestions.length})
            </h2>
            
            <ul className={`suggestion-list transition-opacity duration-200 ${
              isLoadingGrammar ? 'opacity-50' : 'opacity-100'
            }`}>
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
                  <li 
                    key={suggestion.id} 
                    className={`suggestion-item ${categoryClass} transition-opacity duration-200 ${
                      processingSuggestionId === suggestion.id ? 'opacity-0' : 'opacity-100'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                      <div className="mb-3 sm:mb-0 flex-1 mr-4">
                        <span className={`category-badge ${categoryBadgeClass}`}>
                          {suggestion.category}
                        </span>
                        <p className="issue-text mt-1">
                          Issue near: "...<span className="original-text">{suggestion.original}</span>..."
                        </p>
                        
                        {suggestion.suggestion !== 'N/A' && (
                          <p className="suggestion-text mt-2">
                            Suggest: <span className="suggestion-text-highlight">{suggestion.suggestion}</span>
                          </p>
                        )}
                        
                        <p className="explanation-text mt-1">{suggestion.explanation}</p>
                        
                        {suggestion.urls && suggestion.urls.length > 0 && (
                          <div className="mt-2">
                            <a 
                              href={suggestion.urls[0]} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Learn more about this rule
                            </a>
                          </div>
                        )}
                      </div>
                      
                      {suggestion.suggestion !== 'N/A' && (
                        <button
                          onClick={() => applySuggestion(suggestion)}
                          className="apply-button mt-2 sm:mt-0"
                          disabled={processingSuggestionId === suggestion.id}
                        >
                          {processingSuggestionId === suggestion.id ? 'Applying...' : 'Apply'}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* "Looks good" Message */}
          <div className={`success-message transition-all duration-300 ${
            shouldShowLooksGood ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'
          }`}>
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Looks good! No suggestions found.</span>
            </div>
          </div>

          {/* Synonym Popup */}
          {synonymPopupState.visible && synonymPopupState.word && (
            <div
              className="synonym-popup animate-fade-in"
              style={{ 
                left: `${synonymPopupState.x}px`, 
                top: `${synonymPopupState.y}px`,
              }}
            >
              <div className="synonym-header">
                Synonyms for "{synonymPopupState.word}"
              </div>
              
              {synonymPopupState.loading && (
                <div className="synonym-loading py-2">
                  <div className="flex items-center">
                    <div className="animate-spin mr-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <span>Loading...</span>
                  </div>
                </div>
              )}
              
              {synonymPopupState.error && (
                <div className="synonym-error py-2">
                  {synonymPopupState.error}
                </div>
              )}
              
              {!synonymPopupState.loading && !synonymPopupState.error && synonymPopupState.synonyms.length === 0 && (
                <div className="synonym-empty py-2">
                  No synonyms found
                </div>
              )}
              
              {!synonymPopupState.loading && !synonymPopupState.error && synonymPopupState.synonyms.length > 0 && (
                <ul className="synonym-list max-h-40 overflow-y-auto py-1">
                  {synonymPopupState.synonyms.map((syn, index) => (
                    <li 
                      key={index} 
                      className="synonym-item px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                      onClick={() => {
                        if (!textareaRef.current || !synonymPopupState.word) return;
                        
                        const textarea = textareaRef.current;
                        const currentText = textarea.value;
                        const selectionStart = textarea.selectionStart;
                        
                        // Find and replace the word
                        const regex = new RegExp(`\\b${synonymPopupState.word}\\b`);
                        const newText = currentText.replace(regex, syn);
                        
                        setText(newText);
                        setSynonymPopupState(prev => ({ ...prev, visible: false }));
                        debouncedCheckGrammar(newText, selectedLanguage);
                        
                        // Focus back on textarea
                        setTimeout(() => {
                          textarea.focus();
                          textarea.selectionStart = selectionStart;
                          textarea.selectionEnd = selectionStart;
                        }, 0);
                      }}
                    >
                      {syn}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ClearWritePage;
