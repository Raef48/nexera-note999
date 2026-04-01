import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { InlineMath, BlockMath } from 'react-katex';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Copy, Check, Download } from 'lucide-react';
import * as PDF from '@react-pdf/renderer';
import { format } from 'date-fns';
import { db, Note } from '../services/db';

const pdfStyles = PDF.StyleSheet.create({
  page: { padding: 60, backgroundColor: '#ffffff', fontFamily: 'Helvetica' },
  header: { marginBottom: 40, borderBottomWidth: 1, borderBottomColor: '#eeeeee', paddingBottom: 15 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#000000', marginBottom: 8 },
  date: { fontSize: 10, color: '#999999' },
  content: { fontSize: 12, lineHeight: 1.6, color: '#333333' },
  h1: { fontSize: 20, fontWeight: 'bold', marginTop: 20, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 5 },
  h2: { fontSize: 18, fontWeight: 'bold', marginTop: 15, marginBottom: 8 },
  h3: { fontSize: 16, fontWeight: 'bold', marginTop: 10, marginBottom: 6 },
  p: { marginBottom: 10, textAlign: 'justify' },
  li: { marginBottom: 5, marginLeft: 15 },
  footer: { position: 'absolute', bottom: 40, left: 60, right: 60, textAlign: 'center', fontSize: 10, color: '#999999', borderTopWidth: 1, borderTopColor: '#eeeeee', paddingTop: 10 }
});

export default function SharedNote() {
  const { slug } = useParams<{ slug: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNote = async () => {
      if (slug) {
        const data = await db.getNoteBySlug(slug);
        setNote(data);
      }
      setLoading(false);
    };
    fetchNote();
  }, [slug]);

  const handleExportPDF = async () => {
    if (!note) return;
    try {
      const PdfDoc = (
        <PDF.Document>
          <PDF.Page size="A4" style={pdfStyles.page}>
            <PDF.View style={pdfStyles.header}>
              <PDF.Text style={pdfStyles.title}>{note.title || 'Untitled'}</PDF.Text>
              <PDF.Text style={pdfStyles.date}>Exported from Nexera Note • {format(new Date(), 'PPpp')}</PDF.Text>
            </PDF.View>
            <PDF.View style={pdfStyles.content}>
              {note.content.split('\n').map((line, i) => {
                const trimmed = line.trim();
                if (line.startsWith('# ')) return <PDF.Text key={i} style={pdfStyles.h1}>{line.replace('# ', '')}</PDF.Text>;
                if (line.startsWith('## ')) return <PDF.Text key={i} style={pdfStyles.h2}>{line.replace('## ', '')}</PDF.Text>;
                if (line.startsWith('### ')) return <PDF.Text key={i} style={pdfStyles.h3}>{line.replace('### ', '')}</PDF.Text>;
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return <PDF.Text key={i} style={pdfStyles.li}>• {trimmed.substring(2)}</PDF.Text>;
                if (trimmed === '') return <PDF.View key={i} style={{ height: 8 }} />;
                return <PDF.Text key={i} style={pdfStyles.p}>{line}</PDF.Text>;
              })}
            </PDF.View>
            <PDF.Text style={pdfStyles.footer} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
          </PDF.Page>
        </PDF.Document>
      );

      const blob = await PDF.pdf(PdfDoc).toBlob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${note.title || 'Untitled'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-6">
        <img
          src="https://res.cloudinary.com/dudwzh2xy/image/upload/v1774161751/nexera_logo_rk3yzf.png"
          alt="Nexera Note"
          className="w-16 h-16 animate-pulse"
        />
        <p className="text-zinc-500 font-mono text-sm tracking-widest">LOADING CONTENT...</p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center space-y-8">
        <div className="p-8 bg-zinc-900/50 rounded-3xl border border-zinc-800 backdrop-blur-sm max-w-md w-full">
          <img
            src="https://res.cloudinary.com/dudwzh2xy/image/upload/v1774161751/nexera_logo_rk3yzf.png"
            alt="Nexera Note"
            className="w-24 h-24 mx-auto mb-6"
          />
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">Note Not Found</h1>
          <p className="text-zinc-500 mb-8 leading-relaxed">The link you followed may be broken or the note has been removed.</p>
          <Link
            to="/login"
            className="block w-full py-4 px-6 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-2xl transition-all shadow-lg shadow-orange-500/20"
          >
            Go to Workspace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-12 pb-6 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <img
              src="https://res.cloudinary.com/dudwzh2xy/image/upload/v1774161751/nexera_logo_rk3yzf.png"
              alt="Nexera Note"
              className="w-10 h-10"
            />
            <span className="text-xl font-bold italic tracking-tight">Nexera Note</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 hover:border-zinc-700 transition-all text-zinc-400 hover:text-orange-400 group"
            >
              <Download size={14} className="group-hover:animate-bounce" />
              Download PDF
            </button>
            <Link
              to="/signup"
              className="text-xs font-mono font-bold uppercase tracking-widest px-6 py-3 bg-orange-500 border border-orange-600 rounded-full hover:bg-orange-400 transition-all text-white shadow-lg shadow-orange-500/20"
            >
              Join Workspace
            </Link>
          </div>
        </div>

        <article className="prose-custom">
          {note.title && (
            <h1 className="text-4xl sm:text-5xl font-black text-zinc-50 mb-8 leading-tight tracking-tighter">
              {note.title}
            </h1>
          )}
          <div className="text-zinc-300 leading-relaxed">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-2xl font-bold text-zinc-100 mt-12 mb-4">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-bold text-zinc-100 mt-10 mb-3">{children}</h2>,
                p: ({ children }) => <p className="mb-6 leading-[1.8] text-zinc-300 antialiased">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-6 mb-6 space-y-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-6 mb-6 space-y-2">{children}</ol>,
                li: ({ children }) => <li className="pl-2">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-orange-500/50 pl-6 py-2 my-8 bg-zinc-900/30 rounded-r-xl italic font-serif text-zinc-400">
                    {children}
                  </blockquote>
                ),
                code: ({ children, className }) => {
                  const [copied, setCopied] = useState(false);
                  const isBlock = className?.includes('language-');
                  if (isBlock) {
                    return (
                      <div className="relative group my-8">
                        <div className="flex items-center justify-between px-5 py-3 bg-zinc-900 border border-zinc-800 rounded-t-2xl">
                          <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">{className.replace('language-', '')}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(String(children));
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="text-zinc-500 hover:text-zinc-100 transition-colors"
                          >
                            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                          </button>
                        </div>
                        <pre className="p-6 bg-zinc-900/40 border border-t-0 border-zinc-800 rounded-b-2xl overflow-x-auto text-[14px] font-mono leading-relaxed text-orange-200/80">
                          <code>{children}</code>
                        </pre>
                      </div>
                    );
                  }
                  return (
                    <code className="px-1.5 py-0.5 bg-zinc-800/80 text-orange-400 rounded-md font-mono text-sm">
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => <>{children}</>, // Avoid redundant pre from marked
                hr: () => <hr className="my-12 border-none h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />,
                table: ({ children }) => (
                  <div className="overflow-x-auto my-8 rounded-2xl border border-zinc-800">
                    <table className="w-full text-sm text-left">{children}</table>
                  </div>
                ),
                th: ({ children }) => <th className="px-5 py-4 bg-zinc-900 font-bold border-b border-zinc-800 text-zinc-300">{children}</th>,
                td: ({ children }) => <td className="px-5 py-4 border-b border-zinc-800/50 text-zinc-400">{children}</td>,
              }}
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {note.content}
            </ReactMarkdown>
          </div>
        </article>

        <footer className="mt-24 pt-12 border-t border-zinc-900 flex flex-col items-center gap-6 text-center">
          <img
            src="https://res.cloudinary.com/dudwzh2xy/image/upload/v1774161751/nexera_logo_rk3yzf.png"
            alt="Nexera Note"
            className="w-12 h-12 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
          />
          <div className="text-zinc-600 text-[10px] uppercase font-mono tracking-[4px]">
            CREATED WITH NEXERA NOTE
          </div>
          <p className="text-zinc-500 text-sm max-w-sm mb-4">The modular markdown workspace for the modern developer.</p>
          <div className="flex gap-4">
            <Link to="/signup" className="text-xs font-bold text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-widest">Try it for FREE</Link>
            <div className="w-px h-3 bg-zinc-800"></div>
            <Link to="/login" className="text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest">Sign In</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
