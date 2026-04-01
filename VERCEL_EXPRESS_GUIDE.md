# How to Run Express.js Server on Vercel

## Understanding the Error

Your errors occur because:
1. **Frontend tries to call `localhost:3005`** - This works locally, but fails on Vercel
2. **Vercel doesn't support traditional Express servers** - Vercel uses serverless functions
3. **Connection refused** - The Express server isn't running on Vercel

## Solution Options

### Option 1: Use Vercel Serverless Functions (Recommended) ✅

This is what I've set up for you. Create an `api/` directory at your project root:

```
nexera-note/
├── api/                          # Vercel serverless functions
│   └── v1/
│       └── functions/
│           ├── ai-note-generator.ts
│           ├── ai-search.ts
│           └── analytics-track.ts
├── server/                       # Local Express server (not deployed)
│   └── index.ts
├── src/                          # Frontend
└── vercel.json                   # Vercel configuration
```

**Key Changes Made:**

1. **Frontend API calls updated** ([`src/services/ai-functions.ts`](src/services/ai-functions.ts))
   - Uses relative paths in production: `/api/v1/functions/...`
   - Falls back to `localhost:3001` only in local development

2. **Vercel API endpoints created** ([`api/v1/functions/`](api/v1/functions))
   - `ai-note-generator.ts`
   - `ai-search.ts`
   - `analytics-track.ts`

3. **Vercel config updated** ([`vercel.json`](vercel.json))
   - Routes `/api/v1/functions/*` to serverless functions

## Running Express.js Locally

Your Express server still works locally for development:

```bash
# Terminal 1: Start Express server
npm run server
# Server runs on http://localhost:3005

# Terminal 2: Start Vite dev server  
npm run dev
# Frontend runs on http://localhost:3000
```

## Deploying to Vercel

### Local Development (Testing)

1. **Test locally without Express:**
   ```bash
   vercel dev
   ```
   This simulates the Vercel environment locally.

2. **Full local testing with Express:**
   - Terminal 1: `npm run server` (starts Express on port 3005)
   - Terminal 2: `npm run dev` (starts Vite on port 3000)
   - Set `VITE_BACKEND_URL=http://localhost:3005` in `.env`

### Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## Understanding Vercel's Architecture

| Feature | Traditional Server | Vercel |
|---------|-------------------|---------|
| **Runtime** | Always-on Node.js | Serverless Functions |
| **Scaling** | Manual | Automatic |
| **Cold Starts** | None | Possible (mitigated) |
| **Cost** | Fixed | Pay-per-use |
| **Filesystem** | Persistent | Ephemeral |

## Environment Variables

Set these in **Vercel Dashboard → Settings → Environment Variables**:

```
GEMINI_API_KEY=your_key
VITE_GROQ_API_KEY=your_key
VITE_INSFORGE_URL=your_url
VITE_INSFORGE_ANON_KEY=your_key
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
VITE_CLOUDINARY_CLOUD_NAME=your_cloud
VITE_CLOUDINARY_UPLOAD_PRESET=your_preset
```

**Important:** Do NOT set `VITE_BACKEND_URL` on Vercel. The frontend will automatically use relative paths.

## Common Issues & Solutions

### Issue 1: "Cannot find module '@vercel/node'"
**Solution:** This is expected locally. Vercel provides this automatically. Install for local type checking:
```bash
npm install --save-dev @vercel/node
```

### Issue 2: "Failed to fetch" errors
**Solution:** The frontend is trying to call localhost. Make sure:
- `VITE_BACKEND_URL` is NOT set in production
- The frontend uses relative paths (`/api/...`)

### Issue 3: 404 on API routes
**Solution:** Check your [`vercel.json`](vercel.json) routing configuration. Ensure routes are properly defined.

## Migrating Express Routes to Serverless

If you have existing Express routes, convert them like this:

**Express Route:**
```typescript
// server/routes/my-route.ts
import express from 'express';
const router = express.Router();

router.post('/', (req, res) => {
  const { data } = req.body;
  res.json({ result: data });
});

export default router;
```

**Vercel Serverless Function:**
```typescript
// api/my-route.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data } = req.body;
    return res.status(200).json({ result: data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
```

## Testing Your Deployment

1. **Check Vercel Dashboard** for deployment status
2. **Test API endpoints** directly:
   ```
   https://your-project.vercel.app/api/v1/functions/analytics-track
   ```
3. **Check browser console** for any remaining errors
4. **Use Vercel Analytics** to monitor serverless function performance

## Summary

✅ **Done:** 
- Created Vercel serverless API endpoints
- Updated frontend to use relative paths
- Configured Vercel routing

🚀 **Next Steps:**
1. Deploy to Vercel: `vercel --prod`
2. Set environment variables in Vercel dashboard
3. Test the deployed application
4. Monitor for any remaining errors

For more help, see the full [DEPLOY.md](DEPLOY.md) guide.
