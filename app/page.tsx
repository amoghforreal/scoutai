'use client';
import { useState, useEffect } from 'react';

interface Repo { name: string; description: string; stars: number; forks: number; language: string; url: string; }
interface Scores {
  technical_fit: number; technical_reasoning: string;
  activity_score: number; activity_reasoning: string;
  project_quality: number; quality_reasoning: string;
  presence_score: number; presence_reasoning: string;
  overall_score: number; verdict: string;
  strengths: string[]; concerns: string[];
  seniority_estimate: string; hire_recommendation: string;
}
interface Candidate {
  username: string; name: string; avatar: string; bio: string;
  location: string; company: string; followers: number; following: number;
  public_repos: number; github_url: string; topRepos: Repo[];
  topLanguages: string[]; scores: Scores; email: string;
  totalStars: number; yearsOnGitHub: number; hireable: boolean;
}
interface Results {
  requirements: { role: string; skills: string[]; languages: string[]; experience_level: string; description: string };
  candidates: Candidate[];
  total_searched: number;
  location: string;
}

const STEPS = [
  { label: 'Parsing job description with AI', icon: '🧠' },
  { label: 'Searching GitHub for matching developers', icon: '🔍' },
  { label: 'Fetching candidate profiles and repositories', icon: '📦' },
  { label: 'Scoring candidates across 4 dimensions', icon: '⚡' },
  { label: 'Generating personalized outreach emails', icon: '✉️' },
];

function AnimatedScore({ target }: { target: number }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const steps = 40;
    const increment = target / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setCurrent(Math.min(Math.round(increment * step), target));
      if (step >= steps) clearInterval(timer);
    }, 1000 / steps);
    return () => clearInterval(timer);
  }, [target]);
  return <>{current}</>;
}

