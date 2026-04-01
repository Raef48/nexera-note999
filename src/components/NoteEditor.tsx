import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Bold, Italic, Strikethrough, Code, List, ListOrdered,
  Heading1, Heading2, Heading3, Quote, Minus, Link2,
  CheckSquare, Image, Eye, Edit3, Columns, Table,
  FileCode, Copy, Check, Download, ChevronDown, Share2, Menu
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { InlineMath, BlockMath } from 'react-katex';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import * as PDF from '@react-pdf/renderer';
import { format } from 'date-fns';
import { Note } from '../services/db';

const pdfStyles = PDF.StyleSheet.create({
  page: {
    padding: 60,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  date: {
    fontSize: 10,
    color: '#999999',
  },
  content: {
    fontSize: 12,
    lineHeight: 1.6,
    color: '#333333',
  },
  h1: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 5,
  },
  h2: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
  },
  h3: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 6,
  },
  p: {
    marginBottom: 10,
    textAlign: 'justify',
  },
  li: {
    marginBottom: 5,
    marginLeft: 15,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 60,
    right: 60,
    textAlign: 'center',
    fontSize: 10,
    color: '#999999',
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
    paddingTop: 10,
  }
});

interface NoteEditorProps {
  note: Note;
  onUpdate: (note: Note) => void;
  onToggleSidebar?: () => void;
}

type ViewMode = 'edit' | 'preview' | 'split';

interface ToolbarAction {
  icon: React.ReactNode;
  label: string;
  prefix: string;
  suffix: string;
  block?: boolean;
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { icon: <Heading1 size={15} />, label: 'Heading 1', prefix: '# ', suffix: '', block: true },
  { icon: <Heading2 size={15} />, label: 'Heading 2', prefix: '## ', suffix: '', block: true },
  { icon: <Heading3 size={15} />, label: 'Heading 3', prefix: '### ', suffix: '', block: true },
  { icon: <Bold size={15} />, label: 'Bold', prefix: '**', suffix: '**' },
  { icon: <Italic size={15} />, label: 'Italic', prefix: '*', suffix: '*' },
  { icon: <Strikethrough size={15} />, label: 'Strikethrough', prefix: '~~', suffix: '~~' },
  { icon: <Code size={15} />, label: 'Inline Code', prefix: '`', suffix: '`' },
  { icon: <FileCode size={15} />, label: 'Code Block', prefix: '```\n', suffix: '\n```', block: true },
  { icon: <Quote size={15} />, label: 'Blockquote', prefix: '> ', suffix: '', block: true },
  { icon: <List size={15} />, label: 'Bullet List', prefix: '- ', suffix: '', block: true },
  { icon: <ListOrdered size={15} />, label: 'Numbered List', prefix: '1. ', suffix: '', block: true },
  { icon: <CheckSquare size={15} />, label: 'Task List', prefix: '- [ ] ', suffix: '', block: true },
  { icon: <Minus size={15} />, label: 'Divider', prefix: '\n---\n', suffix: '', block: true },
  { icon: <Link2 size={15} />, label: 'Link', prefix: '[', suffix: '](url)' },
  { icon: <Image size={15} />, label: 'Image', prefix: '![alt](', suffix: ')' },
  { icon: <Table size={15} />, label: 'Table', prefix: '| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| ', suffix: ' | data | data |', block: true },
];

