# 🚀 The Road — ICPC World Finals & Daily World Writing Portal

A dual-focus personal growth tracking workspace engineered for **Nguyen Khac Thu**:
1. **World Finals 2026 Journey**: Live telemetry syncing solved problems from Universal Cup (`universal-cup.vercel.app/ac/nguyenkhacthu`), tracking AC targets, recent submissions, and progress rate.
2. **The World Daily Essays**: Daily deep-dive writing on great minds and world figures (`other/writing/the_world`), preserving 100% unaltered raw text, equipped with automated instant synchronization.

---

## 📁 Repository Architecture

```
the_road/
├── my_road/             # Dual-split unified dashboard (Universal Cup + The World)
│   ├── app/
│   │   ├── api/
│   │   │   ├── ucup/    # Real-time caching proxy to Universal Cup public API
│   │   │   └── articles/# Read essay directory & stream unaltered content
│   │   ├── layout.js
│   │   └── page.js      # 50/50 split CRT terminal interface
│   └── package.json
│
├── the_world/           # Standalone writing & essay archive viewer
│   ├── app/
│   │   ├── api/
│   │   │   ├── articles/# Clean essay retrieval & metadata
│   │   │   └── sync/    # One-click folder synchronization endpoint
│   │   ├── layout.js
│   │   └── page.js      # Minimalist retro terminal reading environment
│   ├── sync.js          # CLI sync script
│   └── package.json
│
└── README.md
```

---

## ⚡ Quick Start

### 1. `the_world` (Writing Archive)
```bash
cd the_world
npm install
npm run dev # Runs on port 3001
```
Or sync articles from the command line:
```bash
npm run sync
```

### 2. `my_road` (Dual Split Portal)
```bash
cd my_road
npm install
npm run dev # Runs on port 3000
```
Open [http://localhost:3000](http://localhost:3000) to view the split-screen workstation.

---

## 🛡️ Security & Performance Highlights
- **Path Sanitization**: Safe base-name resolution prevents directory traversal attacks.
- **Dynamic Caching**: High-frequency API calls to UCUP are cached with Next.js revalidation to prevent rate limits.
- **Uncompromised Content**: Renders strictly raw text (`robert_noyce.txt`, etc.) without stripping or altering user writings.
- **CRT Terminal Aesthetics**: Authentic VT323 scanline, phosphor glow, typing effects, and glitch counter animations.
