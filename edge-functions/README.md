# Insforge Edge Functions for Nexera Note

This directory contains three powerful edge functions for the Nexera Note application.

## 📋 Available Functions

### 1. AI Note Generator (`ai-note-generator.ts`)

**Purpose**: Generate structured notes based on user prompts using AI.

**Features**:
- Multiple note styles (default, detailed, outline, tutorial)
- Automatic title generation
- Tag extraction
- Markdown formatting

**Usage**:
```bash
POST /api/v1/functions/ai-note-generator
Content-Type: application/json

{
  "topic": "DevOps best practices",
  "userId": "user-123",
  "style": "detailed"  // optional: default, detailed, outline, tutorial
}
```

**Response**:
```json
{
  "title": "📝 DevOps Best Practices",
  "content": "# DevOps Best Practices\n\n## Introduction\n...",
  "tags": ["devops", "best", "practices"]
}
```

---

### 2. AI Search / RAG (`ai-search.ts`)

**Purpose**: Search across user notes with AI-powered retrieval and answer generation.

**Features**:
- Full-text search across all user notes
- Relevance scoring
- Excerpt extraction
- RAG (Retrieval-Augmented Generation) for AI answers
- Three modes: search, rag, both

**Usage**:
```bash
POST /api/v1/functions/ai-search
Content-Type: application/json

{
  "query": "How do I set up CI/CD pipelines?",
  "userId": "user-123",
  "limit": 10,
  "mode": "both"  // search, rag, or both
}
```

**Response**:
```json
{
  "query": "How do I set up CI/CD pipelines?",
  "results": [
    {
      "id": "note-123",
      "title": "CI/CD Pipeline Guide",
      "relevanceScore": 85,
      "excerpts": ["To set up a CI/CD pipeline..."],
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "totalResults": 5,
  "ragAnswer": "Based on your notes, to set up a CI/CD pipeline...",
  "sources": [
    {
      "noteId": "note-123",
      "title": "CI/CD Pipeline Guide",
      "excerpt": "To set up a CI/CD pipeline..."
    }
  ]
}
```

---

### 3. Analytics Tracker (`analytics-track.ts`)

**Purpose**: Track usage metrics and enforce limits for SaaS features.

**Features**:
- Event tracking (messages, AI queries, file uploads, etc.)
- Daily and monthly usage limits
- User tier support (free, pro, enterprise)
- Automatic limit enforcement
- Usage statistics

**Usage**:
```bash
POST /api/v1/functions/analytics-track
Content-Type: application/json

{
  "userId": "user-123",
  "eventType": "ai_query",  // message_sent, note_created, ai_query, file_uploaded, etc.
  "metadata": {
    "noteId": "note-456",
    "tokens": 1500
  }
}
```

**Response**:
```json
{
  "success": true,
  "usage": {
    "daily_limit": 20,
    "monthly_limit": 200,
    "current_daily_usage": 5,
    "current_monthly_usage": 45,
    "remaining_daily": 15,
    "remaining_monthly": 155,
    "reset_daily_at": "2024-01-16T00:00:00Z",
    "reset_monthly_at": "2024-02-01T00:00:00Z"
  },
  "message": "Event tracked successfully"
}
```

**Error Response (Limit Exceeded)**:
```json
{
  "success": false,
  "usage": { ... },
  "error": "Daily limit exceeded",
  "message": "You've reached your daily limit of 20 ai queries..."
}
```

---

## 🚀 Deployment Instructions

### Step 1: Create Database Tables (Insforge Dashboard)

Run these SQL commands in your Insforge SQL Editor:

```sql
-- Analytics Events Table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_month TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Profiles Table (for tier management)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  tier TEXT DEFAULT 'free',  -- free, pro, enterprise
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_analytics_user_date ON analytics_events(user_id, event_date);
CREATE INDEX IF NOT EXISTS idx_analytics_user_month ON analytics_events(user_id, event_month);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
```

### Step 2: Deploy Edge Functions

1. Go to your **Insforge Dashboard** → **Edge Functions**
2. Click **Create New Function**
3. For each function:
   - **Name**: `ai-note-generator`, `ai-search`, `analytics-track`
   - **Upload** the corresponding `.ts` file
   - **Set Environment Variables**:
     ```
     VITE_GROQ_API_KEY=your_groq_api_key
     VITE_INSFORGE_URL=your_insforge_url
     VITE_INSFORGE_API_KEY=your_insforge_api_key
     ```

