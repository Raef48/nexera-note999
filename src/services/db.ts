import { insforge } from './insforge';
import { v4 as uuidv4 } from 'uuid';

export interface Note {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Chat {
  id: string;
  user_id: string;
  note_id: string | null;
  title: string;
  created_at: string;
}

// LocalStorage Fallback Logic
const getLocal = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
const setLocal = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

export const db = {
  // NOTES
  getNotes: async (userId: string): Promise<Note[]> => {
    try {
      const { data, error } = await insforge
        .database.from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Backend error, falling back to local storage:', err);
      return getLocal(`aura_notes_${userId}`);
    }
  },

  saveNote: async (note: Partial<Note> & { user_id: string }) => {
    const generateSlug = (title: string) => {
      const base = title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
      return base ? `${base}-${Math.random().toString(36).substring(2, 7)}` : Math.random().toString(36).substring(2, 12);
    };

    const noteToSave = {
      ...note,
      id: note.id || uuidv4(),
      slug: note.slug || generateSlug(note.title || 'untitled'),
      updated_at: new Date().toISOString(),
      created_at: note.created_at || new Date().toISOString()
    };

    try {
      const { data, error } = await insforge
        .database.rpc('upsert_note', {
          p_id: noteToSave.id,
          p_user_id: noteToSave.user_id,
          p_title: noteToSave.title,
          p_content: noteToSave.content,
          p_slug: noteToSave.slug,
          p_created_at: noteToSave.created_at,
          p_updated_at: noteToSave.updated_at
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Backend save failed, using local storage:', err);
      const localNotes = getLocal(`aura_notes_${note.user_id}`);
      const index = localNotes.findIndex((n: any) => n.id === noteToSave.id);
      if (index >= 0) {
        localNotes[index] = noteToSave;
      } else {
        localNotes.unshift(noteToSave);
      }
      setLocal(`aura_notes_${note.user_id}`, localNotes);
      return noteToSave as Note;
    }
  },

  getNoteBySlug: async (slug: string): Promise<Note | null> => {
    try {
      const { data, error } = await insforge
        .database.from('notes')
        .select('*')
        .eq('slug', slug)
        .single();
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching public note:', err);
      return null;
    }
  },

  deleteNote: async (id: string) => {
    try {
      const { error } = await insforge
        .database.from('notes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (err) {
      console.warn('Backend delete failed, using local storage:', err);
      // Note: This fallback is partial as we don't know the userId here easily without passing it
    }
  },

  // CHATS
  getChats: async (userId: string): Promise<Chat[]> => {
    try {
      const { data, error } = await insforge
        .database.from('chats')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      return getLocal(`aura_chats_${userId}`);
    }
  },

  createChat: async (userId: string, noteId: string | null, title: string): Promise<Chat> => {
    const newChat = {
      id: uuidv4(),
      user_id: userId,
      note_id: noteId,
      title: title,
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await insforge
        .database.from('chats')
        .insert(newChat)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (err) {
      const localChats = getLocal(`aura_chats_${userId}`);
      localChats.unshift(newChat);
      setLocal(`aura_chats_${userId}`, localChats);
      return newChat;
    }
  },

  // MESSAGES
  getMessages: async (chatId: string): Promise<ChatMessage[]> => {
    try {
      const { data, error } = await insforge
        .database.from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      return getLocal(`aura_messages_${chatId}`);
    }
  },

  saveMessage: async (chatId: string, role: 'user' | 'assistant', content: string) => {
    const newMessage = {
      id: uuidv4(),
      chat_id: chatId,
      role: role,
      content: content,
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await insforge
        .database.from('messages')
        .insert([newMessage])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (err) {
      const localMsgs = getLocal(`aura_messages_${chatId}`);
      localMsgs.push(newMessage);
      setLocal(`aura_messages_${chatId}`, localMsgs);
      return newMessage;
    }
  },

  // PROFILES
  getProfile: async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await insforge
        .database.from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Profile fetch failed, using local storage:', err);
      const localProfile = getLocal(`aura_profile_${userId}`)[0];
      return localProfile || null;
    }
  },

  updateProfile: async (profile: Partial<Profile> & { id: string }) => {
    const profileToUpdate = {
      ...profile,
      updated_at: new Date().toISOString()
    };

    try {
      const { data, error } = await insforge
        .database.rpc('upsert_profile', {
          p_id: profileToUpdate.id,
          p_full_name: profileToUpdate.full_name || null,
          p_avatar_url: profileToUpdate.avatar_url || null,
          p_updated_at: profileToUpdate.updated_at
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Profile update failed, using local storage:', err);
      setLocal(`aura_profile_${profile.id}`, [profileToUpdate]);
      return profileToUpdate as Profile;
    }
  }
};
