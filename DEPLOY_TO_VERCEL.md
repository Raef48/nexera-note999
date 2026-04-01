# Deploy to Vercel - Quick Guide

## 🚀 Deploy Now

### Option 1: GitHub (Recommended)
```bash
git add .
git commit -m "Fix 404 errors and add SPA routing"
git push
```
Vercel will auto-deploy from your GitHub repository.

### Option 2: Manual Deploy
```bash
vercel --prod
```

## ✅ What Was Fixed

### 1. **Fixed 404 Errors on Slug Pages**
Updated [`vercel.json`](vercel.json) with proper rewrites:
- API routes: `/api/v1/functions/*`
- Static assets: `/assets/*` → `/dist/assets/*`
- All other routes: `/` → `/dist/index.html` (SPA routing)

### 2. **Added 404 Page**
Created [`src/pages/NotFound.tsx`](src/pages/NotFound.tsx) with:
- Custom 404 design matching your app
- "Go to Home" and "Go to Login" buttons
- Graceful handling of undefined routes

### 3. **Added Catch-All Route**
Updated [`src/App.tsx`](src/App.tsx) to include:
```tsx
<Route path="*" element={<NotFound />} />
```

## 📋 Routes That Should Work

| Route | Description | Status |
|-------|-------------|--------|
| `/` | Redirects to dashboard or login | ✅ |
| `/login` | Login page | ✅ |
| `/signup` | Signup page | ✅ |
| `/dashboard` | Main app (authenticated) | ✅ |
| `/n/:slug` | Shared note by slug | ✅ |
| `/*` | 404 page | ✅ |

## ⚠️ Important Settings

### Vercel Environment Variables
Go to **Dashboard → Settings → Environment Variables** and set:

```
VITE_INSFORGE_URL = https://5jt6gued.ap-southeast.insforge.app
VITE_INSFORGE_ANON_KEY = ik_af506c7036b8cb1e5e20c73f30e9ee6f
VITE_GROQ_API_KEY = your_groq_key
VITE_CLOUDINARY_CLOUD_NAME = dudwzh2xy
```

**DO NOT SET:** `VITE_BACKEND_URL` (leave it unset in production)

## 🔍 Test Your Deployment

After deploying, test these URLs:
1. **Main app:** `https://your-project.vercel.app/`
2. **Login:** `https://your-project.vercel.app/login`
3. **Signup:** `https://your-project.vercel.app/signup`
4. **Shared note:** `https://your-project.vercel.app/n/any-note-slug`

## 🐛 If You Still See 404s

1. **Check browser console** for errors
2. **Verify environment variables** are set in Vercel
3. **Redeploy** after adding environment variables:
   - Go to Deployments tab
   - Click "..." menu → Redeploy
4. **Clear browser cache**: `Ctrl+Shift+R`

## 📊 Check Deployment Status

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click **Deployments** tab
4. Check latest deployment status

## 🎯 Expected Behavior

✅ All routes should load the app (index.html)  
✅ React Router handles navigation  
✅ Proper 404 page for undefined routes  
✅ No more "404 Not Found" errors  
✅ Shared notes (`/n/:slug`) should work  

## 📞 Need Help?

If you're still seeing issues:
1. Check Vercel deployment logs
2. Open browser DevTools (F12) → Console tab
3. Check Network tab for failed requests
4. Share specific error messages

## 🎉 Success!

Your app should now properly handle all routes without 404 errors. Push to GitHub and let Vercel auto-deploy!