### Step 3: Configure Environment Variables

Make sure these are set in your Insforge Edge Function settings:

| Variable | Description | Required For |
|----------|-------------|--------------|
| `VITE_GROQ_API_KEY` | Groq API key for AI | Note Generator, Search |
| `VITE_INSFORGE_URL` | Your Insforge project URL | All functions |
| `VITE_INSFORGE_API_KEY` | Insforge service role key | All functions |

### Step 4: Test the Functions

Use curl or any API client to test:

```bash
# Test AI Note Generator
curl -X POST https://your-project.insforge.app/functions/v1/ai-note-generator \
  -H "Content-Type: application/json" \
  -H "apikey: your-anon-key" \
  -d '{"topic": "Introduction to Kubernetes", "userId": "user-123", "style": "outline"}'

# Test AI Search
curl -X POST https://your-project.insforge.app/functions/v1/ai-search \
  -H "Content-Type: application/json" \
  -H "apikey: your-anon-key" \
  -d '{"query": "Kubernetes pods", "userId": "user-123", "mode": "both"}'

# Test Analytics
curl -X POST https://your-project.insforge.app/functions/v1/analytics-track \
  -H "Content-Type: application/json" \
  -H "apikey: your-anon-key" \
  -d '{"userId": "user-123", "eventType": "ai_query", "metadata": {"query": "test"}}'
```

---

## 📊 User Tiers & Limits

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Daily Messages | 50 | 500 | Unlimited |
| Monthly Messages | 500 | 5,000 | Unlimited |
| Daily AI Queries | 20 | 100 | Unlimited |
| Monthly AI Queries | 200 | 1,000 | Unlimited |
| Daily File Uploads | 10 | 100 | Unlimited |
| Monthly File Uploads | 100 | 1,000 | Unlimited |

---

## 🔧 Integration with Frontend

### React/TypeScript Example

```typescript
// AI Note Generator
async function generateNote(topic: string, style: string = 'default') {
  const response = await fetch(`${INSFORGE_URL}/functions/v1/ai-note-generator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': INSFORGE_ANON_KEY,
    },
    body: JSON.stringify({
      topic,
      userId: user.id,
      style,
    }),
  });
  
  const data = await response.json();
  return data; // { title, content, tags }
}

// AI Search with RAG
async function searchNotes(query: string) {
  const response = await fetch(`${INSFORGE_URL}/functions/v1/ai-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': INSFORGE_ANON_KEY,
    },
    body: JSON.stringify({
      query,
      userId: user.id,
      mode: 'both',
      limit: 10,
    }),
  });
  
  const data = await response.json();
  return data; // { results, ragAnswer, sources }
}

// Track Analytics
async function trackEvent(eventType: string, metadata?: any) {
  const response = await fetch(`${INSFORGE_URL}/functions/v1/analytics-track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': INSFORGE_ANON_KEY,
    },
    body: JSON.stringify({
      userId: user.id,
      eventType,
      metadata,
    }),
  });
  
  const data = await response.json();
  
  if (data.success === false && data.usage) {
    // Handle limit exceeded
    console.warn('Limit exceeded:', data.message);
  }
  
  return data;
}
```

---

## ️ Troubleshooting

### Function returns 500 error
- Check environment variables are set correctly
- Verify Insforge credentials in dashboard
- Check function logs in Insforge dashboard

### AI not generating content
- Verify Groq API key is valid
- Check API quota on Groq dashboard
- Ensure model name is correct (`llama-3.3-70b-versatile`)

### Analytics not tracking
- Verify database tables exist
- Check RLS policies allow inserts
- Review function logs for SQL errors

---

## 📝 Notes

- All functions include CORS headers for browser access
- Error responses include detailed messages for debugging
- Usage limits use UTC time for daily/monthly resets
- RAG search uses cosine similarity for relevance scoring
- Analytics events are stored with JSONB metadata for flexibility

---

## 🔐 Security Considerations

1. **RLS Policies**: Ensure proper Row Level Security on database tables
2. **API Keys**: Never expose service role key in frontend code
3. **Rate Limiting**: Consider adding rate limiting at the edge function level
4. **Input Validation**: All functions validate required fields before processing
5. **Error Handling**: Sensitive errors are not exposed to clients

---

## 📞 Support

For issues or questions:
1. Check function logs in Insforge dashboard
2. Review error messages in API responses
3. Verify database schema matches requirements
4. Ensure all environment variables are configured
