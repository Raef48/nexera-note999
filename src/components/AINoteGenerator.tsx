import React, { useState } from 'react';
import { Sparkles, X, FileText, Loader2 } from 'lucide-react';
import { generateNote, trackUsage } from '../services/ai-functions';

interface AINoteGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onNoteGenerated: (title: string, content: string) => void;
  userId: string;
}

type NoteStyle = 'default' | 'detailed' | 'outline' | 'tutorial';

const STYLE_OPTIONS: { value: NoteStyle; label: string; description: string; icon: string }[] = [
  { value: 'default', label: 'Standard', description: 'Balanced note with key points', icon: '📝' },
  { value: 'detailed', label: 'Detailed', description: 'Comprehensive with examples', icon: '📚' },
  { value: 'outline', label: 'Outline', description: 'Structured bullet points', icon: '📋' },
  { value: 'tutorial', label: 'Tutorial', description: 'Step-by-step guide', icon: '🎓' },
];

export default function AINoteGenerator({ isOpen, onClose, onNoteGenerated, userId }: AINoteGeneratorProps) {
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState<NoteStyle>('default');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const note = await generateNote(topic, style, userId);
      onNoteGenerated(note.title, note.content);
      
      // Notify usage update
      window.dispatchEvent(new CustomEvent('aura_usage_update'));
      
      onClose();
      setTopic('');
      setStyle('default');
    } catch (err: any) {
      setError(err.message || 'Failed to generate note. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-purple-500/20 rounded-xl flex items-center justify-center">
              <Sparkles size={20} className="text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">AI Note Generator</h2>
              <p className="text-xs text-zinc-500">Create structured notes instantly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Topic Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              What should I create notes about?
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="e.g., Introduction to Machine Learning, DevOps Best Practices, React Hooks..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-600 outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all resize-none h-24"
              autoFocus
            />
            {error && (
              <p className="text-sm text-red-400 flex items-center gap-2">
                <span>⚠️</span> {error}
              </p>
            )}
          </div>

          {/* Style Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-zinc-300">Choose a style</label>
            <div className="grid grid-cols-2 gap-3">
              {STYLE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setStyle(option.value)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    style === option.value
                      ? 'bg-orange-500/10 border-orange-500/50 ring-2 ring-orange-500/20'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-2xl mb-2">{option.icon}</div>
                  <div className="font-semibold text-zinc-100 text-sm">{option.label}</div>
                  <div className="text-xs text-zinc-500 mt-1">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Preview Info */}
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <FileText size={18} className="text-zinc-500 mt-0.5" />
              <div className="text-sm text-zinc-400">
                <p className="font-medium text-zinc-300 mb-1">What you'll get:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Well-structured markdown content</li>
                  <li>• Clear headings and sections</li>
                  <li>• Key concepts and examples</li>
                  <li>• Ready to edit and customize</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800 bg-zinc-950/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25"
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Generate Note
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
