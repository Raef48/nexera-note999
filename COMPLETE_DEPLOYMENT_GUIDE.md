# Complete Vercel Deployment Guide - Nexera Note

## 📁 Project Structure

```
nexera-note/
├── src/                          # React Frontend
│   ├── components/              # React Components
│   │   ├── AINoteGenerator.tsx   # AI Note Generator UI
│   │   ├── AISearch.tsx          # AI Search UI
│   │   ├── ChatBox.tsx           # Chat Interface
│   │   ├── ErrorBoundary.tsx     # Error Handling
│   │   ├── NoteEditor.tsx        # Note Editor
│   │   └── Sidebar.tsx           # Navigation Sidebar
│   ├── pages/                   # Page Components
│   │   ├── Dashboard.tsx         # Main Dashboard
│   │   ├── Login.tsx             # Login Page
│   │   ├── NotFound.tsx          # 404 Page
│   │   ├── SharedNote.tsx        # Shared Note Page
│   │   └── Signup.tsx            # Signup Page
│   ├── services/                 # API Services
│   │   ├── ai-functions.ts       # AI API Calls
│   │   ├── ai.ts                # Groq AI Integration
│   │   ├── db.ts                # InsForge Database
│   │   └── insforge.ts          # InsForge Config
│   ├── App.tsx                  # Main App Component
│   ├── main.tsx                 # Entry Point
│   └── index.css                # Global Styles
│
├── api/                          # Vercel Serverless Functions
│   └── v1/
│       └── functions/           # API Endpoints
│           ├── ai-note-generator.ts  # AI Note Generator API
│           ├── ai-search.ts         # AI Search API
│           └── analytics-track.ts  # Analytics API
│
├── server/                       # Local Express Server (NOT for Vercel)
│   ├── index.ts                 # Express Server Entry
│   ├── routes/                  # Express Routes
│   │   ├── ai-note-generator.ts
│   │   ├── ai-search.ts
│   │   └── analytics-track.ts
│   └── analytics.ts
│
├── edge-functions/               # Alternative Edge Functions (Deno)
│   ├── ai-note-generator.ts
│   ├── ai-search.ts
│   ├── analytics-track.ts
│   └── database-schema.sql
│
├── vercel.json                  # Vercel Configuration ✅ CONFIGURED
├── vite.config.ts              # Vite Configuration
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript Config
└── index.html                  # HTML Template

```

## 🎯 What Deploys to Vercel

### ✅ Deploys Automatically:
1. **Frontend** (`src/`) → Built and served as static files
2. **API Functions** (`api/v1/functions/`) → Vercel Serverless Functions
3. **Static Assets** → CSS, JavaScript, fonts, images

### ❌ NOT Deployed:
1. **Express Server** (`server/`) → Use API functions instead
2. **Edge Functions** (`edge-functions/`) → Use API functions instead
3. **Node_modules** → Installed during build

## 🚀 Deploy Now - Step by Step

### Step 1: Push Code to GitHub
```bash
git add .
git commit -m "Complete Vercel deployment configuration"
git push origin working
```

### Step 2: Connect to Vercel (First Time)
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import from GitHub
4. Select `nexera-note` repository
5. Click "Deploy"

### Step 3: Set Environment Variables
Go to **Project Settings → Environment Variables** and add:

| Variable | Value | Required |
|----------|-------|----------|
| `VITE_INSFORGE_URL` | Your InsForge project URL | ✅ Yes |
| `VITE_INSFORGE_ANON_KEY` | Your InsForge anonymous key | ✅ Yes |
| `VITE_GROQ_API_KEY` | Your Groq API key | ✅ Yes |
| `VITE_CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name | ✅ Yes |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Your upload preset | ⚠️ If using uploads |
| `VITE_SUPABASE_URL` | Your Supabase URL | ⚠️ If using Supabase |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase key | ⚠️ If using Supabase |

**⚠️ DO NOT set these:**
- `VITE_BACKEND_URL` (will cause localhost errors)
- `VITE_API_URL` (not needed)

### Step 4: Redeploy After Adding Variables
1. Go to **Deployments** tab
2. Click **"..."** menu on latest deployment
3. Select **Redeploy**

### Step 5: Test Your Deployment
Visit: `https://your-project.vercel.app`

Test these routes:
- [ ] `/` - Should redirect to login
- [ ] `/login` - Login page
- [ ] `/signup` - Signup page
- [ ] `/dashboard` - Main app (after login)
- [ ] `/n/any-note-slug` - Shared notes

## 🔧 Configuration Details

