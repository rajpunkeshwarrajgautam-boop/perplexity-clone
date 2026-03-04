# ContextRiver — God-Tier AI Research Platform

> An infinite-canvas AI engine powered by hybrid vector search, multi-model LLM orchestration, and real-time web intelligence.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Webpack) |
| **Inference** | Groq LPU — LLaMA 3.1 8B, LLaMA 3.3 70B, Mixtral 8x7B, DeepSeek R1 |
| **Web Search** | Tavily API (real-time + academic domain filtering) |
| **Vector Store** | Firestore + `@xenova/transformers` (all-MiniLM-L6-v2 embeddings) |
| **TTS** | Bytez OpenAI-compatible API |
| **Auth** | Clerk (optional — disabled in dev mode) |
| **Styling** | Tailwind CSS v4 |
| **Animations** | Framer Motion (tree-shaken via optimizePackageImports) |

---

## 🏗️ Architecture

```
User Query
    │
    ▼
Infinite Canvas UI (page.tsx)
    │  Command Parser (/write, @research_agent, #context, /execute python)
    ▼
POST /api/chat ──► Rate Limiter ──► Zod Validation
    │
    ├──► hybridSearch()
    │       ├── vectorSearch() ────► Firestore Embeddings (local PDFs)
    │       └── webSearch()   ────► Tavily (live web, academic, prose)
    │
    ├──► Build RAG System Prompt (citations numbered [1][2]...)
    │
    └──► streamText() via Groq LPU
            └──► Multiplex stream: sources → chatId → text tokens
                            │
                            ▼
                    Context River UI (sidebar) + Answer Canvas
```

---

## ⚡ Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set environment variables

Copy `.env.example` to `.env` and fill in:

```env
GROQ_API_KEY=         # https://console.groq.com/keys
TAVILY_API_KEY=       # https://tavily.com
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
BYTEZ_API_KEY=        # For TTS (Text-to-Speech)
```

### 3. Ingest documents (optional)

Place PDFs in `D:/RAG/temp-pdf/` then run:

```bash
npm run ingest
# or dry run (no writes):
npm run ingest:dry-run
```

### 4. Run development server

```bash
npm run dev
```

### 5. Build for production

```bash
npm run build
npm start
```

---

## 🧠 Models Available

| UI Name | Groq Model ID | Best For |
|---|---|---|
| LLaMA 3.1 8B | `llama-3.1-8b-instant` | Fast general queries |
| LLaMA 3.3 70B | `llama-3.3-70b-versatile` | Smart, comprehensive answers |
| Mixtral 8x7B | `mixtral-8x7b-32768` | Long-context, MoE architecture |
| DeepSeek R1 | `deepseek-r1-distill-llama-70b` | Chain-of-Thought reasoning (shows `<think>` blocks) |

---

## 🎨 UI Features

- **Infinite Canvas** — Replaces traditional chat window; `"Everything connected."`
- **Context River Sidebar** — Knowledge Edge (Active Memory, Knowledge Graph, Repositories) + Workspaces (Private Branches, Shared, Agent Workflows)
- **Smart Command Palette** — `'/'` for commands, `'@'` for agents, `'#'` for local context
- **Thought Process Visualization** — DeepSeek R1's `<think>` blocks render as collapsible accordions
- **Source Cards** — Web + PDF sources with favicon, domain, snippet, relevance score
- **Pro Search** — Deep iterative multi-hop search with academic domain focus
- **Text-to-Speech** — Real TTS via Bytez with markdown stripping
- **Copy + Branch** buttons on all assistant messages
- **MoE Architecture Panel** — Live TTFT / SLA indicator in sidebar

---

## 📊 Lighthouse Scores (Production Build)

| Category | Score |
|---|---|
| 🟢 Performance | **77** |
| 🟢 Accessibility | **100** |
| 🟢 Best Practices | **100** |
| 🟢 SEO | **100** |

**Core Web Vitals:** FCP 1.4s · LCP 1.8s · CLS 0 · Speed Index 1.4s

---

## 🔐 Security

- Rate limiting (in-memory sliding window) on `/api/chat` and `/api/tts`
- Zod validation on all API request bodies  
- `Content-Security-Policy` headers with allowlisted domains only
- HTTPS-only in production; no secrets in client bundle
- `robots.txt` + auto-generated `sitemap.xml` via Next.js Metadata API

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Infinite Canvas UI (main chat)
│   ├── layout.tsx            # Root layout + global SEO metadata
│   ├── globals.css           # Global styles
│   ├── sitemap.ts            # Auto-generated sitemap
│   └── api/
│       ├── chat/route.ts     # Hybrid RAG + streaming LLM endpoint
│       └── tts/route.ts      # Text-to-Speech endpoint
├── components/
│   ├── layout/Sidebar.tsx    # Context River sidebar
│   └── ui/
│       ├── CodeBlock.tsx     # Syntax-highlighted code blocks
│       ├── CopyButton.tsx    # Clipboard copy button
│       └── SourceCard.tsx    # Web/PDF source citation card
└── lib/
    ├── schemas.ts            # Zod schemas (single source of truth)
    ├── hybrid-search.ts      # Merges vector + web search
    ├── vector-store.ts       # Firestore embedding search
    ├── web-search.ts         # Tavily real-time web search
    ├── rate-limiter.ts       # Sliding window rate limiter
    ├── firebase-admin.ts     # Firebase Admin SDK singleton
    └── api-handler.ts        # Centralized error handler
scripts/
└── ingest.mjs               # PDF → embeddings ingestion pipeline
public/
└── robots.txt               # SEO robots file
```

---

## 🗓️ Session Log (2026-03-04)

### Changes made today

1. **God-Tier UI Revamp** — Replaced standard chat UI with Infinite Canvas + Context River
2. **Mock Elimination** — Removed all simulated model names (Sonar, GPT-4o, Claude), replaced with real Groq model IDs
3. **Command Parser** — `@research_agent`, `/write`, `#current_context`, `/execute python` now trigger real backend mode switches
4. **Clerk Bypass** — Removed ClerkProvider to fix inference connection errors in dev
5. **Performance Audit** — `optimizePackageImports`, dynamic ReactMarkdown, aria-labels, next/image, SEO meta, robots.txt, sitemap.ts
6. **Lighthouse Results** — Accessibility 89→100, SEO 73→100, Best Practices 96→100, Performance 68→77

### Next session TODO

- [ ] Improve Performance score further (target: > 85)
  - Convert page to hybrid Server/Client components to reduce client bundle
  - Add `<Suspense>` boundaries around heavy sections
  - Consider splitting Settings panel into separate client component
- [ ] Add Clerk production keys for real authentication
- [ ] Wire up sidebar navigation (Active Memory, Knowledge Graph pages)
- [ ] Create `/api/agents/research` for true async multi-hop agent loop
- [ ] Add conversation history persistence (load past chats from Firestore)
- [ ] Mobile responsive testing + fixes
