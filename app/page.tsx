'use client';
import { useState } from 'react';

interface Repo { name: string; description: string; stars: number; language: string; }
interface Scores { technical_fit: number; technical_reasoning: string; activity_score: number; activity_reasoning: string; project_quality: number; quality_reasoning: string; presence_score: number; presence_reasoning: string; overall_score: number; verdict: string; strengths: string[]; concerns: string[]; }
interface Candidate { username: string; name: string; avatar: string; bio: string; location: string; followers: number; public_repos: number; github_url: string; topRepos: Repo[]; topLanguages: string[]; scores: Scores; email: string; }
interface Results { requirements: { role: string; skills: string[]; languages: string[]; description: string }; candidates: Candidate[]; total_searched: number; }

const STEPS = [
  'Parsing job description with AI...',
  'Searching GitHub for matching developers...',
  'Fetching candidate profiles and repositories...',
  'Scoring candidates across 4 dimensions...',
  'Generating personalized outreach emails...',
];

export default function Home() {
  const [jd, setJd] = useState('');
  const [count, setCount] = useState(5);
  const [status, setStatus] = useState<'idle' | 'loading' | 'results'>('idle');
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [copied, setCopied] = useState(false);

  const handleScout = async () => {
    if (!jd.trim()) return;
    setStatus('loading');
    setError('');
    setStep(0);
    let s = 0;
    const iv = setInterval(() => {
      s++;
      setStep(s);
      if (s >= STEPS.length - 1) clearInterval(iv);
    }, 8000);
    try {
      const res = await fetch('/api/scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: jd, count }),
      });
      const data = await res.json();
      clearInterval(iv);
      if (!res.ok) throw new Error(data.error);
      setResults(data);
      setStatus('results');
    } catch (e: any) {
      clearInterval(iv);
      setError(e.message || 'Something went wrong');
      setStatus('idle');
    }
  };

  const scoreColor = (n: number) => n >= 80 ? 'text-emerald-400' : n >= 60 ? 'text-amber-400' : 'text-red-400';
  const scoreBg = (n: number) => n >= 80 ? 'bg-emerald-400' : n >= 60 ? 'bg-amber-400' : 'bg-red-400';
  const rankColor = (i: number) => i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-white/20';

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 sticky top-0 z-50 bg-[#0a0a0f]/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center font-bold text-black text-sm">S</div>
            <span className="font-bold text-lg">ScoutAI</span>
            <span className="text-xs text-white/30 border border-white/10 rounded px-2 py-0.5">Talent Agent</span>
          </div>
          {status === 'results' && (
            <button onClick={() => { setStatus('idle'); setResults(null); }} className="text-sm text-white/50 hover:text-white transition-colors">
              New Search
            </button>
          )}
        </div>
      </header>

      {status === 'idle' && (
        <div className="max-w-3xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-amber-400/10 text-amber-400 text-xs font-medium px-3 py-1.5 rounded-full border border-amber-400/20 mb-6">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
              Autonomous AI Talent Scouting Agent
            </div>
            <h1 className="text-5xl font-bold mb-4 leading-tight">
              Find your next<br />
              <span className="text-amber-400">10x engineer</span>
            </h1>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              Paste a job description. The agent searches GitHub, scores candidates across 4 dimensions, and drafts personalized outreach in under a minute.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <label className="block text-sm font-medium text-white/60 mb-3">Job Description</label>
            <textarea
              value={jd}
              onChange={e => setJd(e.target.value)}
              placeholder="We're looking for a Senior Backend Engineer with 5+ years of experience in Python and FastAPI. The ideal candidate has worked with distributed systems, PostgreSQL, Redis, and has contributed to open-source projects..."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-white/20 resize-none h-44 focus:outline-none focus:border-amber-400/50 transition-colors"
            />
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/40">Scout</span>
                <select
                  value={count}
                  onChange={e => setCount(Number(e.target.value))}
                  className="bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                >
                  {[3, 5, 7, 10].map(n => (
                    <option key={n} value={n} className="bg-gray-900">{n}</option>
                  ))}
                </select>
                <span className="text-sm text-white/40">candidates</span>
              </div>
              <button
                onClick={handleScout}
                disabled={!jd.trim()}
                className="bg-amber-400 hover:bg-amber-300 disabled:opacity-30 disabled:cursor-not-allowed text-black font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
              >
                Scout Talent
              </button>
            </div>
            {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
          </div>

          <div className="mt-10 grid grid-cols-4 gap-3">
            {[
              ['01', 'Parse JD', 'AI extracts skills and requirements'],
              ['02', 'Search GitHub', 'Finds matching developers'],
              ['03', 'Score and Rank', '4-dimension AI scoring'],
              ['04', 'Draft Emails', 'Personalized outreach ready'],
            ].map(([num, title, desc]) => (
              <div key={num} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-amber-400 text-xs font-mono mb-2">{num}</div>
                <div className="font-medium text-sm mb-1">{title}</div>
                <div className="text-white/30 text-xs">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {status === 'loading' && (
        <div className="max-w-md mx-auto px-6 py-32 text-center">
          <div className="w-14 h-14 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin mx-auto mb-8" />
          <h2 className="text-xl font-semibold mb-2">Agent Running</h2>
          <p className="text-white/30 text-sm mb-10">Takes 30 to 60 seconds. Keep this tab open.</p>
          <div className="space-y-3 text-left">
            {STEPS.map((label, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-500 ${
                  idx < step
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : idx === step
                    ? 'border-amber-400/30 bg-amber-400/5'
                    : 'border-white/5 opacity-30'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 font-bold ${
                    idx < step
                      ? 'bg-emerald-400 text-black'
                      : idx === step
                      ? 'bg-amber-400 text-black animate-pulse'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  {idx < step ? '✓' : idx + 1}
                </div>
                <span className={`text-sm ${idx <= step ? 'text-white' : 'text-white/30'}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {status === 'results' && results && (
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">{results.candidates.length} Candidates Scouted</h2>
              <p className="text-white/40 text-sm mt-1">
                Role: <span className="text-white/70">{results.requirements.role}</span> · Skills:{' '}
                <span className="text-white/70">{results.requirements.skills?.join(', ')}</span> · Searched{' '}
                {results.total_searched} profiles
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              {results.requirements.languages?.map(l => (
                <span key={l} className="bg-amber-400/10 text-amber-400 text-xs px-3 py-1 rounded-full border border-amber-400/20">
                  {l}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            {results.candidates.map((c, idx) => (
              <div key={c.username} className="bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-6 transition-all">
                <div className="flex items-start gap-5">
                  <div className="text-center w-8 flex-shrink-0 mt-1">
                    <span className={`text-xl font-bold ${rankColor(idx)}`}>#{idx + 1}</span>
                  </div>
                  <img src={c.avatar} alt={c.name} className="w-14 h-14 rounded-full border border-white/10 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-lg leading-tight">{c.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <a
                            href={c.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/40 text-sm hover:text-amber-400 transition-colors"
                          >
                            @{c.username}
                          </a>
                          {c.location && <span className="text-white/25 text-sm">· {c.location}</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`text-3xl font-bold ${scoreColor(c.scores?.overall_score)}`}>
                          {c.scores?.overall_score}
                          <span className="text-sm text-white/25">/100</span>
                        </div>
                        <div className="text-xs text-white/30 mt-0.5">Overall Score</div>
                      </div>
                    </div>

                    {c.bio && <p className="text-white/50 text-sm mt-2 leading-relaxed">{c.bio}</p>}

                    <div className="flex gap-2 mt-3 flex-wrap items-center">
                      {c.topLanguages.map(l => (
                        <span key={l} className="bg-white/10 text-white/60 text-xs px-2 py-0.5 rounded">{l}</span>
                      ))}
                      <span className="text-white/25 text-xs">{c.followers} followers · {c.public_repos} repos</span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 mt-5">
                      {[
                        { label: 'Technical Fit', score: c.scores?.technical_fit, reason: c.scores?.technical_reasoning },
                        { label: 'Activity', score: c.scores?.activity_score, reason: c.scores?.activity_reasoning },
                        { label: 'Project Quality', score: c.scores?.project_quality, reason: c.scores?.quality_reasoning },
                        { label: 'Online Presence', score: c.scores?.presence_score, reason: c.scores?.presence_reasoning },
                      ].map(d => (
                        <div key={d.label}>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-white/50">{d.label}</span>
                            <span className={scoreColor(d.score)}>{d.score}</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${scoreBg(d.score)}`} style={{ width: `${d.score}%` }} />
                          </div>
                          <p className="text-white/25 text-xs mt-1">{d.reason}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 mt-4 flex-wrap">
                      {c.scores?.strengths?.map(s => (
                        <span key={s} className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded border border-emerald-500/20">
                          checkmark {s}
                        </span>
                      ))}
                      {c.scores?.concerns?.map(s => (
                        <span key={s} className="bg-red-500/10 text-red-400 text-xs px-2 py-0.5 rounded border border-red-500/20">
                          warning {s}
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {c.topRepos.slice(0, 2).map(r => (
                        <div key={r.name} className="bg-white/5 rounded-lg p-3 border border-white/5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-white/80 truncate">{r.name}</span>
                            <span className="text-xs text-white/30 ml-2 flex-shrink-0">star {r.stars}</span>
                          </div>
                          <p className="text-xs text-white/35 truncate">{r.description || 'No description'}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 mt-5">
                      <button
                        onClick={() => setSelected(c)}
                        className="bg-amber-400 hover:bg-amber-300 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                      >
                        View Outreach Email
                      </button>
                      <a
                        href={c.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-white/15 hover:border-white/30 text-white/60 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors"
                      >
                        GitHub Profile
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur z-50 flex items-center justify-center p-4"
          onClick={() => { setSelected(null); setCopied(false); }}
        >
          <div
            className="bg-[#12121a] border border-white/20 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <img src={selected.avatar} alt="" className="w-9 h-9 rounded-full" />
                <div>
                  <div className="font-semibold text-sm">{selected.name}</div>
                  <div className="text-white/40 text-xs">@{selected.username}</div>
                </div>
              </div>
              <button
                onClick={() => { setSelected(null); setCopied(false); }}
                className="text-white/40 hover:text-white text-lg leading-none"
              >
                X
              </button>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <pre className="text-sm text-white/80 whitespace-pre-wrap font-sans leading-relaxed">{selected.email}</pre>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(selected.email); setCopied(true); }}
              className={`mt-4 w-full font-semibold py-2.5 rounded-xl text-sm transition-colors ${
                copied ? 'bg-emerald-500 text-white' : 'bg-amber-400 hover:bg-amber-300 text-black'
              }`}
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}