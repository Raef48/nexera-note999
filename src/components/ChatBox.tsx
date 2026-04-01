import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, StickyNote, X, ChevronDown, Menu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, db, Note, Profile } from '../services/db';
import { generateAIResponse } from '../services/ai';

interface ChatBoxProps {
  context: string;
  notes: Note[];
  activeNote?: Note | null;
  onToggleSidebar?: () => void;
}

export default function ChatBox({ context, notes, activeNote, onToggleSidebar }: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedNote, setFocusedNote] = useState<Note | null>(activeNote || null);
  const [chatMode, setChatMode] = useState<'notes' | 'general'>('notes'); // 'notes' = note-focused, 'general' = Nexera AI general chat
  const [showNoteSelector, setShowNoteSelector] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const user = JSON.parse(localStorage.getItem('aura_user') || '{}');

  useEffect(() => {
    if (user?.id) {
      db.getProfile(user.id).then(setProfile);
    }
  }, [user?.id]);
  const noteSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeNote) setFocusedNote(activeNote);
  }, [activeNote]);

  useEffect(() => {
    const loadHistory = async () => {
      const user = JSON.parse(localStorage.getItem('aura_user') || '{}');
      if (!user.id) return;
      try {
        const chats = await db.getChats(user.id);
        let activeChat = chats[0];
        if (!activeChat) {
          activeChat = await db.createChat(user.id, null, 'General Chat');
        }
        const history = await db.getMessages(activeChat.id);
        setMessages(history);
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Close note selector on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (noteSelectorRef.current && !noteSelectorRef.current.contains(e.target as Node)) {
        setShowNoteSelector(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Build context based on focused note or all notes
  const buildContext = (): string => {
    // General chat mode - like ChatGPT without note context
    if (chatMode === 'general') {
      return `You are Nexera AI, a friendly, intelligent conversational assistant.
You can discuss any topic, answer questions, help with brainstorming, writing, analysis, coding, or general conversation.
You are helpful, creative, and engaging. Respond naturally to the user's messages.`;
    }

    if (focusedNote) {
      return `You are discussing a specific note titled "${focusedNote.title || 'Untitled'}".

Here is the FULL content of this note (in Markdown):
---
${focusedNote.content}
---

The user may ask you to summarize, explain, edit, expand, critique, or discuss any part of this note. Reference the actual content in your answers. If they ask you to rewrite sections, output valid markdown.`;
    }

    // General workspace context
    return `You have access to the user's entire workspace. Here are all their notes:

${notes.map((n, i) => `### Note ${i + 1}: "${n.title || 'Untitled'}"
${n.content || '(empty)'}
`).join('\n---\n\n')}

Help the user with questions about any of their notes. You can compare notes, find information across them, or help with any topic.`;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const user = JSON.parse(localStorage.getItem('aura_user') || '{}');
    if (!user.id) return;

    try {
      const chats = await db.getChats(user.id);
      const activeChat = chats[0];
      if (!activeChat) return;

      const userMessage = await db.saveMessage(activeChat.id, 'user', input);
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);

      const aiContext = buildContext();
      const aiResponse = await generateAIResponse(input, aiContext);
      const assistantMessage = await db.saveMessage(
        activeChat.id,
        'assistant',
        aiResponse || 'Sorry, I could not generate a response.'
      );
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  };

  const suggestedActions = chatMode === 'general'
    ? [
      '💬 Let\'s have a conversation',
      '🧠 Help me brainstorm ideas',
      '✍️ Help me write something',
      '❓ Ask me what I need',
    ]
    : focusedNote
      ? [
        '📝 Summarize this note',
        '🔍 Find key takeaways',
        '✨ Improve the writing',
        '📋 Create an outline',
      ]
      : [
        '📊 Summarize all my notes',
        '🔗 Find connections between notes',
        '💡 Suggest new topics to write about',
      ];

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 h-screen overflow-hidden">
      {/* Header */}
      <div className="px-3 sm:px-5 py-3 border-b border-zinc-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile menu toggle */}
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors"
            aria-label="Toggle menu"
          >
            <Menu size={18} />
          </button>

          {/* Note title */}
          <div className="flex items-center gap-2">
            {chatMode === 'general' ? (
              <Bot size={18} className="text-purple-400" />
            ) : focusedNote ? (
              <StickyNote size={18} className="text-orange-400" />
            ) : (
              <StickyNote size={18} className="text-zinc-500" />
            )}
            <h2 className="text-sm sm:text-base font-semibold text-zinc-100 truncate max-w-[150px] sm:max-w-xs">
              {chatMode === 'general'
                ? 'Nexera AI'
                : focusedNote
                  ? focusedNote.title || 'Untitled'
                  : 'All Notes'}
            </h2>
          </div>
        </div>

        {/* Note focus selector */}
        <div className="relative" ref={noteSelectorRef}>
          <button
            onClick={() => setShowNoteSelector(!showNoteSelector)}
            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${chatMode === 'general'
              ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
              : focusedNote
                ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300'
              }`}
          >
            {chatMode === 'general' ? <Bot size={12} /> : <StickyNote size={12} />}
            <span className="max-w-[100px] sm:max-w-[150px] truncate">
              {chatMode === 'general' ? 'Nexera AI' : focusedNote ? focusedNote.title || 'Untitled' : 'All Notes'}
            </span>
            <ChevronDown size={12} />
          </button>

          {showNoteSelector && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl z-50 overflow-hidden">
              {/* Nexera AI - General Chat Mode */}
              <button
                onClick={() => { setChatMode('general'); setFocusedNote(null); setShowNoteSelector(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs text-left transition-colors ${chatMode === 'general' ? 'bg-purple-500/20 text-purple-400' : 'text-zinc-400 hover:bg-zinc-800'
                  }`}
              >
                <Bot size={12} />
                <div className="flex-1">
                  <div className="font-medium">Nexera AI</div>
                  <div className="text-[10px] opacity-70">General conversation, no notes</div>
                </div>
              </button>
              <div className="border-t border-zinc-800" />
              {/* All Notes - Workspace Mode */}
              <button
                onClick={() => { setChatMode('notes'); setFocusedNote(null); setShowNoteSelector(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs text-left transition-colors ${chatMode === 'notes' && !focusedNote ? 'bg-zinc-800 text-orange-400' : 'text-zinc-400 hover:bg-zinc-800'
                  }`}
              >
                <StickyNote size={12} />
                <div className="flex-1">
                  <div className="font-medium">All Notes (Workspace)</div>
                  <div className="text-[10px] opacity-70">AI has access to all notes</div>
                </div>
              </button>
              <div className="border-t border-zinc-800" />
              <div className="max-h-48 overflow-y-auto">
                {notes.map(n => (
                  <button
                    key={n.id}
                    onClick={() => { setChatMode('notes'); setFocusedNote(n); setShowNoteSelector(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs text-left transition-colors ${focusedNote?.id === n.id ? 'bg-zinc-800 text-orange-400' : 'text-zinc-400 hover:bg-zinc-800'
                      }`}
                  >
                    <StickyNote size={12} className="flex-shrink-0" />
                    <span className="truncate">{n.title || 'Untitled'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Focus indicator */}
      {chatMode === 'general' && (
        <div className="px-5 py-2 bg-purple-500/5 border-b border-purple-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-purple-400/80">
            <Bot size={12} />
            <span><strong>General Chat Mode</strong> - Free conversation without notes</span>
          </div>
          <button
            onClick={() => setChatMode('notes')}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Focus indicator */}
      {focusedNote && (
        <div className="px-5 py-2 bg-orange-500/5 border-b border-orange-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-orange-400/80">
            <StickyNote size={12} />
            <span>Discussing: <strong>{focusedNote.title || 'Untitled'}</strong></span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-600">{focusedNote.content.split(/\s+/).length} words</span>
          </div>
          <button
            onClick={() => setFocusedNote(null)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-6 p-4">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center border ${chatMode === 'general'
              ? 'bg-purple-500/10 border-purple-500/30'
              : 'bg-zinc-900 border-zinc-800'
              }`}>
              <Bot size={24} strokeWidth={1.5} className={chatMode === 'general' ? 'text-purple-400' : 'text-orange-500/60'} />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-zinc-400">
                {chatMode === 'general'
                  ? 'Welcome to Nexera AI - Your conversational assistant'
                  : focusedNote
                    ? `Ask me about "${focusedNote.title || 'Untitled'}"`
                    : 'How can I help with your workspace?'}
              </p>
              <p className="text-xs text-zinc-600">
                {chatMode === 'general'
                  ? 'Let\'s chat about anything! No notes in focus.'
                  : focusedNote
                    ? 'I can summarize, explain, improve, or discuss any part of this note.'
                    : 'I can help with all your notes, find connections, or answer questions.'}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-md">
              {suggestedActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(action.substring(2).trim()); inputRef.current?.focus(); }}
                  className={`px-3 py-1.5 text-xs rounded-full transition-all ${chatMode === 'general'
                    ? 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-purple-400 hover:border-purple-500/30'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-orange-400 hover:border-orange-500/30'
                    }`}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'assistant' ? '' : ''}`}
          >
            <div className="mt-0.5 flex-shrink-0">
              {msg.role === 'user' ? (
                profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="User"
                    className="w-9 h-9 rounded-2xl border border-zinc-700/50 object-cover shadow-lg"
                  />
                ) : (
                  <div className="w-9 h-9 bg-zinc-800/80 border border-zinc-700/50 rounded-2xl flex items-center justify-center text-zinc-100 shadow-lg">
                    <User size={16} />
                  </div>
                )
              ) : (
                <div className="w-9 h-9 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center shadow-lg">
                  <img
                    src="https://res.cloudinary.com/dudwzh2xy/image/upload/v1774161751/nexera_logo_rk3yzf.png"
                    alt="Nexera AI"
                    className="w-6 h-6 object-contain"
                  />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-1 overflow-hidden min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold font-mono">
                {msg.role === 'user' ? 'You' : 'Nexera AI'}
              </span>
              <div className={`text-sm leading-relaxed ${msg.role === 'assistant'
                ? 'bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50'
                : 'text-zinc-300'
                }`}>
                <div className="prose prose-invert max-w-none prose-sm">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-9 h-9 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center">
              <img
                src="https://res.cloudinary.com/dudwzh2xy/image/upload/v1774161751/nexera_logo_rk3yzf.png"
                alt="Nexera AI"
                className="w-6 h-6 object-contain"
              />
            </div>
            <div className="flex-1 space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold font-mono">Nexera AI</span>
              <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-orange-500/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-orange-500/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-orange-500/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="px-3 sm:px-5 py-3 border-t border-zinc-800 flex-shrink-0">
        <div className={`relative bg-zinc-900 border rounded-xl focus-within:transition-colors ${chatMode === 'general'
          ? 'border-zinc-800 focus-within:border-purple-500/40'
          : 'border-zinc-800 focus-within:border-orange-500/40'
          }`}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder={chatMode === 'general'
              ? 'Chat with Nexera AI about anything...'
              : focusedNote
                ? `Ask about "${focusedNote.title || 'this note'}"...`
                : 'Ask me anything about your workspace...'}
            rows={1}
            className="w-full bg-transparent py-3 pl-4 pr-12 text-zinc-100 text-sm outline-none resize-none max-h-[120px]"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className={`absolute right-2 bottom-2 p-2 transition-colors disabled:opacity-30 ${chatMode === 'general'
              ? 'text-zinc-500 hover:text-purple-500'
              : 'text-zinc-500 hover:text-orange-500'
              }`}
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[10px] text-zinc-700 mt-1.5 text-center font-mono hidden sm:block">
          Shift+Enter for new line • {chatMode === 'general' ? 'General conversation mode' : focusedNote ? 'Note-focused mode' : 'Workspace mode'}
        </p>
      </div>
    </div>
  );
}
