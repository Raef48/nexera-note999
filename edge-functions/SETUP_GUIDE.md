# 🚀 Nexera Note - AI Edge Functions Setup Guide

## Overview

This package includes **3 powerful edge functions** for your Nexera Note application:

| Function | Description | Status |
|----------|-------------|--------|
| **AI Note Generator** | Generate structured notes from prompts | ✅ Ready |
| **AI Search / RAG** | Search notes + AI-powered answers | ✅ Ready |
| **Analytics Tracker** | Track usage & enforce limits | ✅ Ready |

---

## 📦 What's Included

```
edge-functions/
├── ai-note-generator.ts      # AI-powered note creation
├── ai-search.ts              # RAG search across notes
├── analytics-track.ts        # Usage tracking & limits
├── database-schema.sql       # Database setup script
├── README.md                 # Detailed documentation
└── SETUP_GUIDE.md           # This file
```

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Run Database Schema

1. Go to **Insforge Dashboard** → **SQL Editor**
2. Copy contents of `database-schema.sql`
3. Paste and run
4. ✅ Tables created: `analytics_events`, `user_profiles`, `usage_limits`

### Step 2: Deploy Edge Functions

For each function (`ai-note-generator.ts`, `ai-search.ts`, `analytics-track.ts`):

1. Go to **Insforge Dashboard** → **Edge Functions**
2. Click **Create New Function**
3. Name it (e.g., `ai-note-generator`)
4. Upload the `.ts` file
5. Add environment variables:
   ```env
   VITE_GROQ_API_KEY=your_gemini_api_key
   VITE_INSFORGE_URL=https://your-project.insforge.app
   VITE_INSFORGE_API_KEY=your_anon_key
   ```
6. Click **Deploy**

Repeat for all 3 functions.

### Step 3: Test Deployment

```bash
# Test AI Note Generator
curl -X POST https://your-project.insforge.app/functions/v1/ai-note-generator \
  -H "Content-Type: application/json" \
  -H "apikey: your_anon_key" \
  -d '{"topic": "DevOps Best Practices", "userId": "test-user", "style": "outline"}'
```

Expected response:
```json
{
  "title": "📝 DevOps Best Practices",
  "content": "# DevOps Best Practices\n\n## Introduction...",
  "tags": ["devops", "best", "practices"]
}
```

---

## 🔧 Frontend Integration

### Add to Your React App

Create a utility file `src/services/ai-functions.ts`:

```typescript
const INSFORGE_URL = import.meta.env.VITE_INSFORGE_URL;
const INSFORGE_ANON_KEY = import.meta.env.VITE_INSFORGE_ANON_KEY;

// AI Note Generator
export async function generateNote(topic: string, style: string = 'default') {
  try {
    const response = await fetch(`${INSFORGE_URL}/functions/v1/ai-note-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': INSFORGE_ANON_KEY,
      },
      body: JSON.stringify({
        topic,
        userId: user.id, // current user ID
        style, // 'default', 'detailed', 'outline', 'tutorial'
      }),
    });

    if (!response.ok) throw new Error('Failed to generate note');
    
    const data = await response.json();
    return data; // { title, content, tags }
  } catch (error) {
    console.error('AI Note Generator error:', error);
    throw error;
  }
}

// AI Search with RAG
export async function searchNotes(query: string, mode: 'search' | 'rag' | 'both' = 'both') {
  try {
    const response = await fetch(`${INSFORGE_URL}/functions/v1/ai-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': INSFORGE_ANON_KEY,
      },
      body: JSON.stringify({
        query,
        userId: user.id,
        mode,
        limit: 10,
      }),
    });

    if (!response.ok) throw new Error('Search failed');
    
    const data = await response.json();
    return data; // { results, ragAnswer, sources }
  } catch (error) {
    console.error('AI Search error:', error);
    throw error;
  }
}

// Track Analytics
export async function trackUsage(eventType: string, metadata?: any) {
  try {
    const response = await fetch(`${INSFORGE_URL}/functions/v1/analytics-track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': INSFORGE_ANON_KEY,
      },
      body: JSON.stringify({
        userId: user.id,
        eventType, // 'message_sent', 'ai_query', 'file_uploaded', etc.
        metadata,
      }),
    });

    const data = await response.json();
    
    if (!data.success) {
      // Handle limit exceeded
      if (data.usage) {
        console.warn('Usage limit warning:', data.message);
      }
      throw new Error(data.message || 'Failed to track usage');
    }
    
    return data; // { success, usage, message }
  } catch (error) {
    console.error('Analytics tracking error:', error);
    throw error;
  }
}
```

### Usage Examples

```typescript
// Generate a note
const note = await generateNote('Introduction to Machine Learning', 'detailed');
await saveNote({ title: note.title, content: note.content });

// Search notes with AI
const searchResults = await searchNotes('How to deploy Docker containers?');
console.log(searchResults.ragAnswer); // AI-generated answer
console.log(searchResults.sources);   // Source notes