function ScoreBar({ score, label, reasoning }: { score: number; label: string; reasoning: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => { setTimeout(() => setWidth(score), 200); }, [score]);
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
        <span style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</span>
        <span style={{ color, fontWeight: 600 }}>{score}</span>
      </div>
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${width}%`, background: color, borderRadius: '999px', transition: 'width 1s cubic-bezier(0.4,0,0.2,1)', boxShadow: `0 0 8px ${color}55` }} />
      </div>
      {reasoning && <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '11px', marginTop: '5px', lineHeight: 1.4, margin: '5px 0 0' }}>{reasoning}</p>}
    </div>
  );
}

function HireTag({ rec }: { rec: string }) {
  const config: Record<string, { label: string; bg: string; color: string; border: string }> = {
    strong_yes: { label: '⚡ Strong Hire', bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
    yes: { label: '✓ Hire', bg: 'rgba(99,102,241,0.12)', color: '#818cf8', border: 'rgba(99,102,241,0.3)' },
    maybe: { label: '◎ Maybe', bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
    no: { label: '✕ Pass', bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  };
  const c = config[rec] || config.maybe;
  return (
    <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px' }}>
      {c.label}
    </span>
  );
}

function SeniorityTag({ level }: { level: string }) {
  const config: Record<string, { color: string; bg: string }> = {
    junior: { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
    mid: { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
    senior: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    principal: { color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  };
  const c = config[level] || config.mid;
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' as any, letterSpacing: '0.06em' }}>
      {level}
    </span>
  );
}

function exportToCSV(candidates: Candidate[], role: string) {
  const headers = ['Rank', 'Name', 'Username', 'Location', 'Overall Score', 'Technical Fit', 'Activity', 'Project Quality', 'Presence', 'Hire Recommendation', 'Seniority', 'Followers', 'Total Stars', 'Top Language', 'GitHub URL'];
  const rows = candidates.map((c, i) => [
    i + 1, c.name, c.username, c.location || 'N/A',
    c.scores?.overall_score, c.scores?.technical_fit, c.scores?.activity_score,
    c.scores?.project_quality, c.scores?.presence_score,
    c.scores?.hire_recommendation, c.scores?.seniority_estimate,
    c.followers, c.totalStars, c.topLanguages[0] || 'N/A', c.github_url
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scoutai-${role.toLowerCase().replace(/\s+/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [jd, setJd] = useState('');
  const [location, setLocation] = useState('');
  const [count, setCount] = useState(5);
  const [experienceLevel, setExperienceLevel] = useState('any');
  const [status, setStatus] = useState<'idle' | 'loading' | 'results'>('idle');
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [filterScore, setFilterScore] = useState(0);
  const [filterLang, setFilterLang] = useState('');
  const [filterExp, setFilterExp] = useState('any');

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
    }, 9000);
    try {
      const res = await fetch('/api/scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: jd, count, location: location.trim() }),
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

  const filteredCandidates = results?.candidates.filter(c => {
    if (filterScore > 0 && (c.scores?.overall_score || 0) < filterScore) return false;
    if (filterLang && !c.topLanguages.includes(filterLang)) return false;
    if (filterExp !== 'any' && c.scores?.seniority_estimate !== filterExp) return false;
    return true;
  }) || [];

  const allLanguages = [...new Set(results?.candidates.flatMap(c => c.topLanguages) || [])].slice(0, 10);
  const overallColor = (n: number) => n >= 80 ? '#10b981' : n >= 60 ? '#f59e0b' : '#ef4444';
  const rankGradient = (i: number) => {
    if (i === 0) return 'linear-gradient(135deg, #f59e0b, #d97706)';
    if (i === 1) return 'linear-gradient(135deg, #9ca3af, #6b7280)';
    if (i === 2) return 'linear-gradient(135deg, #b45309, #92400e)';
    return 'rgba(255,255,255,0.06)';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080B14', color: 'white', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(245,158,11,0.04) 0%, transparent 70%)' }} />
      </div>

      {/* Header */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(8,11,20,0.9)', backdropFilter: 'blur(20px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, boxShadow: '0 0 20px rgba(99,102,241,0.35)' }}>S</div>
            <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.02em' }}>ScoutAI</span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '2px 8px', letterSpacing: '0.06em' }}>TALENT AGENT</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {status === 'results' && results && (
              <>
                <button onClick={() => exportToCSV(filteredCandidates, results.requirements.role)}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: '12px', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ↓ Export CSV
                </button>
                <button onClick={() => { setStatus('idle'); setResults(null); setFilterScore(0); setFilterLang(''); setFilterExp('any'); }}
                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  New Search
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* IDLE */}
        {status === 'idle' && (
          <div style={{ maxWidth: '660px', margin: '0 auto', padding: '80px 24px 60px' }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: '999px', padding: '6px 16px', marginBottom: '28px' }}>
                <span style={{ width: '6px', height: '6px', background: '#6366f1', borderRadius: '50%', display: 'inline-block' }} />
                <span style={{ fontSize: '12px', color: '#818cf8', fontWeight: 600, letterSpacing: '0.06em' }}>AUTONOMOUS AI TALENT AGENT</span>
              </div>
              <h1 style={{ fontSize: '54px', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.03em', margin: '0 0 20px' }}>
                Find your next<br />
                <span style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a78bfa 50%, #6366f1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  10x engineer
                </span>
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: '17px', lineHeight: 1.65, margin: 0 }}>
                Paste a job description. The agent autonomously scouts GitHub,<br />
                scores candidates across 4 dimensions, and drafts personalized outreach.
              </p>
            </div>

            <div style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '28px', backdropFilter: 'blur(10px)' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', marginBottom: '10px' }}>JOB DESCRIPTION</label>
              <textarea
                value={jd}
                onChange={e => setJd(e.target.value)}
                placeholder="We are looking for a Senior Backend Engineer with 5+ years of experience in Python and FastAPI. The ideal candidate has built distributed systems, worked with PostgreSQL and Redis, and has contributed to open-source projects..."
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px', fontSize: '14px', color: 'white', resize: 'none', height: '160px', outline: 'none', fontFamily: 'inherit', lineHeight: 1.65, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', marginBottom: '8px' }}>REGION / LOCATION</label>
                  <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. India, Berlin, Remote"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: 'white', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', marginBottom: '8px' }}>EXPERIENCE LEVEL</label>
                  <select value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)}
                    style={{ width: '100%', background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: 'white', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                    <option value="any">Any Level</option>
                    <option value="junior">Junior</option>
                    <option value="mid">Mid-Level</option>
                    <option value="senior">Senior</option>
                    <option value="principal">Principal</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Scout</span>
                  <select value={count} onChange={e => setCount(Number(e.target.value))}
                    style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '7px 12px', fontSize: '13px', color: 'white', outline: 'none' }}>
                    {[3, 5, 7, 10].map(n => <option key={n} value={n} style={{ background: '#0d1117' }}>{n}</option>)}
                  </select>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>candidates</span>
                </div>
                <button onClick={handleScout} disabled={!jd.trim()}
                  style={{ background: jd.trim() ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.04)', border: 'none', color: jd.trim() ? 'white' : 'rgba(255,255,255,0.2)', fontWeight: 700, padding: '11px 26px', borderRadius: '12px', cursor: jd.trim() ? 'pointer' : 'not-allowed', fontSize: '14px', boxShadow: jd.trim() ? '0 0 28px rgba(99,102,241,0.4)' : 'none', transition: 'all 0.2s', fontFamily: 'inherit', letterSpacing: '-0.01em' }}>
                  Scout Talent →
                </button>
              </div>
              {error && <p style={{ marginTop: '12px', color: '#f87171', fontSize: '13px', margin: '12px 0 0' }}>{error}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '20px' }}>
              {[
                { num: '01', icon: '🧠', title: 'Parse JD', desc: 'AI extracts skills and requirements' },
                { num: '02', icon: '🔍', title: 'Search GitHub', desc: 'Finds real individual developers' },
                { num: '03', icon: '⚡', title: 'Score & Rank', desc: '4-dimension AI scoring engine' },
                { num: '04', icon: '✉️', title: 'Draft Emails', desc: 'Personalized outreach per candidate' },
              ].map(item => (
                <div key={item.num} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '16px' }}>
                  <div style={{ fontSize: '20px', marginBottom: '10px' }}>{item.icon}</div>
                  <div style={{ fontSize: '10px', color: 'rgba(99,102,241,0.7)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '5px' }}>{item.num}</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '5px' }}>{item.title}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)', lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LOADING */}
        {status === 'loading' && (
          <div style={{ maxWidth: '460px', margin: '0 auto', padding: '100px 24px', textAlign: 'center' }}>
            <div style={{ width: '52px', height: '52px', border: '2px solid rgba(99,102,241,0.12)', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 32px', animation: 'spin 0.8s linear infinite' }} />
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.02em' }}>Agent Running</h2>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', marginBottom: '40px' }}>
              Scouting {location || 'globally'} for {count} candidates. Takes 30-60 seconds.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
              {STEPS.map((s, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 16px', borderRadius: '12px',
                  border: `1px solid ${idx < step ? 'rgba(16,185,129,0.2)' : idx === step ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.04)'}`,
                  background: idx < step ? 'rgba(16,185,129,0.05)' : idx === step ? 'rgba(99,102,241,0.07)' : 'transparent',
                  opacity: idx > step ? 0.3 : 1, transition: 'all 0.5s ease'
                }}>
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0,
                    background: idx < step ? '#10b981' : idx === step ? '#6366f1' : 'rgba(255,255,255,0.05)',
                    color: idx < step ? 'black' : 'white',
                    boxShadow: idx === step ? '0 0 16px rgba(99,102,241,0.45)' : 'none',
                    transition: 'all 0.5s'
                  }}>
                    {idx < step ? '✓' : s.icon}
                  </div>
                  <span style={{ fontSize: '13px', color: idx <= step ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)', fontWeight: idx === step ? 500 : 400 }}>{s.label}</span>
                  {idx === step && (
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#6366f1', animation: `bounce 1s ${i * 0.15}s infinite` }} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RESULTS */}
        {status === 'results' && results && (
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
                  {filteredCandidates.length} Candidates Scouted
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: '13px', margin: 0 }}>
                  Role: <span style={{ color: 'rgba(255,255,255,0.7)' }}>{results.requirements.role}</span>
                  {results.location && results.location !== 'Global' && <> · <span style={{ color: 'rgba(255,255,255,0.7)' }}>{results.location}</span></>}
                  {' '}· Searched <span style={{ color: 'rgba(255,255,255,0.7)' }}>{results.total_searched}</span> profiles
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {results.requirements.languages?.map(l => (
                  <span key={l} style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', fontSize: '12px', padding: '4px 12px', borderRadius: '999px', fontWeight: 600 }}>{l}</span>
                ))}
              </div>
            </div>

            {/* Filter bar */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '12px 18px' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontWeight: 700, letterSpacing: '0.08em' }}>FILTER</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Min Score</span>
                <input type="range" min={0} max={90} step={10} value={filterScore} onChange={e => setFilterScore(Number(e.target.value))} style={{ width: '80px', accentColor: '#6366f1' }} />
                <span style={{ fontSize: '12px', color: '#818cf8', fontWeight: 700, minWidth: '30px' }}>{filterScore > 0 ? `${filterScore}+` : 'Any'}</span>
              </div>
              <select value={filterLang} onChange={e => setFilterLang(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '5px 10px', fontSize: '12px', color: 'white', outline: 'none' }}>
                <option value="">All Languages</option>
                {allLanguages.map(l => <option key={l} value={l} style={{ background: '#0d1117' }}>{l}</option>)}
              </select>
              <select value={filterExp} onChange={e => setFilterExp(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '5px 10px', fontSize: '12px', color: 'white', outline: 'none' }}>
                <option value="any">All Levels</option>
                <option value="junior">Junior</option>
                <option value="mid">Mid</option>
                <option value="senior">Senior</option>
                <option value="principal">Principal</option>
              </select>
              {(filterScore > 0 || filterLang || filterExp !== 'any') && (
                <button onClick={() => { setFilterScore(0); setFilterLang(''); setFilterExp('any'); }}
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#f87171', fontSize: '11px', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Clear Filters
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredCandidates.map((c, idx) => {
                const isExpanded = expandedCard === c.username;
                const overallScore = c.scores?.overall_score || 0;
                return (
                  <div key={c.username} style={{
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.028), rgba(255,255,255,0.018))',
                    border: `1px solid ${idx === 0 ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: '22px', overflow: 'hidden',
                    boxShadow: idx === 0 ? '0 0 50px rgba(99,102,241,0.07)' : 'none'
                  }}>
                    <div style={{ padding: '24px 28px' }}>
                      <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
                        <div style={{ flexShrink: 0, width: '36px', height: '36px', borderRadius: '10px', background: rankGradient(idx), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800 }}>
                          {idx + 1}
                        </div>
                        <img src={c.avatar} alt={c.name} style={{ width: '54px', height: '54px', borderRadius: '14px', border: '2px solid rgba(255,255,255,0.08)', flexShrink: 0, objectFit: 'cover' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '5px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>{c.name}</h3>
                                {c.scores?.seniority_estimate && <SeniorityTag level={c.scores.seniority_estimate} />}
                                {c.scores?.hire_recommendation && <HireTag rec={c.scores.hire_recommendation} />}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                                <a href={c.github_url} target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.32)', fontSize: '13px', textDecoration: 'none' }}>@{c.username}</a>
                                {c.location && <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>📍 {c.location}</span>}
                                {c.company && <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>🏢 {c.company.replace('@', '')}</span>}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: '38px', fontWeight: 800, letterSpacing: '-0.02em', color: overallColor(overallScore), lineHeight: 1 }}>
                                <AnimatedScore target={overallScore} />
                                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.18)', fontWeight: 400 }}>/100</span>
                              </div>
                              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: '2px', letterSpacing: '0.06em' }}>OVERALL</div>
                            </div>
                          </div>

                          {c.bio && <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: '13px', margin: '12px 0 0', lineHeight: 1.65, maxWidth: '700px' }}>{c.bio}</p>}

                          <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {c.topLanguages.slice(0, 4).map(l => (
                              <span key={l} style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', fontSize: '11px', padding: '3px 10px', borderRadius: '6px', fontWeight: 500 }}>{l}</span>
                            ))}
                            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', marginLeft: '4px' }}>
                              {c.followers.toLocaleString()} followers · {c.public_repos} repos · ⭐ {c.totalStars.toLocaleString()} · {c.yearsOnGitHub}yr
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 40px', marginTop: '20px' }}>
                            <ScoreBar score={c.scores?.technical_fit} label="Technical Fit" reasoning={c.scores?.technical_reasoning} />
                            <ScoreBar score={c.scores?.activity_score} label="Activity" reasoning={c.scores?.activity_reasoning} />
                            <ScoreBar score={c.scores?.project_quality} label="Project Quality" reasoning={c.scores?.quality_reasoning} />
                            <ScoreBar score={c.scores?.presence_score} label="Online Presence" reasoning={c.scores?.presence_reasoning} />
                          </div>

                          {c.scores?.verdict && (
                            <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(99,102,241,0.05)', borderRadius: '10px', borderLeft: '3px solid rgba(99,102,241,0.35)' }}>
                              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, fontStyle: 'italic' }}>{c.scores.verdict}</p>
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                            {c.scores?.strengths?.map(s => (
                              <span key={s} style={{ background: 'rgba(16,185,129,0.08)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.14)', fontSize: '11px', padding: '3px 10px', borderRadius: '6px', fontWeight: 500 }}>✓ {s}</span>
                            ))}
                            {c.scores?.concerns?.map(s => (
                              <span key={s} style={{ background: 'rgba(239,68,68,0.07)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.14)', fontSize: '11px', padding: '3px 10px', borderRadius: '6px', fontWeight: 500 }}>⚠ {s}</span>
                            ))}
                          </div>

                          {isExpanded && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '18px' }}>
                              {c.topRepos.map(r => (
                                <a key={r.name} href={r.url} target="_blank" rel="noopener noreferrer"
                                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px', textDecoration: 'none', display: 'block' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{r.name}</span>
                                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)' }}>⭐ {r.stars} · 🍴 {r.forks}</span>
                                  </div>
                                  <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                                    {r.description || 'No description'}
                                  </p>
                                  {r.language && <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.28)' }}>● {r.language}</span>}
                                </a>
                              ))}
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
                            <button onClick={() => setSelected(c)}
                              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: 'white', fontSize: '13px', fontWeight: 600, padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 20px rgba(99,102,241,0.3)', letterSpacing: '-0.01em' }}>
                              ✉ View Outreach Email
                            </button>
                            <a href={c.github_url} target="_blank" rel="noopener noreferrer"
                              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.55)', fontSize: '13px', padding: '10px 18px', borderRadius: '10px', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              GitHub →
                            </a>
                            <button onClick={() => setExpandedCard(isExpanded ? null : c.username)}
                              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)', fontSize: '13px', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                              {isExpanded ? '▲ Less' : '▼ View Repos'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredCandidates.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 24px', color: 'rgba(255,255,255,0.25)' }}>
                <div style={{ fontSize: '36px', marginBottom: '14px' }}>🔍</div>
                <p style={{ fontSize: '15px' }}>No candidates match your filters. Try lowering the minimum score or removing language filters.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Email Modal */}
      {selected && (
        <div onClick={() => { setSelected(null); setCopied(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(16px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '28px', maxWidth: '620px', width: '100%', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 40px 80px rgba(0,0,0,0.7)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src={selected.avatar} alt="" style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>{selected.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>@{selected.username}</div>
                </div>
              </div>
              <button onClick={() => { setSelected(null); setCopied(false); }}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>
                ✕
              </button>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '20px' }}>
              <pre style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.72)', whiteSpace: 'pre-wrap', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: 1.72 }}>{selected.email}</pre>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(selected.email); setCopied(true); }}
              style={{ marginTop: '14px', width: '100%', fontWeight: 700, padding: '13px', borderRadius: '12px', fontSize: '14px', cursor: 'pointer', border: 'none', fontFamily: 'inherit', background: copied ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', transition: 'all 0.3s', boxShadow: copied ? '0 0 24px rgba(16,185,129,0.35)' : '0 0 24px rgba(99,102,241,0.35)', letterSpacing: '-0.01em' }}>
              {copied ? '✓ Copied to Clipboard!' : 'Copy Email'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        * { box-sizing: border-box; margin: 0; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.18) !important; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        select option { background: #0d1117; color: white; }
      `}</style>
    </div>
  );
}