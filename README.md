# ScoutAI — Autonomous AI Talent Scouting & Engagement Agent

> Built for the Deccan AI Hackathon by **Amogh Bajpai**

**Live Demo:** https://scout-two-pi.vercel.app  
**Repository:** https://github.com/amoghforreal/scoutai

---

## What is ScoutAI?

ScoutAI is a fully autonomous AI talent scouting and engagement agent. You paste a job description — the agent does everything else. It searches GitHub for real developers, scores each candidate across 4 dimensions using LLM reasoning, and drafts a personalized outreach email referencing their actual projects and contributions.

No templates. No manual filtering. One input, end-to-end output.

---

## Demo Video

[Watch the 4-minute walkthrough](#) ← replace with your video link

---

## Architecture

```
User Input (Job Description + Filters)
           │
           ▼
┌─────────────────────────┐
│   Step 1: JD Parser     │  Groq LLaMA 3.3 70B extracts role, skills,
│   (Groq LLM)            │  languages, experience level, keywords
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   Step 2: GitHub Scout  │  GitHub REST API — runs 4-5 targeted
│   (GitHub API)          │  search queries, collects 20-45 profiles
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   Step 3: Profile Fetch │  Parallel fetch of full profiles + top
│   (GitHub API)          │  repositories, stars, forks, languages
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   Step 4: Pre-filter    │  Language overlap check — removes
│   (Custom Logic)        │  irrelevant candidates before scoring
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   Step 5: AI Scorer     │  Groq LLaMA scores each candidate on:
│   (Groq LLM x N)        │  Technical Fit / Activity / Project
│                         │  Quality / Online Presence → Overall
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   Step 6: Email Drafter │  Groq LLaMA writes a personalized
│   (Groq LLM)            │  outreach email per candidate citing
│                         │  their actual repos and star counts
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   Ranked Dashboard      │  Sorted by overall score. Filterable
│   (Next.js Frontend)    │  by score, language, seniority level.
│                         │  One-click email copy. CSV export.
└─────────────────────────┘
```

---

## Scoring Logic

Each candidate is scored across 4 dimensions (0-100):

| Dimension | What it measures |
|---|---|
| **Technical Fit** | Language and skill overlap with the JD, based on repo analysis |
| **Activity** | GitHub tenure, repo count, recency of contributions |
| **Project Quality** | Stars, forks, descriptions — signal of impactful work |
| **Online Presence** | Followers, community reputation, visibility |

The LLM produces an **overall score**, a **hire recommendation** (Strong Hire / Hire / Consider / Pass), a **seniority estimate** (Junior / Mid / Senior / Principal), and a 2-sentence **recruiter verdict** — all grounded in actual candidate data.

---

## Sample Input

```
We are looking for a Senior Full Stack Engineer with deep expertise 
in TypeScript, React, and Node.js. The ideal candidate has built and 
shipped production web applications, contributed to open-source projects, 
and has a strong GitHub portfolio demonstrating code quality and consistency.
```

**Filters:** United States · Senior · 5 candidates

---

## Sample Output

```
#1 — Oleksii Trekhleb (@trekhleb) · Sr Engineer @ Uber
     Overall: 82/100 · Strong Hire · Senior
     Technical Fit: 80 | Activity: 70 | Quality: 85 | Presence: 90
     "Strong TypeScript foundation demonstrated through homemade-gpt-js 
      (91 stars). Proven track record at Uber. Limited explicit React 
      exposure in public repos."

#2 — [Candidate 2] ...
#3 — [Candidate 3] ...
```

**Outreach email generated:**
```
Subject: Your work on homemade-gpt-js caught our eye — Senior Full Stack role

Hi Oleksii,

Your homemade-gpt-js project — a minimal TensorFlow.js re-implementation 
of Karpathy's minGPT — is exactly the kind of deep technical work we look 
for. At Uber, you've shipped at scale. We're building something similar and 
think you'd bring a unique perspective...
```

---

## Features

- Autonomous 6-step agentic pipeline — no human in the loop
- Region/location filtering — search by country or city
- Experience level filtering — Junior, Mid, Senior, Principal
- Real-time step-by-step loading indicator
- 4-dimension AI scoring with written reasoning per dimension
- Hire recommendation tags — Strong Hire, Hire, Consider, Pass
- Seniority estimation
- Personalized outreach emails referencing actual candidate work
- Results filtering by score, language, seniority
- CSV export of all candidates and scores
- Dark mode (Night Hunt) and Light mode (Day Scout) with forest theme
- Fully mobile responsive
- "Did you mean?" location correction (USA → United States)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, Inline CSS |
| AI / LLM | Groq API — LLaMA 3.3 70B Versatile, LLaMA 3.1 8B (fallback) |
| Data | GitHub REST API v3 |
| Deployment | Vercel |
| Fonts | Playfair Display, DM Sans, DM Mono (Google Fonts) |

**APIs declared:**
- Groq API (free tier + secondary account)
- GitHub Personal Access Token (public data only, no scopes)

---

## Local Setup

```bash
# Clone the repo
git clone https://github.com/amoghforreal/scoutai.git
cd scoutai

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Add your keys to .env.local:
# GROQ_API_KEY=your_groq_key
# GITHUB_TOKEN=your_github_token

# Run locally
npm run dev
```

Open `http://localhost:3000`

---

## Environment Variables

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Groq API key (get free at console.groq.com) |
| `GROQ_API_KEY_2` | Secondary Groq key for rate limit fallback |
| `GITHUB_TOKEN` | GitHub Personal Access Token (no scopes needed) |

---

## Project Structure

```
scoutai/
├── app/
│   ├── api/
│   │   └── scout/
│   │       └── route.ts      # Core agent pipeline
│   ├── globals.css           # Base styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Frontend UI
├── next.config.js
├── package.json
└── README.md
```

---

## Submission Details

- **Built by:** Amogh Bajpai
- **GitHub:** https://github.com/amoghforreal/scoutai
- **Live URL:** https://scout-two-pi.vercel.app
- **Hackathon:** Deccan AI Hackathon 2025