# Black Screen After Deployment - Troubleshooting Guide

## 🚨 Common Causes

### 1. **JavaScript Errors Preventing App Mount**
The most common cause. The ErrorBoundary I've added should now catch these.

### 2. **Missing Environment Variables**
Critical environment variables must be set in Vercel Dashboard:
- `VITE_INSFORGE_URL`
- `VITE_INSFORGE_ANON_KEY`
- `VITE_GROQ_API_KEY`
- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_UPLOAD_PRESET`

**Important:** Do NOT set `VITE_BACKEND_URL` in Vercel production. Leave it unset.

### 3. **Build Errors**
The build might be failing silently.

## 🔧 Steps to Fix

### Step 1: Check Browser Console
1. Open your deployed site
2. Right-click → Inspect → Console tab
3. Look for red error messages
4. Share any errors you see

### Step 2: Verify Environment Variables on Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (nexera-note)
3. Click **Settings** → **Environment Variables**
4. Verify these are set:
   ```
   VITE_INSFORGE_URL = https://5jt6gued.ap-southeast.insforge.app
   VITE_INSFORGE_ANON_KEY = ik_af506c7036b8cb1e5e20c73f30e9ee6f
   VITE_GROQ_API_KEY = your_groq_key
   VITE_CLOUDINARY_CLOUD_NAME = dudwzh2xy
   ```
5. **DO NOT** set `VITE_BACKEND_URL` in production

### Step 3: Redeploy
After adding environment variables:
1. Go to **Deployments** tab
2. Click **...** menu on latest deployment
3. Select **Redeploy**
4. Wait for deployment to complete

### Step 4: Clear Browser Cache
1. Open deployed site
2. Press `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
3. This forces a hard refresh

## 🔍 What I've Fixed

1. **Added ErrorBoundary** ([`src/components/ErrorBoundary.tsx`](src/components/ErrorBoundary.tsx))
   - Catches React errors and displays a helpful error message
   - Shows error details in development mode

2. **Fixed localStorage parsing** ([`src/App.tsx`](src/App.tsx))
   - Added try-catch around localStorage parsing
   - Prevents app crash if localStorage is corrupted

3. **Fixed Dashboard error handling** ([`src/pages/Dashboard.tsx`](src/pages/Dashboard.tsx))
   - Added safe user parsing
   - Prevents crash on user data issues

4. **Fixed Backend URL detection** ([`src/services/ai-functions.ts`](src/services/ai-functions.ts))
   - Now properly detects if backend URL is localhost
   - Uses relative paths in production automatically

5. **Added VITE_BACKEND_URL to vite config** ([`vite.config.ts`](vite.config.ts))
   - Ensures environment variable is properly available

## 🧪 Test Locally First

Before deploying, test your changes locally:

```bash
# 1. Make sure you have the latest code
git pull

# 2. Test in production mode locally
npm run build
npm run preview

# This simulates Vercel deployment locally
```

## 📊 Check Vercel Build Logs

1. Go to Vercel Dashboard
2. Select your deployment
3. Click on **Build Logs**
4. Look for any errors (red text)
5. Check if environment variables are being loaded

## 🔧 Manual Debugging Steps

If you're still seeing a black screen:

### Option 1: Test if React is Loading
Add this to your `index.html` right after the `<div id="root">`:
```html
<div id="root">
  <div style="color: white; padding: 20px;">
    Loading... If you see this, React isn't mounting properly.
  </div>
</div>
```

### Option 2: Check Network Tab
1. Open DevTools → Network tab
2. Reload the page
3. Look for:
   - `index-*.js` files (should load successfully)
   - Any 404 errors (missing files)
   - Any 500 errors (server errors)

### Option 3: Check Vercel Functions
If you have serverless functions:
1. Go to Vercel Dashboard → Functions
2. Check if any functions are failing
3. Click on a function to see its logs

## 📞 What to Report

If you still have issues, please share:
1. **Browser console errors** (copy from DevTools)
2. **Network tab screenshot** (if possible)
3. **Vercel deployment URL** (if available)
4. **Steps you've already tried**

## ✅ Checklist

- [ ] Environment variables set in Vercel
- [ ] `VITE_BACKEND_URL` NOT set in Vercel
- [ ] Redeployed after adding variables
- [ ] Cleared browser cache
- [ ] Checked browser console for errors
- [ ] Tested locally with `npm run preview`

## 🎯 Expected Behavior

After these fixes, you should see:
1. Login page (if not authenticated)
2. Dashboard with your notes (if authenticated)
3. No black screen
4. Error boundary only shows if there's a critical error

If you're still seeing issues, the error details will now be visible instead of a blank screen, which will help us debug further!
