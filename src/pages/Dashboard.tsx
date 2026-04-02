import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import NoteEditor from '../components/NoteEditor';
import ChatBox from '../components/ChatBox';
import AINoteGenerator from '../components/AINoteGenerator';
import AISearch from '../components/AISearch';
import { db, Note } from '../services/db';
import { trackUsage } from '../services/ai-functions';
import { checkUsageLimit } from '../services/usage-limits';

export default function Dashboard() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatFocusNote, setChatFocusNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // AI Features state
  const [isAINoteGeneratorOpen, setIsAINoteGeneratorOpen] = useState(false);
  const [isAISearchOpen, setIsAISearchOpen] = useState(false);

  // Safely parse user from localStorage
  const getUser = () => {
    try {
      const rawUser = localStorage.getItem('aura_user');
      return rawUser ? JSON.parse(rawUser) : {};
    } catch (error) {
      console.error('Error parsing user:', error);
      return {};
    }
  };
  
  const user = getUser();

  useEffect(() => {
    const loadNotes = async () => {
      if (!user.id) return;
      try {
        const loadedNotes = await db.getNotes(user.id);
        setNotes(loadedNotes);
        if (loadedNotes.length > 0) {
          setActiveNoteId(loadedNotes[0].id);
        }
      } catch (error) {
        console.error('Error loading notes:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadNotes();
  }, [user.id]);

  const handleNewNote = async () => {
    if (!user.id) return;
    try {
      const newNote = await db.saveNote({
        user_id: user.id,
        title: 'Untitled Note',
        content: '',
      });
      setNotes(prev => [newNote, ...prev]);
      setActiveNoteId(newNote.id);
      setIsChatOpen(false);

      // Track note creation
      trackUsage('note_created', user.id, { noteId: newNote.id }).catch(() => {});
    } catch (error) {
      console.error('Error creating note:', error);
      alert('Failed to insert new note. Backend error logged to console.');
    }
  };

  const handleUpdateNote = async (updatedNote: Note) => {
    try {
      await db.saveNote(updatedNote);
      setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));

      // Track note update
      trackUsage('note_updated', user.id, { noteId: updatedNote.id }).catch(() => {});
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await db.deleteNote(id);
      const updatedNotes = notes.filter(n => n.id !== id);
      setNotes(updatedNotes);
      if (activeNoteId === id) {
        setActiveNoteId(updatedNotes.length > 0 ? updatedNotes[0].id : null);
      }

      // Track note deletion
      trackUsage('note_deleted', user.id, { noteId: id }).catch(() => {});
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleOpenChat = () => {
    setIsChatOpen(true);
    setChatFocusNote(null);
  };

  const handleOpenChatWithNote = (note: Note) => {
    setIsChatOpen(true);
    setChatFocusNote(note);
  };

  const handleOpenAINoteGenerator = () => {
    setIsAINoteGeneratorOpen(true);
  };

  const handleOpenAISearch = () => {
    setIsAISearchOpen(true);
  };

  const handleNoteGenerated = (title: string, content: string) => {
    // Create new note with generated content
    const newNote = {
      user_id: user.id,
      title,
      content,
    };

    db.saveNote(newNote).then(savedNote => {
      setNotes(prev => [savedNote, ...prev]);
      setActiveNoteId(savedNote.id);
    }).catch(err => {
      console.error('Failed to save generated note:', err);
    });
  };

  const handleSelectNote = (id: string) => {
    setActiveNoteId(id);
    setIsChatOpen(false);
    setChatFocusNote(null);
  };

  const activeNote = notes.find(n => n.id === activeNoteId) || null;
  const workspaceContext = notes.map(n => `Note: ${n.title}\nContent: ${n.content}`).join('\n\n');

  if (isLoading) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm font-mono uppercase tracking-widest">Loading Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 selection:bg-orange-500/30 overflow-hidden relative">
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:relative inset-y-0 left-0 z-40 w-72 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <Sidebar
          notes={notes}
          activeNoteId={activeNoteId}
          isChatOpen={isChatOpen}
          onSelectNote={(id) => { handleSelectNote(id); setIsSidebarOpen(false); }}
          onNewNote={() => { handleNewNote(); setIsSidebarOpen(false); }}
          onDeleteNote={handleDeleteNote}
          onOpenChat={() => { handleOpenChat(); setIsSidebarOpen(false); }}
          onOpenChatWithNote={(note) => { handleOpenChatWithNote(note); setIsSidebarOpen(false); }}
          onOpenAINoteGenerator={handleOpenAINoteGenerator}
          onOpenAISearch={handleOpenAISearch}
        />
      </aside>

      <main className="flex-1 flex overflow-hidden min-w-0 md:ml-0">
        {isChatOpen ? (
          <ChatBox
            context={workspaceContext}
            notes={notes}
            activeNote={chatFocusNote}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        ) : activeNote ? (
          <NoteEditor
            note={activeNote}
            onUpdate={handleUpdateNote}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 space-y-4 p-6">
            <img
              src="https://res.cloudinary.com/dudwzh2xy/image/upload/v1774161751/nexera_logo_rk3yzf.png"
              alt="Nexera Note"
              className="w-24 h-24 sm:w-32 sm:h-32 object-contain opacity-60"
            />
            <h2 className="text-xl sm:text-2xl font-bold text-center">Your Workspace</h2>
            <p className="text-sm text-center">Select a note or create a new one to get started.</p>
            <button
              onClick={handleNewNote}
              className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors text-zinc-300 text-sm font-medium"
            >
              Create New Note
            </button>
          </div>
        )}
      </main>

      {/* AI Note Generator Modal */}
      <AINoteGenerator
        isOpen={isAINoteGeneratorOpen}
        onClose={() => setIsAINoteGeneratorOpen(false)}
        onNoteGenerated={handleNoteGenerated}
        userId={user.id}
      />

      {/* AI Search Modal */}
      <AISearch
        isOpen={isAISearchOpen}
        onClose={() => setIsAISearchOpen(false)}
        userId={user.id}
        onNoteSelect={(noteId) => {
          setActiveNoteId(noteId);
          setIsAISearchOpen(false);
        }}
      />
    </div>
  );
}