export default function NoteEditor({ note, onUpdate, onToggleSidebar }: NoteEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localContent, setLocalContent] = useState(note.content);
  const [localTitle, setLocalTitle] = useState(note.title);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Sync external note changes
  useEffect(() => {
    setLocalContent(note.content);
    setLocalTitle(note.title);
  }, [note.id]);

  // Word/char count
  useEffect(() => {
    const text = localContent.trim();
    setCharCount(text.length);
    setWordCount(text ? text.split(/\s+/).length : 0);
  }, [localContent]);

  // Debounced save
  const debouncedSave = useCallback((title: string, content: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      onUpdate({ ...note, title, content, updated_at: new Date().toISOString() });
    }, 600);
  }, [note, onUpdate]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalTitle(val);
    debouncedSave(val, localContent);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalContent(val);
    debouncedSave(localTitle, val);
  };

  // Handle image upload to Cloudinary
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'nexera-note'); // Unsigned upload preset
      formData.append('cloud_name', import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);

      // Upload to Cloudinary using unsigned upload
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (data.secure_url) {
        // Insert markdown image with uploaded URL
        const ta = textareaRef.current;
        if (!ta) return;

        const start = ta.selectionStart;
        const before = localContent.substring(0, start);
        const after = localContent.substring(ta.selectionEnd);
        const imageMarkdown = `\n![${file.name}](${data.secure_url})\n`;
        const newContent = before + imageMarkdown + after;

        setLocalContent(newContent);
        debouncedSave(localTitle, newContent);

        // Set cursor position after the inserted image
        requestAnimationFrame(() => {
          ta.focus();
          const cursorPos = start + imageMarkdown.length;
          ta.setSelectionRange(cursorPos, cursorPos);
        });
      } else {
        throw new Error('Upload failed: No secure URL returned');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      alert('Failed to upload image. Please ensure Cloudinary is configured correctly.');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const insertMarkdown = (action: ToolbarAction) => {
    const ta = textareaRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = localContent.substring(start, end);
    const before = localContent.substring(0, start);
    const after = localContent.substring(end);

    let insertion: string;
    if (action.block && !selected) {
      // For block-level items, ensure we're on a new line
      const needsNewline = before.length > 0 && !before.endsWith('\n');
      insertion = (needsNewline ? '\n' : '') + action.prefix + 'text' + action.suffix;
    } else {
      insertion = action.prefix + (selected || 'text') + action.suffix;
    }

    const newContent = before + insertion + after;
    setLocalContent(newContent);
    debouncedSave(localTitle, newContent);

    // Restore cursor
    requestAnimationFrame(() => {
      ta.focus();
      const cursorPos = start + action.prefix.length + (selected ? selected.length : 4);
      ta.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const newContent = localContent.substring(0, start) + '  ' + localContent.substring(ta.selectionEnd);
      setLocalContent(newContent);
      debouncedSave(localTitle, newContent);
      requestAnimationFrame(() => {
        ta.setSelectionRange(start + 2, start + 2);
      });
    }
    // Auto-continue lists
    if (e.key === 'Enter') {
      const ta = textareaRef.current;
      if (!ta) return;
      const pos = ta.selectionStart;
      const textBefore = localContent.substring(0, pos);
      const currentLine = textBefore.split('\n').pop() || '';

      const bulletMatch = currentLine.match(/^(\s*[-*+] )(\[[ x]\] )?/);
      const numMatch = currentLine.match(/^(\s*)(\d+)\. /);

      if (bulletMatch && currentLine.trim() !== '-' && currentLine.trim() !== '- [ ]') {
        e.preventDefault();
        const prefix = bulletMatch[1] + (bulletMatch[2] ? '[ ] ' : '');
        const newContent = localContent.substring(0, pos) + '\n' + prefix + localContent.substring(pos);
        setLocalContent(newContent);
        debouncedSave(localTitle, newContent);
        requestAnimationFrame(() => {
          const newPos = pos + 1 + prefix.length;
          ta.setSelectionRange(newPos, newPos);
        });
      } else if (numMatch && currentLine.trim() !== '1.') {
        e.preventDefault();
        const nextNum = parseInt(numMatch[2]) + 1;
        const prefix = numMatch[1] + nextNum + '. ';
        const newContent = localContent.substring(0, pos) + '\n' + prefix + localContent.substring(pos);
        setLocalContent(newContent);
        debouncedSave(localTitle, newContent);
        requestAnimationFrame(() => {
          const newPos = pos + 1 + prefix.length;
          ta.setSelectionRange(newPos, newPos);
        });
      }
    }
  };

  // Toggle task checkbox in content
  const handleCheckboxToggle = (lineIndex: number) => {
    const lines = localContent.split('\n');
    if (lines[lineIndex]) {
      if (lines[lineIndex].includes('- [ ]')) {
        lines[lineIndex] = lines[lineIndex].replace('- [ ]', '- [x]');
      } else if (lines[lineIndex].includes('- [x]')) {
        lines[lineIndex] = lines[lineIndex].replace('- [x]', '- [ ]');
      }
      const newContent = lines.join('\n');
      setLocalContent(newContent);
      debouncedSave(localTitle, newContent);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(localContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportText = () => {
    // Strip rough markdown to get text
    const text = localContent
      .replace(/^#+\s/gm, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/~~(.+?)~~/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/^[-*+] /gm, '')
      .replace(/^>\s/gm, '');
    downloadFile(`${localTitle || 'Untitled'}.txt`, text, 'text/plain');
    setShowExportMenu(false);
  };

  const handleExportMD = () => {
    downloadFile(`${localTitle || 'Untitled'}.md`, localContent, 'text/markdown');
    setShowExportMenu(false);
  };

  const handleExportPDF = async () => {
    if (!localContent) return;
    setIsDownloading(true);
    setShowExportMenu(false);

    try {
      // Define PDF Doc Component
      const PdfDoc = (
        <PDF.Document>
          <PDF.Page size="A4" style={pdfStyles.page}>
            <PDF.View style={pdfStyles.header}>
              <PDF.Text style={pdfStyles.title}>{localTitle || 'Untitled'}</PDF.Text>
              <PDF.Text style={pdfStyles.date}>Generated by Nexera Note • {format(new Date(), 'PPpp')}</PDF.Text>
            </PDF.View>
            <PDF.View style={pdfStyles.content}>
              {localContent.split('\n').map((line, i) => {
                const trimmed = line.trim();
                if (line.startsWith('# ')) return <PDF.Text key={i} style={pdfStyles.h1}>{line.replace('# ', '')}</PDF.Text>;
                if (line.startsWith('## ')) return <PDF.Text key={i} style={pdfStyles.h2}>{line.replace('## ', '')}</PDF.Text>;
                if (line.startsWith('### ')) return <PDF.Text key={i} style={pdfStyles.h3}>{line.replace('### ', '')}</PDF.Text>;
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return <PDF.Text key={i} style={pdfStyles.li}>• {trimmed.substring(2)}</PDF.Text>;
                if (trimmed === '') return <PDF.View key={i} style={{ height: 8 }} />;
                return <PDF.Text key={i} style={pdfStyles.p}>{line}</PDF.Text>;
              })}
            </PDF.View>
            <PDF.Text
              style={pdfStyles.footer}
              render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
              fixed
            />
          </PDF.Page>
        </PDF.Document>
      );

      const blob = await PDF.pdf(PdfDoc).toBlob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${localTitle || 'Untitled'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to generate PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!note.slug) {
      alert('Note is not published yet. Please save your changes.');
      return;
    }
    const url = `${window.location.origin}/n/${note.slug}`;
    await navigator.clipboard.writeText(url);
    alert('Public share link copied to clipboard!');
  };

  // Synced scrolling for split mode
  const handleEditorScroll = () => {
    if (viewMode !== 'split' || !textareaRef.current || !previewRef.current) return;
    const ta = textareaRef.current;
    const ratio = ta.scrollTop / (ta.scrollHeight - ta.clientHeight || 1);
    const preview = previewRef.current;
    preview.scrollTop = ratio * (preview.scrollHeight - preview.clientHeight);
  };

  const viewModes: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'edit', icon: <Edit3 size={14} />, label: 'Edit' },
    { mode: 'split', icon: <Columns size={14} />, label: 'Split' },
    { mode: 'preview', icon: <Eye size={14} />, label: 'Preview' },
  ];

  const timeSince = (dateStr: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Custom markdown components for task lists
  const markdownComponents = {
    li: ({ children, ...props }: any) => {
      const text = String(children);
      // Check if this is a task list item  
      if (text.startsWith('[ ] ') || text.startsWith('[x] ')) {
        const checked = text.startsWith('[x] ');
        const content = text.substring(4);
        // Find line index for this checkbox
        const lines = localContent.split('\n');
        const lineIdx = lines.findIndex(l =>
          (checked ? l.includes('- [x] ') : l.includes('- [ ] ')) &&
          l.includes(content.trim().substring(0, 20))
        );
        return (
          <li className="flex items-start gap-2 list-none -ml-4" {...props}>
            <button
              onClick={() => lineIdx >= 0 && handleCheckboxToggle(lineIdx)}
              className={`mt-1 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${checked
                ? 'bg-orange-500 border-orange-500 text-white'
                : 'border-zinc-600 hover:border-orange-500/50'
                }`}
            >
              {checked && <Check size={10} />}
            </button>
            <span className={checked ? 'line-through text-zinc-500' : ''}>{content}</span>
          </li>
        );
      }
      return <li {...props}>{children}</li>;
    },
    h1: ({ children, ...props }: any) => (
      <h1 className="text-3xl font-bold text-zinc-50 mt-8 mb-3 pb-2 border-b border-zinc-800" {...props}>{children}</h1>
    ),
    h2: ({ children, ...props }: any) => (
      <h2 className="text-2xl font-bold text-zinc-100 mt-6 mb-2 pb-1.5 border-b border-zinc-800/50" {...props}>{children}</h2>
    ),
    h3: ({ children, ...props }: any) => (
      <h3 className="text-xl font-semibold text-zinc-200 mt-5 mb-2" {...props}>{children}</h3>
    ),
    p: ({ children, ...props }: any) => (
      <p className="text-zinc-300 leading-[1.8] mb-4" {...props}>{children}</p>
    ),
    a: ({ children, href, ...props }: any) => (
      <a href={href} className="text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
    ),
    blockquote: ({ children, ...props }: any) => (
      <blockquote className="border-l-4 border-orange-500/50 pl-4 py-1 my-4 bg-orange-500/5 rounded-r-lg text-zinc-400 italic" {...props}>{children}</blockquote>
    ),
    code: ({ children, className, ...props }: any) => {
      const isBlock = className?.includes('language-');
      if (isBlock) {
        const lang = className?.replace('language-', '') || '';
        return (
          <div className="relative group my-4">
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-t-lg">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">{lang || 'code'}</span>
              <button
                onClick={() => navigator.clipboard.writeText(String(children))}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <Copy size={12} />
              </button>
            </div>
            <pre className="bg-zinc-900/80 border border-t-0 border-zinc-800 rounded-b-lg p-4 overflow-x-auto">
              <code className="text-sm font-mono text-orange-300/90" {...props}>{children}</code>
            </pre>
          </div>
        );
      }
      return (
        <code className="bg-zinc-800/80 text-orange-400 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>
      );
    },
    table: ({ children, ...props }: any) => (
      <div className="overflow-x-auto my-4 rounded-lg border border-zinc-800">
        <table className="w-full text-sm" {...props}>{children}</table>
      </div>
    ),
    thead: ({ children, ...props }: any) => (
      <thead className="bg-zinc-900/80" {...props}>{children}</thead>
    ),
    th: ({ children, ...props }: any) => (
      <th className="px-4 py-2.5 text-left text-xs uppercase tracking-wider text-zinc-400 font-mono font-semibold border-b border-zinc-800" {...props}>{children}</th>
    ),
    td: ({ children, ...props }: any) => (
      <td className="px-4 py-2.5 text-zinc-300 border-b border-zinc-800/50" {...props}>{children}</td>
    ),
    hr: () => (
      <hr className="my-8 border-none h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
    ),
    ul: ({ children, ...props }: any) => (
      <ul className="list-disc pl-6 mb-4 space-y-1 text-zinc-300 marker:text-zinc-600" {...props}>{children}</ul>
    ),
    ol: ({ children, ...props }: any) => (
      <ol className="list-decimal pl-6 mb-4 space-y-1 text-zinc-300 marker:text-zinc-500" {...props}>{children}</ol>
    ),
    img: ({ src, alt, ...props }: any) => (
      <img src={src} alt={alt} className="rounded-lg border border-zinc-800 my-4 max-w-full" {...props} />
    ),
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 h-screen overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-3 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          {/* Mobile menu toggle */}
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors"
            aria-label="Toggle menu"
          >
            <Menu size={18} />
          </button>

          <input
            type="text"
            value={localTitle}
            onChange={handleTitleChange}
            placeholder="Untitled"
            className="text-base sm:text-xl font-bold bg-transparent border-none outline-none text-zinc-100 placeholder-zinc-700 w-full sm:w-64"
          />
          <span className="text-[10px] text-zinc-600 font-mono whitespace-nowrap hidden sm:inline">
            {timeSince(note.updated_at)}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* View mode toggle */}
          <div className="flex items-center bg-zinc-900 rounded-lg border border-zinc-800 p-0.5">
            {viewModes.map(vm => (
              <button
                key={vm.mode}
                onClick={() => setViewMode(vm.mode)}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === vm.mode
                  ? 'bg-zinc-800 text-orange-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
                  } ${vm.mode === 'split' ? 'hidden sm:inline-flex' : ''}`}
                title={vm.label}
              >
                {vm.icon}
                <span className="hidden lg:inline">{vm.label}</span>
              </button>
            ))}
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-all"
            title="Copy markdown"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          </button>

          {/* Share button */}
          <button
            onClick={handleShare}
            className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-all"
            title="Share public link"
          >
            <Share2 size={14} />
          </button>

          {/* Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={isDownloading || !localContent}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${showExportMenu
                ? 'bg-zinc-800 text-orange-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                } ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Export Options"
            >
              <Download size={14} className={isDownloading ? 'text-orange-400 animate-pulse' : ''} />
              <span className="hidden sm:inline">{isDownloading ? 'Exporting...' : 'Export'}</span>
              <ChevronDown size={12} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>

            {showExportMenu && localContent && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden py-1">
                <button
                  onClick={handleExportPDF}
                  className="w-full flex items-center px-4 py-2 text-xs text-left text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                >
                  .pdf (Document)
                </button>
                <div className="border-t border-zinc-800/50 my-1" />
                <button
                  onClick={handleExportMD}
                  className="w-full flex items-center px-4 py-2 text-xs text-left text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                >
                  .md (Markdown)
                </button>
                <button
                  onClick={handleExportText}
                  className="w-full flex items-center px-4 py-2 text-xs text-left text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                >
                  .txt (Plain Text)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar - visible in edit/split modes */}
      {viewMode !== 'preview' && (
        <div className="flex items-center gap-0.5 px-3 sm:px-6 py-2 border-b border-zinc-800/50 bg-zinc-950/50 overflow-x-auto scrollbar-hide flex-shrink-0">
          {TOOLBAR_ACTIONS.map((action, i) => (
            <React.Fragment key={action.label}>
              {(i === 3 || i === 7 || i === 8 || i === 12 || i === 13) && (
                <div className="w-px h-5 bg-zinc-800 mx-1 flex-shrink-0" />
              )}
              {action.label === 'Image' ? (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="p-1.5 text-zinc-500 hover:text-orange-400 hover:bg-zinc-800/80 rounded transition-all flex-shrink-0 disabled:opacity-50"
                    title={isUploading ? 'Uploading...' : 'Upload image'}
                  >
                    {isUploading ? (
                      <div className="w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      action.icon
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </>
              ) : (
                <button
                  onClick={() => insertMarkdown(action)}
                  className="p-1.5 text-zinc-500 hover:text-orange-400 hover:bg-zinc-800/80 rounded transition-all flex-shrink-0"
                  title={action.label}
                >
                  {action.icon}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Editor / Preview Area */}
      {viewMode === 'split' ? (
        /* Split view - side-by-side on desktop, editor-only on mobile */
        <div className="flex-1 flex flex-row overflow-hidden min-h-0">
          {/* Editor pane */}
          <div className="flex flex-col sm:w-1/2 w-full border-r border-zinc-800/50 overflow-hidden">
            <textarea
              ref={textareaRef}
              value={localContent}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              onScroll={handleEditorScroll}
              placeholder="Start writing in markdown..."
              spellCheck={false}
              className="flex-1 bg-transparent border-none outline-none text-zinc-300 placeholder-zinc-800 resize-none w-full text-[15px] leading-[1.8] p-6 font-mono selection:bg-orange-500/20"
            />
          </div>
          {/* Preview pane - hidden on mobile */}
          <div className="hidden sm:flex flex-col sm:w-1/2 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto p-6">
                {localTitle && (
                  <h1 className="text-4xl font-bold text-zinc-50 mb-6 pb-3 border-b border-zinc-800">
                    {localTitle}
                  </h1>
                )}
                {localContent ? (
                  <div className="prose-custom">
                    <ReactMarkdown
                      components={markdownComponents}
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {localContent}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-zinc-700 italic">Nothing to preview yet...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Editor pane */}
          {viewMode === 'edit' && (
            <div className="w-full flex flex-col">
              <textarea
                ref={textareaRef}
                value={localContent}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                onScroll={handleEditorScroll}
                placeholder="Start writing in markdown..."
                spellCheck={false}
                className="flex-1 bg-transparent border-none outline-none text-zinc-300 placeholder-zinc-800 resize-none w-full text-[15px] leading-[1.8] p-6 font-mono selection:bg-orange-500/20"
              />
            </div>
          )}

          {/* Preview pane */}
          {viewMode === 'preview' && (
            <div className="w-full overflow-y-auto">
              <div className="max-w-3xl mx-auto p-6">
                {localTitle && (
                  <h1 className="text-4xl font-bold text-zinc-50 mb-6 pb-3 border-b border-zinc-800">
                    {localTitle}
                  </h1>
                )}
                {localContent ? (
                  <div className="prose-custom">
                    <ReactMarkdown
                      components={markdownComponents}
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {localContent}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-zinc-700 italic">Nothing to preview yet...</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between px-6 py-1.5 border-t border-zinc-800/50 text-[10px] text-zinc-600 font-mono bg-zinc-950/80">
        <div className="flex items-center gap-4">
          <span>{wordCount} words</span>
          <span>{charCount} chars</span>
          <span>{localContent.split('\n').length} lines</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Markdown</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500/80 animate-pulse" />
            Auto-saving
          </span>
        </div>
      </div>
    </div>
  );
}