// Track AI usage
await trackUsage('ai_query', { query: 'DevOps practices', tokens: 1500 });
```

---

## 📊 User Tiers & Limits

Default limits configured in `analytics-track.ts`:

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| **Daily Messages** | 50 | 500 | ∞ |
| **Monthly Messages** | 500 | 5,000 | ∞ |
| **Daily AI Queries** | 20 | 100 | ∞ |
| **Monthly AI Queries** | 200 | 1,000 | ∞ |
| **Daily File Uploads** | 10 | 100 | ∞ |
| **Monthly File Uploads** | 100 | 1,000 | ∞ |

To change limits, edit `DEFAULT_LIMITS` in `analytics-track.ts`.

---

## 🎯 Feature Implementation Guide

### 🧠 5. AI Note Generator

**User Flow:**
1. User clicks "Generate Note" button
2. Types prompt: "Create notes about DevOps"
3. Selects style: Outline / Detailed / Tutorial
4. AI generates structured note
5. Note opens in editor for review/editing

**UI Component:**
```tsx
function AINoteGenerator() {
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState('default');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const note = await generateNote(topic, style);
      // Open in editor
      setActiveNote({ title: note.title, content: note.content });
    } catch (error) {
      alert('Failed to generate note');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input 
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="What should I create notes about?"
      />
      <select value={style} onChange={(e) => setStyle(e.target.value)}>
        <option value="default">Standard</option>
        <option value="detailed">Detailed</option>
        <option value="outline">Outline</option>
        <option value="tutorial">Tutorial</option>
      </select>
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Note'}
      </button>
    </div>
  );
}
```

---

### 🔍 6. AI Search / RAG

**User Flow:**
1. User opens search bar
2. Types question: "How do I set up CI/CD?"
3. AI searches all notes
4. Returns:
   - Relevant note excerpts
   - AI-generated answer (RAG)
   - Source citations

**UI Component:**
```tsx
function AISearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await searchNotes(query, 'both');
      setResults(data);
    } catch (error) {
      alert('Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask anything about your notes..."
      />
      <button onClick={handleSearch} disabled={loading}>
        {loading ? 'Searching...' : 'Search'}
      </button>

      {results && (
        <div>
          {/* AI Answer */}
          <div className="ai-answer">
            <h3>AI Answer</h3>
            <ReactMarkdown>{results.ragAnswer}</ReactMarkdown>
          </div>

          {/* Sources */}
          <div className="sources">
            <h3>Sources</h3>
            {results.sources.map(source => (
              <div key={source.noteId}>
                <h4>{source.title}</h4>
                <p>{source.excerpt}</p>
              </div>
            ))}
          </div>

          {/* Search Results */}
          <div className="search-results">
            {results.results.map(result => (
              <div key={result.id}>
                <h4>{result.title}</h4>
                <p>Relevance: {result.relevanceScore}%</p>
                {result.excerpts.map((excerpt, i) => (
                  <p key={i}>{excerpt}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### 📊 7. Analytics Dashboard (SaaS Feature)

**Admin Dashboard:**
```tsx
function AnalyticsDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Fetch from Insforge
    fetchAnalytics().then(setStats);
  }, []);

  return (
    <div>
      <h1>Usage Analytics</h1>
      
      {/* Metrics */}
      <div className="metrics-grid">
        <MetricCard title="Total Messages" value={stats.totalMessages} />
        <MetricCard title="Active Users" value={stats.activeUsers} />
        <MetricCard title="AI Queries Today" value={stats.aiQueriesToday} />
        <MetricCard title="File Uploads" value={stats.fileUploads} />
      </div>

      {/* Usage by Tier */}
      <div className="tier-usage">
        <h2>Usage by Plan</h2>
        <TierChart tiers={stats.tiers} />
      </div>

      {/* Top Users */}
      <div className="top-users">
        <h2>Most Active Users</h2>
        <UserTable users={stats.topUsers} />
      </div>
    </div>
  );
}
```

**User Usage Widget:**
```tsx
function UsageWidget() {
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    // Get current usage
    checkUsage().then(setUsage);
  }, []);

  if (!usage) return null;

  return (
    <div className="usage-widget">
      <h3>Your Usage</h3>
      
      <ProgressBar 
        label="AI Queries (Daily)"
        current={usage.current_daily_usage}
        max={usage.daily_limit}
      />
      
      <ProgressBar 
        label="AI Queries (Monthly)"
        current={usage.current_monthly_usage}
        max={usage.monthly_limit}
      />

      {usage.remaining_daily < 5 && (
        <Alert type="warning">
          Only {usage.remaining_daily} AI queries left today!
        </Alert>
      )}

      <button onClick={() => upgradePlan()}>
        Upgrade to Pro for Unlimited Usage
      </button>
    </div>
  );
}
```

---

## 🔐 Security Best Practices

1. **Enable RLS**: All tables have Row Level Security enabled
2. **Use Anon Key**: Frontend uses anon key, not service role
3. **Validate Input**: All functions validate required fields
4. **Error Handling**: Sensitive errors not exposed to clients
5. **Rate Limiting**: Consider adding Cloudflare rate limiting

---

## 📈 Monitoring & Logs

### View Function Logs

1. **Insforge Dashboard** → **Edge Functions**
2. Click on function name
3. View **Logs** tab
4. Filter by date, status, etc.

### Common Issues

| Issue | Solution |
|-------|----------|
| 500 Error | Check environment variables |
| AI not working | Verify Groq API key |
| No search results | Create notes first |
| Limit errors | Check user tier in database |

---

## 💡 Pro Tips

1. **Customize Prompts**: Edit system prompts in `ai-note-generator.ts` for your use case
2. **Adjust Limits**: Modify `DEFAULT_LIMITS` in `analytics-track.ts`
3. **Add Events**: Extend `eventType` enum for new tracking needs
4. **Cache Results**: Add Redis caching for frequently searched terms
5. **Webhooks**: Add Stripe webhooks for automatic tier upgrades

---

## 🎉 Next Steps

1. ✅ Deploy edge functions
2. ✅ Run database schema
3. ✅ Test with curl/API client
4. ✅ Integrate with frontend
5. ✅ Add UI components
6. ✅ Monitor usage & logs
7. 🚀 Launch your SaaS!

---

## 📞 Support

- **Documentation**: See `README.md` for detailed API docs
- **Database Schema**: See `database-schema.sql` for table structure
- **Insforge Docs**: https://insforge.app/docs
- **Groq API**: https://console.groq.com/docs

---

**Built with ❤️ for Nexera Note**
