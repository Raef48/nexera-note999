# Vercel Deployment Guide

## Quick Deploy

### 1. Install Vercel CLI (optional but recommended)
```bash
npm install -g vercel
```

### 2. Deploy
```bash
# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### 3. Set Environment Variables
In the Vercel dashboard, add the following environment variables:

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key for AI features |
| `VITE_GROQ_API_KEY` | Groq API key for AI features |
| `VITE_INSFORGE_URL` | InsForge instance URL |
| `VITE_INSFORGE_ANON_KEY` | InsForge anonymous key |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Cloudinary upload preset |

## Automatic Deployments

With GitHub integration, every push to the `main` branch will automatically deploy to production.

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure environment variables in the project settings
4. Deploy!

## Project Structure

```
nexera-note/
├── vercel.json          # Vercel configuration
├── edge-functions/      # Serverless edge functions
│   ├── ai-note-generator.ts
│   ├── ai-search.ts
│   └── analytics-track.ts
├── src/                 # React frontend source
├── dist/                # Build output (generated)
└── server/              # Express server (optional)
```

## Edge Functions

The `edge-functions/` directory contains serverless functions that run on Vercel's Edge Network. These are automatically deployed with the project.

## Troubleshooting

### Build Failures
- Ensure all environment variables are set
- Check that dependencies are compatible with Vercel's Node.js version

### Environment Variables Not Loading
- Restart the deployment after adding new environment variables
- Use `vercel env pull` to sync environment variables locally

### Routing Issues
- The `vercel.json` file handles SPA routing
- All routes are redirected to `index.html` for client-side routing
