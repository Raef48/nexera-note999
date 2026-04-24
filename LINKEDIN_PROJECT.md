# Nexera Note 🚀

## AI-Powered Note-Taking Workspace

> A modern, intelligent note-taking application that transforms how you create, organize, and interact with your knowledge — powered by AI and built for the cloud.

---

## 📋 Overview

**Nexera Note** is a full-featured, SaaS-ready web application that combines a powerful markdown editor with cutting-edge AI capabilities. It enables users to create, edit, organize, and intelligently query their notes using advanced language models.

- **Version**: 1.0.0
- **Type**: React SPA (Single Page Application)
- **Deployment**: Vercel (Production-ready)
- **Database**: InsForge (Supabase-compatible)

---

## ✨ Key Features

### 📝 Core Note-Taking
- **Markdown Editor** with live preview and split-view mode
- **LaTeX/Math Rendering** for scientific and technical content
- **Note Organization** with folders and tags
- **Note Sharing** via unique public URLs
- **Image Uploads** powered by Cloudinary
- **PDF Export** capabilities

### 🤖 AI-Powered Intelligence

#### 1. AI Note Generator
- Generate fully structured notes from simple topic prompts
- **4 writing styles**: Standard, Detailed, Outline, Tutorial
- Powered by **Groq's Llama 3.3 70B** for lightning-fast inference

#### 2. AI Semantic Search (RAG)
- **Retrieval-Augmented Generation** across your entire knowledge base
- Answers questions by synthesizing information from ALL notes
- Provides **source citations** and **relevance scores**
- Three modes: Search+AI, Search Only, AI Answer

#### 3. Nexera AI Chat
- **Context-aware** chat that understands your entire workspace
- Focus on a single note or query across all notes
- General conversation mode for open-ended assistance

### 📊 Usage Analytics & Limits
- **Daily & monthly query quotas** with automatic enforcement
- **Tiered SaaS model**: Free, Pro, Enterprise
- **Visual progress bars** showing remaining usage
- Automatic reset (daily at midnight UTC, monthly on the 1st)

### 📱 Mobile-First Design
- Fully **responsive** layouts
- Hamburger menu with slide-in sidebar
- Touch-optimized interaction targets
- Adaptive view modes for all screen sizes

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI Framework |
| **TypeScript 5.8** | Type Safety |
| **Vite 6.2** | Build Tool & Dev Server |
| **Tailwind CSS 4.1** | Utility-First Styling |
| **React Router DOM 7** | Client-Side Routing |
| **Motion 12** | Animations |
| **Lucide React** | Icon Library |
| **React Markdown + KaTeX** | Markdown & Math Rendering |
| **Recharts** | Data Visualization |

### Backend & AI
| Technology | Purpose |
|---|---|
| **InsForge SDK** | Database & Authentication |
| **Groq SDK** | AI Inference (Llama 3.3 70B) |
| **Google GenAI** | Gemini API Integration |
| **Cloudinary** | Image Storage & CDN |
| **Express 4** | Local Development Server |

### Deployment & DevOps
| Technology | Purpose |
|---|---|
| **Vercel** | Production Hosting |
| **Vercel Serverless Functions** | API Endpoints |
| **Edge Functions** | Low-Latency AI Processing |
| **Supabase** | Optional Backend Support |

---

## 🏗️ Architecture

```
nexera-note/
├── src/                          # React frontend
│   ├── components/               # Reusable UI components
│   │   ├── AINoteGenerator.tsx   # AI note generation modal
│   │   ├── AISearch.tsx          # AI search interface
│   │   ├── ChatBox.tsx           # AI chat widget
│   │   ├── NoteEditor.tsx        # Markdown editor
│   │   └── Sidebar.tsx           # Navigation
│   ├── pages/                    # Route pages
│   │   ├── Dashboard.tsx         # Main workspace
│   │   ├── Login.tsx             # Authentication
│   │   ├── Signup.tsx            # User registration
│   │   └── SharedNote.tsx        # Public note view
│   ├── services/                 # Business logic
│   │   ├── ai.ts                 # Groq integration
│   │   ├── ai-functions.ts       # AI API calls
│   │   ├── db.ts                 # Database operations
│   │   └── usage-limits.ts       # Quota management
│   └── App.tsx                   # Main app & routing
├── api/v1/functions/             # Vercel serverless functions
├── edge-functions/               # Edge deployment
└── server/                       # Express dev server
```

---

## 🎯 Unique Selling Points

1. **🧠 AI-First Approach**: Generate structured notes from prompts, query your knowledge base with natural language, and get intelligent assistance — all built-in.

2. **🔍 RAG-Powered Search**: Unlike simple text search, Nexera Note synthesizes answers from your entire note collection with citations and relevance scores.

3. **💼 SaaS-Ready**: Built-in usage limits, tier management (Free/Pro/Enterprise), and analytics — ready for monetization from day one.

4. **🌐 Cloud-Native**: Deployed on Vercel with serverless functions, edge computing support, and automatic scaling.

5. **📱 Mobile-Optimized**: Full-featured experience on any device with responsive design and touch-friendly interfaces.

6. **🔒 Offline Resilience**: localStorage fallback ensures your notes are accessible even when the backend is unreachable.

7. **🔌 Multi-Provider AI**: Supports both Groq (Llama 3.3) and Google Gemini — switch models as needed.

---

## 🚀 Deployment

### Quick Deploy to Vercel
```bash
npm install
npm run build
vercel deploy --prod
```

### Required Environment Variables
- `GEMINI_API_KEY` — Google Gemini API key
- `VITE_GROQ_API_KEY` — Groq API key
- `VITE_INSFORGE_URL` — InsForge instance URL
- `VITE_INSFORGE_ANON_KEY` — InsForge anonymous key
- `VITE_CLOUDINARY_CLOUD_NAME` — Cloudinary cloud name
- `VITE_CLOUDINARY_UPLOAD_PRESET` — Cloudinary upload preset

### Local Development
```bash
npm install
npm run dev        # Frontend (port 3000)
npm run server     # Backend API (optional)
```

---

## 🔐 Security

- **Security Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy
- **Authenticated Access**: Login/Signup via InsForge (OAuth & email/password)
- **Atomic Upsert Operations**: Database RPC pattern prevents race conditions
- **Environment Variable Protection**: API keys secured server-side

---

## 📈 Future Roadmap

- [ ] Real-time collaboration (multi-user editing)
- [ ] Voice-to-note transcription
- [ ] Advanced tag-based filtering
- [ ] Note versioning & history
- [ ] API integrations (Notion, Google Docs, Obsidian)
- [ ] Custom AI model fine-tuning
- [ ] Desktop app (Electron/Tauri)

---

## 📄 License

Private — All rights reserved

---

## 🔗 Links

- **GitHub Repository**: [Your GitHub URL]
- **Live Demo**: [Your Vercel Deployment URL]
- **Documentation**: See `README.md` and `COMPLETE_DEPLOYMENT_GUIDE.md`

---

## 💡 Built With

React • TypeScript • Vite • Tailwind CSS • Groq AI • InsForge • Cloudinary • Vercel

---

*Last updated: April 2026*
