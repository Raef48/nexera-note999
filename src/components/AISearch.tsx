import React, { useState } from 'react';
import { Search, X, Sparkles, FileText, Loader2, MessageSquare, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { searchNotes } from '../services/ai-functions';
import { checkUsageLimit } from '../services/usage-limits';

interface AISearchProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onNoteSelect?: (noteId: string) => void;
}

interface SearchResult {
  id: string;
  title: string;
  relevanceScore: number;
  excerpts: string[];
  updated_at: string;
}

export default function AISearch({ isOpen, onClose, userId, onNoteSelect }: AISearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<{
    results: SearchResult[];
    ragAnswer?: string;
    sources?: Array<{ noteId: string; title: string; excerpt: string }>;
  } | null>(null);
  const [searchMode, setSearchMode] = useState<'search' | 'rag' | 'both'>('both');
  const [usageError, setUsageError] = useState<{ message: string; resetTime: string } | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    // Check usage limits before searching
    const usageCheck = await checkUsageLimit(userId);
    if (!usageCheck.canProceed) {
      setUsageError({
        message: usageCheck.message || 'Usage limit exceeded',
        resetTime: usageCheck.usage?.reset_daily_at || '',
      });
      return;
    }

    setIsSearching(true);
    setResults(null);
    setUsageError(null);

    try {
      const data = await searchNotes(query, userId, searchMode, 10);
      setResults(data);

      // Notify usage update
      window.dispatchEvent(new CustomEvent('nexera_usage_update'));
    } catch (error: any) {
      console.error('Search error:', error);
      alert('Search failed: ' + error.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl flex items-center justify-center">
              <Search size={20} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">AI Search</h2>
              <p className="text-xs text-zinc-500">Find answers across all your notes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-6 py-4 border-b border-zinc-800 flex-shrink-0 space-y-3">
          {/* Usage Limit Warning */}
          {usageError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="text-red-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-400 mb-1">{usageError.message}</p>
                  {usageError.resetTime && (
                    <p className="text-xs text-red-300/80">
                      Resets at {new Date(usageError.resetTime).toLocaleTimeString()}
                    </p>
                  )}
                  <button
                    onClick={() => setUsageError(null)}
                    className="mt-1 text-xs text-red-400 hover:text-red-300 underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask anything about your notes... (e.g., 'How do I set up CI/CD pipelines?')"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-zinc-100 placeholder-zinc-600 outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                autoFocus
              />
            </div>
            <select
              value={searchMode}
              onChange={(e) => setSearchMode(e.target.value as any)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-300 text-sm outline-none focus:border-purple-500/50 cursor-pointer"
            >
              <option value="both">Search + AI</option>
              <option value="search">Search Only</option>
              <option value="rag">AI Answer</option>
            </select>
            <button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25"
            >
              {isSearching ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search size={18} />
                  Search
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!results && !isSearching && (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600 space-y-4">
              <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800">
                <Search size={32} className="text-purple-400/50" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-zinc-500">Search your notes with AI</p>
                <p className="text-xs text-zinc-600">Ask questions and get answers from your content</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-md">
                {['What is DevOps?', 'Explain React hooks', 'Docker best practices'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => { setQuery(suggestion); }}
                    className="px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-full text-zinc-500 hover:text-purple-400 hover:border-purple-500/30 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isSearching && (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <Loader2 size={32} className="animate-spin text-purple-400" />
              <p className="text-sm text-zinc-500">Searching your notes...</p>
            </div>
          )}

          {results && (
            <div className="space-y-6">
              {/* AI Answer */}
              {results.ragAnswer && (
                <div className="bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-purple-500/20 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Sparkles size={16} className="text-purple-400" />
                    </div>
                    <h3 className="font-bold text-zinc-100">AI Answer</h3>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown>{results.ragAnswer}</ReactMarkdown>
                  </div>
                  
                  {/* Sources */}
                  {results.sources && results.sources.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-purple-500/20">
                      <p className="text-xs text-zinc-500 mb-3">Sources:</p>
                      <div className="flex flex-wrap gap-2">
                        {results.sources.map((source, i) => (
                          <button
                            key={i}
                            onClick={() => onNoteSelect?.(source.noteId)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-400 hover:text-purple-400 hover:border-purple-500/30 transition-all"
                          >
                            <FileText size={12} />
                            <span className="truncate max-w-[200px]">{source.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Search Results */}
              {results.results.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-zinc-300 flex items-center gap-2">
                      <FileText size={16} className="text-zinc-500" />
                      Search Results ({results.results.length})
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {results.results.map((result) => (
                      <div
                        key={result.id}
                        onClick={() => onNoteSelect?.(result.id)}
                        className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 hover:border-purple-500/30 transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-zinc-100 mb-2 truncate">{result.title}</h4>
                            {result.excerpts.map((excerpt, i) => (
                              <p key={i} className="text-sm text-zinc-400 line-clamp-2 mb-2">
                                {excerpt}
                              </p>
                            ))}
                          </div>
                          <div className="flex-shrink-0">
                            <span className="text-xs font-medium text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full">
                              {result.relevanceScore}% match
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.results.length === 0 && !results.ragAnswer && (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-600 space-y-4">
                  <MessageSquare size={32} className="text-zinc-700" />
                  <p className="text-sm text-zinc-500">No results found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