### vercel.json
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "rewrites": [
    { "source": "/api/v1/functions/(.*)", "dest": "/api/v1/functions/$1" },
    { "source": "/api/(.*)", "dest": "/$1" },
    { "source": "/assets/(.*)", "dest": "/dist/assets/$1" },
    { "source": "/(.*)", "dest": "/dist/index.html" }
  ]
}
```

**What this does:**
- `/api/v1/functions/*` → Serverless Functions
- `/api/*` → Other API routes
- `/assets/*` → Static assets from dist
- `/*` → React SPA (all other routes)

### package.json Scripts
```json
{
  "scripts": {
    "dev": "vite --port=3000",      // Local development
    "build": "vite build",          // Build for production
    "preview": "vite preview",      // Preview production build
    "server": "tsx watch server/index.ts"  // Local Express server (NOT for Vercel)
  }
}
```

## 📊 How Vercel Builds Your App

1. **Install Dependencies** - Runs `npm install`
2. **Build Frontend** - Runs `npm run build` (vite build)
3. **Output** - Creates `dist/` folder with static files
4. **Deploy** - Serves `dist/` as static site
5. **Serverless Functions** - Auto-detects `api/` folder

## 🌐 Routing Architecture

```
User Request
    ↓
Vercel Edge
    ↓
┌─────────────────────────────────────┐
│ Routes Check (in order):           │
│                                     │
│ 1. /api/v1/functions/* → API Func   │
│ 2. /api/* → Other API               │
│ 3. /assets/* → Static files         │
│ 4. /* → SPA (index.html)            │
└─────────────────────────────────────┘
    ↓
React Router
    ↓
┌─────────────────────────────────────┐
│ /login → Login.tsx                 │
│ /signup → Signup.tsx               │
│ /dashboard → Dashboard.tsx          │
│ /n/:slug → SharedNote.tsx          │
│ /* → NotFound.tsx                   │
└─────────────────────────────────────┘
```

## 🔒 Security Features

Your `vercel.json` includes security headers:
- `X-Content-Type-Options: nosniff` - Prevent MIME sniffing
- `X-Frame-Options: DENY` - Prevent clickjacking
- `X-XSS-Protection: 1; mode=block` - XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin` - Referrer privacy
- `Cache-Control: public, max-age=31536000` - Asset caching

## 💾 Database & APIs

### InsForge (Primary Database)
- URL: Set in `VITE_INSFORGE_URL` environment variable
- Key: Set in `VITE_INSFORGE_ANON_KEY` environment variable
- Used for: User authentication, notes, chats, profiles

### Groq (AI Processing)
- API Key: Set in `VITE_GROQ_API_KEY` environment variable
- Used for: AI chat, note generation, search

### Cloudinary (File Storage)
- Cloud Name: Set in `VITE_CLOUDINARY_CLOUD_NAME` environment variable
- Used for: Image uploads, logo storage

## 🐛 Troubleshooting

### Issue: Black Screen
**Solution:** Check environment variables are set correctly

### Issue: 404 on Routes
**Solution:** Ensure vercel.json rewrites are correct

### Issue: API Calls Failing
**Solution:** Check VITE_BACKEND_URL is NOT set

### Issue: Login Not Working
**Solution:** Verify InsForge environment variables

## 📱 Local Development vs Production

| Feature | Local Dev | Vercel Production |
|---------|-----------|-------------------|
| Frontend | `npm run dev` | Built to `dist/` |
| Backend | `npm run server` | Serverless Functions |
| API URL | `localhost:3005` | `/api/v1/functions/` |
| Database | InsForge (same) | InsForge (same) |
| Routing | React Router | Vercel + React Router |

## 🎓 Key Takeaways

1. **Don't deploy Express server** - Use `api/` folder instead
2. **Environment variables** - Set in Vercel, NOT in code
3. **Frontend routing** - Vercel rewrites all to SPA, React Router handles
4. **Static assets** - Vite builds and outputs to `dist/`
5. **Serverless functions** - Auto-deployed from `api/` folder

## 🚀 Quick Commands

```bash
# Local development
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Deploy to Vercel (preview)
vercel

# Deploy to Vercel (production)
vercel --prod

# Set environment variables locally
vercel env add VITE_INSFORGE_URL
```

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Repository connected to Vercel
- [ ] Environment variables set
- [ ] Redeployed after adding variables
- [ ] All routes tested
- [ ] Login/signup working
- [ ] Database connections working

## 🎉 Success!

Your app is now ready for Vercel deployment. Push to GitHub and Vercel will automatically deploy!

For detailed guides, see:
- [`DEPLOY_TO_VERCEL.md`](DEPLOY_TO_VERCEL.md)
- [`VERCEL_EXPRESS_GUIDE.md`](VERCEL_EXPRESS_GUIDE.md)
- [`TROUBLESHOOT_BLACK_SCREEN.md`](TROUBLESHOOT_BLACK_SCREEN.md)
