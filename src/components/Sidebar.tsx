import React from 'react';
import { Plus, StickyNote, MessageSquare, Trash2, LogOut, Search, User, Camera, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, Note, Profile } from '../services/db';
import { checkUsage, UsageInfo } from '../services/ai-functions';

interface SidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  isChatOpen: boolean;
  onSelectNote: (id: string) => void;
  onNewNote: () => void;
  onDeleteNote: (id: string) => void;
  onOpenChat: () => void;
  onOpenChatWithNote: (note: Note) => void;
  onOpenAINoteGenerator?: () => void;
  onOpenAISearch?: () => void;
}

export default function Sidebar({
  notes,
  activeNoteId,
  isChatOpen,
  onSelectNote,
  onNewNote,
  onDeleteNote,
  onOpenChat,
  onOpenChatWithNote,
  onOpenAINoteGenerator,
  onOpenAISearch
}: SidebarProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [usage, setUsage] = React.useState<UsageInfo | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const user = JSON.parse(localStorage.getItem('aura_user') || '{}');

  React.useEffect(() => {
    const fetchProfileAndUsage = async () => {
      if (user?.id) {
        db.getProfile(user.id).then(setProfile);
        checkUsage(user.id).then(setUsage);
      }
    };

    fetchProfileAndUsage();

    const handleUsageUpdate = () => {
      if (user?.id) {
        checkUsage(user.id).then(setUsage);
      }
    };

    window.addEventListener('aura_usage_update', handleUsageUpdate);
    return () => window.removeEventListener('aura_usage_update', handleUsageUpdate);
  }, [user?.id]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default'); // Common default preset

      const cloudName = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME || 'dudwzh2xy';
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();

      // Preserve existing profile data (full_name) when updating avatar
      const updatedProfile = await db.updateProfile({
        id: user.id,
        full_name: profile?.full_name || null,
        avatar_url: data.secure_url
      });

      setProfile(updatedProfile);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed. Please ensure you have an \"unsigned upload preset\" named \"ml_default\" configured in your Cloudinary Dashboard.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('aura_user');
    navigate('/login');
  };

  const filteredNotes = notes.filter(note => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (note.title || '').toLowerCase().includes(q) ||
      (note.content || '').toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPreview = (content: string) => {
    // Strip markdown and get first line of actual text
    const stripped = content
      .replace(/^#+\s/gm, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/~~(.+?)~~/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/^[-*+] /gm, '')
      .replace(/^>\s/gm, '')
      .trim();
    const firstLine = stripped.split('\n').find(l => l.trim()) || '';
    return firstLine.substring(0, 60);
  };

  return (
    <div className="w-full h-full bg-zinc-900 border-r border-zinc-800 flex flex-col">
      {/* Logo + New Note */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <h1 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
          <img
            src="https://res.cloudinary.com/dudwzh2xy/image/upload/v1774161751/nexera_logo_rk3yzf.png"
            alt="Nexera Note"
            className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
          />
          <span className="hidden sm:inline">Nexera Note</span>
        </h1>
        <button
          onClick={onNewNote}
          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-orange-400 transition-all"
          title="New Note"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-lg pl-8 pr-3 py-2 text-xs text-zinc-300 outline-none focus:border-zinc-700 transition-colors placeholder-zinc-700"
          />
        </div>
      </div>

      {/* AI Tools */}
      <div className="px-3 py-2 space-y-1">
        <button
          onClick={() => onOpenAINoteGenerator?.()}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-orange-400 transition-all"
        >
          <Sparkles size={14} className="text-orange-400" />
          <span>Generate Note with AI</span>
        </button>
        <button
          onClick={() => onOpenAISearch?.()}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-purple-400 transition-all"
        >
          <Wand2 size={14} className="text-purple-400" />
          <span>AI Search Notes</span>
        </button>
      </div>

      {/* AI Chat Button */}
      <div className="px-3 pb-1">
        <button
          onClick={onOpenChat}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-all ${isChatOpen
            ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
            : 'text-zinc-400 hover:bg-zinc-800 border border-transparent'
            }`}
        >
          <MessageSquare size={15} />
          <span className="font-medium">Nexera AI</span>
          <span className="ml-auto text-[10px] font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">⌘K</span>
        </button>
      </div>

      {/* Notes Section */}
      <div className="pt-2 pb-1 px-4">
        <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold font-mono">
          Notes ({filteredNotes.length})
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-2">
        {filteredNotes.map(note => (
          <div
            key={note.id}
            className={`group flex flex-col px-3 py-2.5 rounded-lg cursor-pointer transition-all ${!isChatOpen && activeNoteId === note.id
              ? 'bg-zinc-800 shadow-sm'
              : 'hover:bg-zinc-800/60'
              }`}
            onClick={() => onSelectNote(note.id)}
          >
            <div className="flex items-center gap-2">
              <StickyNote size={13} className={`flex-shrink-0 ${!isChatOpen && activeNoteId === note.id ? 'text-orange-400' : 'text-zinc-600'
                }`} />
              <span className={`text-sm font-medium truncate flex-1 ${!isChatOpen && activeNoteId === note.id ? 'text-zinc-100' : 'text-zinc-400'
                }`}>
                {note.title || 'Untitled'}
              </span>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenChatWithNote(note);
                  }}
                  className="p-1 hover:text-orange-400 text-zinc-600 transition-colors"
                  title="Chat about this note"
                >
                  <MessageSquare size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNote(note.id);
                  }}
                  className="p-1 hover:text-red-400 text-zinc-600 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            {note.content && (
              <p className="text-[11px] text-zinc-600 truncate mt-0.5 pl-[21px]">
                {getPreview(note.content)}
              </p>
            )}
            <span className="text-[10px] text-zinc-700 font-mono pl-[21px] mt-0.5">
              {formatDate(note.updated_at)}
            </span>
          </div>
        ))}

        {filteredNotes.length === 0 && (
          <div className="px-3 py-8 text-center">
            <p className="text-xs text-zinc-600">
              {searchQuery ? 'No notes match your search' : 'No notes yet'}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800 space-y-4">
        {/* Usage Stats */}
        {usage && (
          <div className="px-1 space-y-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold">
              <span className="text-zinc-500">AI Usage</span>
              <span className={usage.remaining_daily < 5 ? 'text-orange-400' : 'text-zinc-400'}>
                {usage.current_daily_usage} / {usage.daily_limit}
              </span>
            </div>
            <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  usage.remaining_daily < 5 ? 'bg-orange-500' : 'bg-orange-500/40'
                }`}
                style={{ width: `${Math.min(100, (usage.current_daily_usage / usage.daily_limit) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleImageUpload}
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-3 px-3 group hover:bg-zinc-800/50 py-2 rounded-xl transition-all cursor-pointer border border-transparent hover:border-zinc-800"
        >
          <div className="relative w-10 h-10 shrink-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-zinc-800 group-hover:ring-orange-500/50 transition-all"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:bg-zinc-700 transition-all ring-2 ring-zinc-800 group-hover:ring-orange-500/50">
                <User size={20} />
              </div>
            )}

            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              {isUploading ? (
                <Loader2 size={16} className="text-white animate-spin" />
              ) : (
                <Camera size={16} className="text-white" />
              )}
            </div>
          </div>

          <div className="flex flex-col overflow-hidden">
            <span className="text-[10px] font-bold text-zinc-200 uppercase tracking-widest leading-none truncate pr-2">
              {profile?.full_name || user?.email?.split('@')[0] || 'NEXERA USER'}
            </span>
            <span className="text-[8px] text-zinc-600 font-mono uppercase tracking-widest mt-1">
              Member v1.0
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
