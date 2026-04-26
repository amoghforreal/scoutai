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
  location: string; company: string; followers: number;
  public_repos: number; github_url: string; topRepos: Repo[];
  topLanguages: string[]; scores: Scores; email: string;
  totalStars: number; yearsOnGitHub: number;
}
interface Results {
  requirements: { role: string; skills: string[]; languages: string[]; description: string };
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

const STARS = Array.from({ length: 70 }, (_, i) => ({
  x: Math.sin(i * 2.4) * 50 + 50,
  y: Math.sin(i * 1.7) * 50 + 50,
  size: (i % 3 === 0) ? 2 : (i % 3 === 1) ? 1.5 : 1,
  delay: (i * 0.3) % 4,
  dur: 2 + (i % 3),
}));

const FIREFLIES = Array.from({ length: 12 }, (_, i) => ({
  x: 10 + (i * 7.3) % 80,
  y: 20 + (i * 6.1) % 70,
  delay: i * 0.6,
  dur: 3 + (i % 4),
}));

const LOCATION_ALIASES: Record<string, string> = {
  'usa': 'United States', 'us': 'United States', 'u.s.a': 'United States', 'u.s': 'United States',
  'america': 'United States', 'united states of america': 'United States',
  'uk': 'United Kingdom', 'u.k': 'United Kingdom', 'britain': 'United Kingdom', 'england': 'United Kingdom',
  'uae': 'United Arab Emirates', 'dubai': 'United Arab Emirates',
  'aus': 'Australia', 'sg': 'Singapore', 'hk': 'Hong Kong',
  'nz': 'New Zealand', 'pak': 'Pakistan', 'deutschland': 'Germany',
};

function AnimatedScore({ target }: { target: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let s = 0; const steps = 40;
    const t = setInterval(() => { s++; setVal(Math.min(Math.round(target / steps * s), target)); if (s >= steps) clearInterval(t); }, 25);
    return () => clearInterval(t);
  }, [target]);
  return <>{val}</>;
}

function ScoreBar({ score, label, reasoning, dark }: { score: number; label: string; reasoning: string; dark: boolean }) {
  const [w, setW] = useState(0);
  useEffect(() => { setTimeout(() => setW(score), 200); }, [score]);
  const color = score >= 80 ? '#4caf7d' : score >= 60 ? '#c49b46' : '#c0504a';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
        <span style={{ color: dark ? 'rgba(210,228,215,0.45)' : 'rgba(40,25,8,0.5)', fontFamily: "'DM Mono', monospace", letterSpacing: '0.04em' }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{score}</span>
      </div>
      <div style={{ height: '3px', background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${w}%`, background: `linear-gradient(90deg, ${color}99, ${color})`, borderRadius: '2px', transition: 'width 1.1s cubic-bezier(0.4,0,0.2,1)', boxShadow: `0 0 6px ${color}55` }} />
      </div>
      {reasoning && <p style={{ color: dark ? 'rgba(210,228,215,0.28)' : 'rgba(40,25,8,0.38)', fontSize: '11px', marginTop: '5px', lineHeight: 1.45, margin: '5px 0 0', fontStyle: 'italic' }}>{reasoning}</p>}
    </div>
  );
}

function HireTag({ rec }: { rec: string }) {
  const c: Record<string, any> = {
    strong_yes: { label: '⚡ Strong Hire', bg: 'rgba(76,175,125,0.15)', color: '#4caf7d', border: 'rgba(76,175,125,0.3)' },
    yes: { label: '✓ Hire', bg: 'rgba(196,155,70,0.15)', color: '#c49b46', border: 'rgba(196,155,70,0.3)' },
    maybe: { label: '◎ Consider', bg: 'rgba(196,155,70,0.1)', color: '#a08030', border: 'rgba(196,155,70,0.2)' },
    no: { label: '✕ Pass', bg: 'rgba(192,80,74,0.12)', color: '#c0504a', border: 'rgba(192,80,74,0.25)' },
  };
  const s = c[rec] || c.maybe;
  return <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontSize: '10px', fontWeight: 700, padding: '2px 9px', borderRadius: '3px', letterSpacing: '0.06em', fontFamily: "'DM Mono', monospace" }}>{s.label}</span>;
}

function SeniorityTag({ level, dark }: { level: string; dark: boolean }) {
  const colors: Record<string, string> = { junior: '#6ba3be', mid: '#b07fc4', senior: '#c49b46', principal: '#e07b3a' };
  const color = colors[level] || colors.mid;
  return <span style={{ color, background: `${color}18`, fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '3px', textTransform: 'uppercase' as any, letterSpacing: '0.08em', fontFamily: "'DM Mono', monospace" }}>{level}</span>;
}

function exportToCSV(candidates: Candidate[], role: string) {
  const headers = ['Rank', 'Name', 'Username', 'Location', 'Overall Score', 'Technical Fit', 'Activity', 'Project Quality', 'Presence', 'Hire Recommendation', 'Seniority', 'Followers', 'Stars', 'Top Language', 'GitHub'];
  const rows = candidates.map((c, i) => [i + 1, c.name, c.username, c.location || '', c.scores?.overall_score, c.scores?.technical_fit, c.scores?.activity_score, c.scores?.project_quality, c.scores?.presence_score, c.scores?.hire_recommendation, c.scores?.seniority_estimate, c.followers, c.totalStars, c.topLanguages[0] || '', c.github_url]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `scoutai-${role.toLowerCase().replace(/\s+/g, '-')}.csv`; a.click();
}

// SVG Tree Component
function PineTrees({ side, dark }: { side: 'left' | 'right'; dark: boolean }) {
  const treeColor = dark ? '#020805' : '#2a4a2a';
  const treeMidColor = dark ? '#040e07' : '#1d3d1d';
  const flip = side === 'right' ? 'scale(-1,1) translate(-180,0)' : '';
  return (
    <svg viewBox="0 0 180 600" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', ...(side === 'left' ? { left: 0 } : { right: 0 }), bottom: 0, height: '80vh', width: 'auto', opacity: dark ? 0.95 : 0.55, pointerEvents: 'none', zIndex: 0 }} preserveAspectRatio="xMinYMax meet">
      <g transform={flip}>
        {/* Far tree */}
        <g transform="translate(0,0)" opacity="0.7">
          <polygon points="30,120 5,220 15,220 2,310 14,310 0,400 60,400 46,310 58,310 45,220 55,220" fill={treeColor}/>
          <rect x="24" y="400" width="12" height="80" fill={treeColor}/>
        </g>
        {/* Near tall tree */}
        <g transform="translate(60,0)">
          <polygon points="35,60 5,180 18,180 2,280 16,280 0,390 70,390 54,280 68,280 52,180 65,180" fill={treeMidColor}/>
          <rect x="27" y="390" width="16" height="80" fill={treeMidColor}/>
        </g>
        {/* Short front tree */}
        <g transform="translate(110,150)" opacity="0.9">
          <polygon points="30,0 4,100 14,100 2,180 58,180 46,100 56,100" fill={treeColor}/>
          <rect x="24" y="180" width="12" height="60" fill={treeColor}/>
        </g>
        {/* Ground */}
        <rect x="0" y="480" width="180" height="120" fill={dark ? '#020805' : '#2a4a2a'} opacity={dark ? 1 : 0.5}/>
      </g>
    </svg>
  );
}

function Moon() {
  return (
    <div style={{ position: 'fixed', top: '80px', right: '180px', zIndex: 0, pointerEvents: 'none' }}>
      <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'radial-gradient(circle at 40% 40%, #fffde0, #f0d080)', boxShadow: '0 0 30px 10px rgba(240,208,100,0.12), 0 0 80px 30px rgba(240,208,100,0.06)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-8px', right: '-12px', width: '65px', height: '65px', borderRadius: '50%', background: '#04090a' }} />
      </div>
    </div>
  );
}

function Sun() {
  return (
    <div style={{ position: 'fixed', top: '40px', right: '200px', zIndex: 0, pointerEvents: 'none' }}>
      <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'radial-gradient(circle, #ffe082, #ffb300)', boxShadow: '0 0 60px 20px rgba(255,179,0,0.18), 0 0 120px 60px rgba(255,179,0,0.08)', opacity: 0.6 }} />
    </div>
  );
}

export default function Home() {
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  const [jd, setJd] = useState('');
  const [location, setLocation] = useState('');
  const [count, setCount] = useState(5);
  const [expLevel, setExpLevel] = useState('any');
  const [status, setStatus] = useState<'idle' | 'loading' | 'results'>('idle');
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterScore, setFilterScore] = useState(0);
  const [filterLang, setFilterLang] = useState('');
  const [filterExp, setFilterExp] = useState('any');

  const locationSuggestion = LOCATION_ALIASES[location.toLowerCase().trim()] || null;
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const bg = dark ? '#050a07' : '#ece6d8';
  const surface = dark ? '#0a1510' : '#f5f0e5';
  const cardBg = dark ? 'linear-gradient(145deg,#0d1a13,#091309)' : 'linear-gradient(145deg,#faf7f0,#f3ede0)';
  const cardBorder = dark ? 'rgba(196,155,70,0.1)' : 'rgba(101,67,20,0.12)';
  const accent = dark ? '#c49b46' : '#6b3f12';
  const accentGlow = dark ? 'rgba(196,155,70,0.18)' : 'rgba(107,63,18,0.12)';
  const forestGreen = dark ? '#3d8b5e' : '#2d6a45';
  const textMain = dark ? '#dde8df' : '#1a0f05';
  const textDim = dark ? 'rgba(221,232,223,0.42)' : 'rgba(26,15,5,0.5)';
  const textFaint = dark ? 'rgba(221,232,223,0.22)' : 'rgba(26,15,5,0.28)';
  const borderFaint = dark ? 'rgba(196,155,70,0.08)' : 'rgba(101,67,20,0.1)';
  const inputBg = dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)';
  const inputBorder = dark ? 'rgba(196,155,70,0.12)' : 'rgba(101,67,20,0.14)';
  const tagBg = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  const handleScout = async () => {
    if (!jd.trim()) return;
    setStatus('loading'); setError(''); setStep(0);
    let s = 0;
    const iv = setInterval(() => { s++; setStep(s); if (s >= STEPS.length - 1) clearInterval(iv); }, 9000);
    try {
      const res = await fetch('/api/scout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobDescription: jd, count, location: location.trim() }) });
      const data = await res.json();
      clearInterval(iv);
      if (!res.ok) throw new Error(data.error);
      setResults(data); setStatus('results');
    } catch (e: any) { clearInterval(iv); setError(e.message || 'Something went wrong'); setStatus('idle'); }
  };

  const allLangs = [...new Set(results?.candidates.flatMap(c => c.topLanguages) || [])].slice(0, 10);
  const filtered = results?.candidates.filter(c => {
    if (filterScore > 0 && (c.scores?.overall_score || 0) < filterScore) return false;
    if (filterLang && !c.topLanguages.includes(filterLang)) return false;
    if (filterExp !== 'any' && c.scores?.seniority_estimate !== filterExp) return false;
    return true;
  }) || [];

  const rankMedal = (i: number) => {
    if (i === 0) return { bg: 'linear-gradient(135deg,#d4a853,#a07830)', shadow: 'rgba(196,155,70,0.35)' };
    if (i === 1) return { bg: 'linear-gradient(135deg,#aab4b0,#7a8884)', shadow: 'rgba(170,180,176,0.2)' };
    if (i === 2) return { bg: 'linear-gradient(135deg,#9c6e44,#6b4a28)', shadow: 'rgba(156,110,68,0.2)' };
    return { bg: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', shadow: 'none' };
  };

  const scoreColor = (n: number) => n >= 80 ? '#4caf7d' : n >= 60 ? '#c49b46' : '#c0504a';

  return (
    <div suppressHydrationWarning style={{ minHeight: '100vh', background: bg, color: textMain, fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'background 0.4s, color 0.3s', overflowX: 'hidden' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,700&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
        @keyframes twinkle { 0%,100%{opacity:0.2} 50%{opacity:1} }
        @keyframes firefly { 0%,100%{transform:translate(0,0);opacity:0} 20%{opacity:0.9} 50%{transform:translate(15px,-20px);opacity:0.4} 75%{transform:translate(-8px,12px);opacity:0.8} }
        @keyframes shoot { 0%{transform:translateX(0) translateY(0);opacity:1} 100%{transform:translateX(-200px) translateY(200px);opacity:0} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes mist { 0%,100%{opacity:0.3;transform:scaleX(1)} 50%{opacity:0.5;transform:scaleX(1.05)} }
        @keyframes flicker { 0%,100%{opacity:0.8;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
        @keyframes bird { 0%{transform:translateX(0)} 100%{transform:translateX(120vw)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        * { box-sizing:border-box; margin:0; }
        input::placeholder,textarea::placeholder { color: ${textFaint} !important; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:${dark ? 'rgba(196,155,70,0.2)' : 'rgba(101,67,20,0.2)'}; border-radius:3px; }
        select option { background:${dark ? '#0d1a13' : '#f5f0e5'}; color:${textMain}; }
        .scout-grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
        .scout-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:14px 40px; }
        .score-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .repo-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        @media(max-width:768px){
          .scout-grid-4 { grid-template-columns:1fr 1fr !important; }
          .scout-grid-2 { grid-template-columns:1fr !important; gap:14px !important; }
          .score-grid-2 { grid-template-columns:1fr !important; }
          .repo-grid { grid-template-columns:1fr !important; }
        }
      `}</style>

      {/* ── BACKGROUND LAYER ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>

        {/* Stars (dark only) */}
        {dark && STARS.map((s, i) => (
          <div key={i} style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y * 0.6}%`, width: `${s.size}px`, height: `${s.size}px`, borderRadius: '50%', background: 'white', animation: `twinkle ${s.dur}s ${s.delay}s infinite ease-in-out` }} />
        ))}

        {/* Fireflies (dark only) */}
        {dark && FIREFLIES.map((f, i) => (
          <div key={i} style={{ position: 'absolute', left: `${f.x}%`, top: `${f.y}%`, width: '4px', height: '4px', borderRadius: '50%', background: '#c8e040', boxShadow: '0 0 6px 2px rgba(200,224,64,0.6)', animation: `firefly ${f.dur}s ${f.delay}s infinite ease-in-out`, opacity: 0 }} />
        ))}

        {/* Moon */}
        {dark && <Moon />}
        {!dark && <Sun />}

        {/* Radial ambient */}
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '800px', height: '400px', background: dark ? `radial-gradient(ellipse, ${accentGlow} 0%, transparent 70%)` : 'radial-gradient(ellipse, rgba(255,200,80,0.08) 0%, transparent 70%)' }} />

        {/* Ground mist */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '120px', background: dark ? 'linear-gradient(to top, rgba(4,14,6,0.8), transparent)' : 'linear-gradient(to top, rgba(200,185,155,0.5), transparent)', animation: 'mist 8s infinite ease-in-out' }} />

        {/* Shooting star (dark only) */}
        {dark && <div style={{ position: 'absolute', top: '12%', right: '25%', width: '80px', height: '1px', background: 'linear-gradient(90deg, white, transparent)', borderRadius: '1px', animation: 'shoot 4s 3s infinite ease-in', opacity: 0, transform: 'rotate(-35deg)' }} />}
        {dark && <div style={{ position: 'absolute', top: '8%', right: '45%', width: '60px', height: '1px', background: 'linear-gradient(90deg, white, transparent)', borderRadius: '1px', animation: 'shoot 4s 8s infinite ease-in', opacity: 0, transform: 'rotate(-35deg)' }} />}

        {/* Campfire glow (dark only) */}
        {dark && !isMobile && <div style={{ position: 'absolute', bottom: '55px', left: '50%', transform: 'translateX(-50%)', zIndex: 1, pointerEvents: 'none' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,120,20,0.35) 0%, transparent 70%)', animation: 'flicker 1.5s infinite ease-in-out', position: 'absolute', top: '-20px', left: '-10px' }} />
          <div style={{ width: '8px', height: '14px', background: 'linear-gradient(to top, #e05010, #ffcc00)', borderRadius: '50% 50% 0 0', animation: 'flicker 0.8s 0.2s infinite', position: 'relative', zIndex: 1, marginLeft: '26px' }} />
          <div style={{ width: '6px', height: '10px', background: 'linear-gradient(to top, #e06010, #ffaa00)', borderRadius: '50% 50% 0 0', animation: 'flicker 0.9s infinite', position: 'absolute', bottom: '0', left: '30px' }} />
          <div style={{ width: '36px', height: '5px', background: dark ? '#020805' : '#2a3a1a', borderRadius: '2px', marginLeft: '12px' }} />
        </div>}

        {/* Owl silhouette (dark only) */}
        {dark && !isMobile && <svg viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', left: '155px', bottom: '42%', width: '28px', opacity: 0.6, pointerEvents: 'none', animation: 'float 4s 1s infinite ease-in-out' }}>
          <ellipse cx="20" cy="28" rx="12" ry="16" fill="#020805"/>
          <ellipse cx="20" cy="10" rx="10" ry="10" fill="#020805"/>
          <polygon points="12,4 16,0 20,6" fill="#020805"/>
          <polygon points="28,4 24,0 20,6" fill="#020805"/>
          <circle cx="16" cy="10" r="4" fill="rgba(255,220,80,0.6)"/>
          <circle cx="24" cy="10" r="4" fill="rgba(255,220,80,0.6)"/>
          <circle cx="16" cy="10" r="2" fill="#020805"/>
          <circle cx="24" cy="10" r="2" fill="#020805"/>
        </svg>}

        {/* Birds (light only) */}
        {!dark && <svg viewBox="0 0 100 30" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', top: '15%', left: '-120px', width: '80px', opacity: 0.35, animation: 'bird 18s 2s infinite linear', pointerEvents: 'none' }}>
          <path d="M10,15 Q15,8 20,15" stroke="#2a4a2a" strokeWidth="1.5" fill="none"/>
          <path d="M25,12 Q30,5 35,12" stroke="#2a4a2a" strokeWidth="1.5" fill="none"/>
          <path d="M45,17 Q50,10 55,17" stroke="#2a4a2a" strokeWidth="1.5" fill="none"/>
        </svg>}
        {!dark && <svg viewBox="0 0 100 30" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', top: '20%', left: '-120px', width: '50px', opacity: 0.25, animation: 'bird 25s 8s infinite linear', pointerEvents: 'none' }}>
          <path d="M10,15 Q15,8 20,15" stroke="#2a4a2a" strokeWidth="1.5" fill="none"/>
          <path d="M28,12 Q33,5 38,12" stroke="#2a4a2a" strokeWidth="1.5" fill="none"/>
        </svg>}

        {/* Trees */}
        {!isMobile && <PineTrees side="left" dark={dark} />}
        {!isMobile && <PineTrees side="right" dark={dark} />}

        {/* Jeep silhouette */}
        <svg viewBox="0 0 220 80" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', width: '180px', opacity: dark ? 0.12 : 0.08, pointerEvents: 'none' }}>
          <rect x="20" y="30" width="180" height="32" rx="4" fill="currentColor"/>
          <polygon points="50,30 70,8 150,8 170,30" fill="currentColor"/>
          <rect x="60" y="10" width="25" height="18" rx="1" fill={dark ? bg : '#ece6d8'} opacity="0.6"/>
          <rect x="115" y="10" width="35" height="18" rx="1" fill={dark ? bg : '#ece6d8'} opacity="0.6"/>
          <circle cx="60" cy="62" r="16" fill="currentColor"/>
          <circle cx="60" cy="62" r="9" fill={dark ? bg : '#ece6d8'} opacity="0.5"/>
          <circle cx="160" cy="62" r="16" fill="currentColor"/>
          <circle cx="160" cy="62" r="9" fill={dark ? bg : '#ece6d8'} opacity="0.5"/>
          <rect x="0" y="42" width="20" height="12" rx="2" fill="currentColor"/>
          <rect x="200" y="38" width="20" height="8" rx="1" fill="currentColor"/>
          <rect x="10" y="28" width="210" height="4" fill="currentColor" opacity="0.5"/>
        </svg>
      </div>

      {/* ── HEADER ── */}
      <header style={{ borderBottom: `1px solid ${borderFaint}`, position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: dark ? 'rgba(5,10,7,0.92)' : 'rgba(236,230,216,0.92)', backdropFilter: 'blur(20px)', transition: 'background 0.4s' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 28px', height: '62px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '34px', height: '34px', background: `linear-gradient(135deg, ${accent}, ${dark ? '#8b6820' : '#4a2a0a'})`, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 800, boxShadow: `0 0 18px ${accentGlow}`, fontFamily: "'Playfair Display', serif", color: dark ? '#050a07' : 'white' }}>S</div>
            <span style={{ fontWeight: 700, fontSize: '17px', letterSpacing: '-0.02em', fontFamily: "'Playfair Display', serif" }}>ScoutAI</span>
            <span style={{ fontSize: '10px', color: textFaint, border: `1px solid ${borderFaint}`, borderRadius: '3px', padding: '2px 8px', letterSpacing: '0.1em', fontFamily: "'DM Mono', monospace" }}>THE HUNT</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {status === 'results' && results && (
              <>
                <button onClick={() => exportToCSV(filtered, results.requirements.role)}
                  style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: textDim, fontSize: '12px', padding: '7px 14px', borderRadius: '6px', cursor: 'pointer', fontFamily: "'DM Mono', monospace", letterSpacing: '0.04em' }}>
                  ↓ Export CSV
                </button>
                <button onClick={() => { setStatus('idle'); setResults(null); setFilterScore(0); setFilterLang(''); setFilterExp('any'); }}
                  style={{ background: 'transparent', border: 'none', color: textFaint, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  ← New Hunt
                </button>
              </>
            )}
            {/* Theme toggle — prominent */}
            <button onClick={() => setDark(!dark)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: dark ? 'rgba(196,155,70,0.12)' : 'rgba(101,67,20,0.1)', border: `1px solid ${dark ? 'rgba(196,155,70,0.3)' : 'rgba(101,67,20,0.25)'}`, borderRadius: '3px', padding: isMobile ? '7px 10px' : '7px 16px', cursor: 'pointer', transition: 'all 0.3s', boxShadow: `0 0 14px ${accentGlow}` }}>
              <span style={{ fontSize: '15px', lineHeight: 1 }}>{dark ? '🌙' : '☀️'}</span>
              {!isMobile && <span style={{ fontSize: '12px', fontWeight: 700, color: accent, fontFamily: "'DM Mono', monospace", letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{dark ? 'Dark Mode' : 'Light Mode'}</span>}
              <span style={{ width: '28px', height: '16px', borderRadius: '8px', background: dark ? 'rgba(196,155,70,0.25)' : 'rgba(101,67,20,0.2)', position: 'relative', display: 'inline-block', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: '2px', left: dark ? '2px' : '14px', width: '12px', height: '12px', borderRadius: '50%', background: accent, transition: 'left 0.3s', display: 'block' }} />
              </span>
            </button>
          </div>
        </div>
      </header>

      <div style={{ position: 'relative', zIndex: 1, paddingTop: '62px' }}>

        {/* ── IDLE ── */}
        {status === 'idle' && (
          <div style={{ maxWidth: '680px', margin: '0 auto', padding: isMobile ? '40px 16px 60px' : '90px 28px 80px' }}>
            <div style={{ textAlign: 'center', marginBottom: '52px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: dark ? 'rgba(196,155,70,0.1)' : 'rgba(101,67,20,0.08)', border: `1px solid ${dark ? 'rgba(196,155,70,0.22)' : 'rgba(101,67,20,0.18)'}`, borderRadius: '2px', padding: '6px 18px', marginBottom: '30px' }}>
                <span style={{ fontSize: '12px', color: accent, fontWeight: 600, letterSpacing: '0.1em', fontFamily: "'DM Mono', monospace" }}>
                  {dark ? '🌲 NIGHT HUNT ACTIVE' : '🌿 DAY SCOUT ACTIVE'}
                </span>
              </div>
              <h1 style={{ fontSize: '58px', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em', margin: '0 0 20px', fontFamily: "'Playfair Display', serif" }}>
                Track your next<br />
                <em style={{ color: accent, fontStyle: 'italic' }}>10x engineer</em>
              </h1>
              <p style={{ color: textDim, fontSize: '16px', lineHeight: 1.7, margin: 0 }}>
                Paste a job description. The agent scouts GitHub,<br />
                scores candidates across 4 dimensions, and drafts outreach.
              </p>
            </div>

            <div style={{ background: dark ? 'rgba(13,26,19,0.7)' : 'rgba(250,247,240,0.8)', border: `1px solid ${cardBorder}`, borderRadius: '4px', padding: '30px', backdropFilter: 'blur(16px)', boxShadow: dark ? `0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px ${borderFaint}` : '0 20px 60px rgba(0,0,0,0.08)' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: textFaint, letterSpacing: '0.12em', marginBottom: '10px', fontFamily: "'DM Mono', monospace" }}>JOB DESCRIPTION</label>
              <textarea
                value={jd} onChange={e => setJd(e.target.value)}
                placeholder="We are looking for a Senior Backend Engineer with 5+ years of experience in Python and FastAPI. The ideal candidate has built distributed systems, worked with PostgreSQL and Redis, and contributed to open-source projects..."
                style={{ width: '100%', background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: '3px', padding: '16px', fontSize: '14px', color: textMain, resize: 'none', height: '155px', outline: 'none', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = `${accent}55`}
                onBlur={e => e.target.style.borderColor = inputBorder}
              />

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: textFaint, letterSpacing: '0.1em', marginBottom: '8px', fontFamily: "'DM Mono', monospace" }}>REGION / LOCATION</label>
                  <input value={location} onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. United States, India, Berlin"
                    style={{ width: '100%', background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: '3px', padding: '10px 14px', fontSize: '13px', color: textMain, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  {locationSuggestion && locationSuggestion !== location && (
                    <div style={{ marginTop: '7px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: textFaint, fontFamily: "'DM Mono', monospace" }}>Did you mean:</span>
                      <button onClick={() => setLocation(locationSuggestion)}
                        style={{ background: `${accentGlow}`, border: `1px solid ${dark ? 'rgba(196,155,70,0.3)' : 'rgba(101,67,20,0.25)'}`, color: accent, fontSize: '11px', fontWeight: 700, padding: '3px 11px', borderRadius: '3px', cursor: 'pointer', fontFamily: "'DM Mono', monospace" }}>
                        {locationSuggestion}
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: textFaint, letterSpacing: '0.1em', marginBottom: '8px', fontFamily: "'DM Mono', monospace" }}>EXPERIENCE LEVEL</label>
                  <select value={expLevel} onChange={e => setExpLevel(e.target.value)}
                    style={{ width: '100%', background: dark ? '#0a1510' : '#f5f0e5', border: `1px solid ${inputBorder}`, borderRadius: '3px', padding: '10px 14px', fontSize: '13px', color: textMain, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                    <option value="any">Any Level</option>
                    <option value="junior">Junior</option>
                    <option value="mid">Mid-Level</option>
                    <option value="senior">Senior</option>
                    <option value="principal">Principal</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', color: textFaint }}>Scout</span>
                  <select value={count} onChange={e => setCount(Number(e.target.value))}
                    style={{ background: dark ? '#0a1510' : '#f5f0e5', border: `1px solid ${inputBorder}`, borderRadius: '3px', padding: '7px 12px', fontSize: '13px', color: textMain, outline: 'none' }}>
                    {[3, 5, 7, 10].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span style={{ fontSize: '13px', color: textFaint }}>candidates</span>
                </div>
                <button onClick={handleScout} disabled={!jd.trim()}
                  style={{ background: jd.trim() ? `linear-gradient(135deg, ${accent}, ${dark ? '#8b6820' : '#4a2a0a'})` : inputBg, border: 'none', color: jd.trim() ? (dark ? '#050a07' : 'white') : textFaint, fontWeight: 700, padding: '11px 28px', borderRadius: '3px', cursor: jd.trim() ? 'pointer' : 'not-allowed', fontSize: '14px', boxShadow: jd.trim() ? `0 0 24px ${accentGlow}` : 'none', transition: 'all 0.2s', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.02em' }}>
                  Begin the Hunt →
                </button>
              </div>
              {error && <p style={{ marginTop: '12px', color: '#c0504a', fontSize: '13px' }}>{error}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '10px', marginTop: '22px' }}>
              {[
                { num: '01', icon: '🧠', title: 'Parse JD', desc: 'AI extracts skills and requirements' },
                { num: '02', icon: '🔍', title: 'Scout GitHub', desc: 'Finds real individual developers' },
                { num: '03', icon: '⚡', title: 'Score & Rank', desc: '4-dimension AI scoring engine' },
                { num: '04', icon: '✉️', title: 'Draft Outreach', desc: 'Personalized email per candidate' },
              ].map(item => (
                <div key={item.num} style={{ background: dark ? 'rgba(13,26,19,0.5)' : 'rgba(250,247,240,0.6)', border: `1px solid ${borderFaint}`, borderRadius: '3px', padding: '16px', backdropFilter: 'blur(8px)' }}>
                  <div style={{ fontSize: '18px', marginBottom: '10px' }}>{item.icon}</div>
                  <div style={{ fontSize: '10px', color: accent, fontWeight: 700, letterSpacing: '0.1em', marginBottom: '5px', fontFamily: "'DM Mono', monospace" }}>{item.num}</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '5px', fontFamily: "'Playfair Display', serif" }}>{item.title}</div>
                  <div style={{ fontSize: '11px', color: textFaint, lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LOADING ── */}
        {status === 'loading' && (
          <div style={{ maxWidth: '440px', margin: '0 auto', padding: '100px 28px', textAlign: 'center' }}>
            <div style={{ width: '50px', height: '50px', border: `2px solid ${accentGlow}`, borderTopColor: accent, borderRadius: '50%', margin: '0 auto 32px', animation: 'spin 0.9s linear infinite' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', fontFamily: "'Playfair Display', serif" }}>The Hunt is On</h2>
            <p style={{ color: textFaint, fontSize: '14px', marginBottom: '40px' }}>
              Scouting {location || 'the globe'} for {count} candidates. Takes 30-60 seconds.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
              {STEPS.map((s, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 16px', borderRadius: '3px',
                  border: `1px solid ${idx < step ? `${forestGreen}33` : idx === step ? `${accent}33` : borderFaint}`,
                  background: idx < step ? `${forestGreen}0a` : idx === step ? `${accentGlow}` : 'transparent',
                  opacity: idx > step ? 0.3 : 1, transition: 'all 0.5s'
                }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0, background: idx < step ? forestGreen : idx === step ? accent : inputBg, color: idx < step ? 'white' : idx === step ? (dark ? '#050a07' : 'white') : textFaint, boxShadow: idx === step ? `0 0 14px ${accentGlow}` : 'none', transition: 'all 0.5s' }}>
                    {idx < step ? '✓' : s.icon}
                  </div>
                  <span style={{ fontSize: '13px', color: idx <= step ? textMain : textFaint }}>{s.label}</span>
                  {idx === step && <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                    {[0, 1, 2].map(i => <div key={i} style={{ width: '4px', height: '4px', borderRadius: '50%', background: accent, animation: `bounce 0.9s ${i * 0.15}s infinite` }} />)}
                  </div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {status === 'results' && results && (
          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '20px 12px 60px' : '36px 28px 80px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em', fontFamily: "'Playfair Display', serif", marginBottom: '6px' }}>
                  {filtered.length} Candidates Found
                </h2>
                <p style={{ color: textFaint, fontSize: '13px', fontFamily: "'DM Mono', monospace" }}>
                  {results.requirements.role} {results.location && results.location !== 'Global' ? `· ${results.location}` : ''} · {results.total_searched} profiles searched
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {results.requirements.languages?.map(l => (
                  <span key={l} style={{ background: `${accentGlow}`, color: accent, border: `1px solid ${dark ? 'rgba(196,155,70,0.22)' : 'rgba(101,67,20,0.2)'}`, fontSize: '11px', padding: '4px 12px', borderRadius: '2px', fontWeight: 700, fontFamily: "'DM Mono', monospace", letterSpacing: '0.05em' }}>{l}</span>
                ))}
              </div>
            </div>

            {/* Filter bar */}
            <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap', background: dark ? 'rgba(13,26,19,0.5)' : 'rgba(250,247,240,0.6)', border: `1px solid ${borderFaint}`, borderRadius: '3px', padding: '12px 18px', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: '10px', color: textFaint, fontWeight: 700, letterSpacing: '0.1em', fontFamily: "'DM Mono', monospace" }}>FILTER</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: textDim }}>Min Score</span>
                <input type="range" min={0} max={90} step={10} value={filterScore} onChange={e => setFilterScore(Number(e.target.value))} style={{ width: '80px', accentColor: accent }} />
                <span style={{ fontSize: '11px', color: accent, fontWeight: 700, fontFamily: "'DM Mono', monospace", minWidth: '30px' }}>{filterScore > 0 ? `${filterScore}+` : 'Any'}</span>
              </div>
              <select value={filterLang} onChange={e => setFilterLang(e.target.value)} style={{ background: dark ? '#0a1510' : '#f5f0e5', border: `1px solid ${inputBorder}`, borderRadius: '3px', padding: '5px 10px', fontSize: '12px', color: textMain, outline: 'none' }}>
                <option value="">All Languages</option>
                {allLangs.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <select value={filterExp} onChange={e => setFilterExp(e.target.value)} style={{ background: dark ? '#0a1510' : '#f5f0e5', border: `1px solid ${inputBorder}`, borderRadius: '3px', padding: '5px 10px', fontSize: '12px', color: textMain, outline: 'none' }}>
                <option value="any">All Levels</option>
                <option value="junior">Junior</option>
                <option value="mid">Mid</option>
                <option value="senior">Senior</option>
                <option value="principal">Principal</option>
              </select>
              {(filterScore > 0 || filterLang || filterExp !== 'any') && (
                <button onClick={() => { setFilterScore(0); setFilterLang(''); setFilterExp('any'); }} style={{ background: 'rgba(192,80,74,0.08)', border: '1px solid rgba(192,80,74,0.2)', color: '#c0504a', fontSize: '11px', padding: '4px 10px', borderRadius: '3px', cursor: 'pointer', fontFamily: "'DM Mono', monospace" }}>Clear</button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filtered.map((c, idx) => {
                const isExp = expanded === c.username;
                const score = c.scores?.overall_score || 0;
                const medal = rankMedal(idx);
                return (
                  <div key={c.username} style={{ background: cardBg, border: `1px solid ${idx === 0 ? dark ? 'rgba(196,155,70,0.25)' : 'rgba(101,67,20,0.2)' : cardBorder}`, borderRadius: '4px', overflow: 'hidden', boxShadow: idx === 0 ? `0 0 40px ${accentGlow}, 0 4px 20px rgba(0,0,0,0.2)` : '0 4px 20px rgba(0,0,0,0.12)', transition: 'box-shadow 0.3s' }}>
                    {/* Top accent line for #1 */}
                    {idx === 0 && <div style={{ height: '2px', background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />}
                    <div style={{ padding: isMobile ? '16px 14px' : '24px 28px' }}>
                      <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
                        {/* Rank */}
                        <div style={{ flexShrink: 0, width: '38px', height: '38px', borderRadius: '3px', background: medal.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, boxShadow: medal.shadow !== 'none' ? `0 4px 12px ${medal.shadow}` : 'none', fontFamily: "'Playfair Display', serif", color: idx < 3 ? 'white' : textDim }}>
                          {idx + 1}
                        </div>
                        {/* Avatar */}
                        <img src={c.avatar} alt={c.name} style={{ width: '52px', height: '52px', borderRadius: '3px', border: `1px solid ${borderFaint}`, flexShrink: 0, objectFit: 'cover' }} />
                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '5px' }}>
                                <h3 style={{ fontSize: '19px', fontWeight: 700, letterSpacing: '-0.01em', fontFamily: "'Playfair Display', serif" }}>{c.name}</h3>
                                {c.scores?.seniority_estimate && <SeniorityTag level={c.scores.seniority_estimate} dark={dark} />}
                                {c.scores?.hire_recommendation && <HireTag rec={c.scores.hire_recommendation} />}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                                <a href={c.github_url} target="_blank" rel="noopener noreferrer" style={{ color: textFaint, fontSize: '13px', textDecoration: 'none', fontFamily: "'DM Mono', monospace" }}>@{c.username}</a>
                                {c.location && <span style={{ color: textFaint, fontSize: '12px' }}>📍 {c.location}</span>}
                                {c.company && <span style={{ color: textFaint, fontSize: '12px' }}>🏢 {c.company.replace('@', '')}</span>}
                              </div>
                            </div>
                            {/* Score */}
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: '40px', fontWeight: 800, color: scoreColor(score), lineHeight: 1, fontFamily: "'Playfair Display', serif" }}>
                                <AnimatedScore target={score} />
                                <span style={{ fontSize: '14px', color: textFaint, fontWeight: 400, fontFamily: "'DM Mono', monospace" }}>/100</span>
                              </div>
                              <div style={{ fontSize: '10px', color: textFaint, marginTop: '2px', letterSpacing: '0.1em', fontFamily: "'DM Mono', monospace" }}>MATCH SCORE</div>
                            </div>
                          </div>

                          {c.bio && <p style={{ color: textDim, fontSize: '13px', marginTop: '12px', lineHeight: 1.7, maxWidth: '680px', fontStyle: 'italic' }}>{c.bio}</p>}

                          {/* Stats */}
                          <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {c.topLanguages.slice(0, 4).map(l => (
                              <span key={l} style={{ background: tagBg, color: textDim, fontSize: '11px', padding: '3px 9px', borderRadius: '2px', fontWeight: 500, fontFamily: "'DM Mono', monospace", border: `1px solid ${borderFaint}` }}>{l}</span>
                            ))}
                            <span style={{ color: textFaint, fontSize: '12px', fontFamily: "'DM Mono', monospace" }}>
                              {c.followers.toLocaleString()} followers · {c.public_repos} repos · ⭐{c.totalStars.toLocaleString()} · {c.yearsOnGitHub}yr
                            </span>
                          </div>

                          {/* Score bars */}
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '14px' : '14px 40px', marginTop: '20px' }}>
                            <ScoreBar score={c.scores?.technical_fit} label="Technical Fit" reasoning={c.scores?.technical_reasoning} dark={dark} />
                            <ScoreBar score={c.scores?.activity_score} label="Activity" reasoning={c.scores?.activity_reasoning} dark={dark} />
                            <ScoreBar score={c.scores?.project_quality} label="Project Quality" reasoning={c.scores?.quality_reasoning} dark={dark} />
                            <ScoreBar score={c.scores?.presence_score} label="Online Presence" reasoning={c.scores?.presence_reasoning} dark={dark} />
                          </div>

                          {/* Verdict */}
                          {c.scores?.verdict && (
                            <div style={{ marginTop: '16px', padding: '12px 16px', background: dark ? 'rgba(196,155,70,0.05)' : 'rgba(101,67,20,0.04)', borderRadius: '3px', borderLeft: `3px solid ${accent}44` }}>
                              <p style={{ margin: 0, fontSize: '13px', color: textDim, lineHeight: 1.7, fontStyle: 'italic', fontFamily: "'Playfair Display', serif" }}>{c.scores.verdict}</p>
                            </div>
                          )}

                          {/* Tags */}
                          <div style={{ display: 'flex', gap: '7px', marginTop: '14px', flexWrap: 'wrap' }}>
                            {c.scores?.strengths?.map(s => (
                              <span key={s} style={{ background: `${forestGreen}12`, color: dark ? '#6ec49a' : '#1e5c38', border: `1px solid ${forestGreen}25`, fontSize: '11px', padding: '3px 10px', borderRadius: '2px', fontFamily: "'DM Mono', monospace" }}>✓ {s}</span>
                            ))}
                            {c.scores?.concerns?.map(s => (
                              <span key={s} style={{ background: 'rgba(192,80,74,0.08)', color: dark ? '#e07a76' : '#a03030', border: '1px solid rgba(192,80,74,0.2)', fontSize: '11px', padding: '3px 10px', borderRadius: '2px', fontFamily: "'DM Mono', monospace" }}>⚠ {s}</span>
                            ))}
                          </div>

                          {/* Expanded repos */}
                          {isExp && (
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginTop: '18px' }}>
                              {c.topRepos.map(r => (
                                <a key={r.name} href={r.url} target="_blank" rel="noopener noreferrer"
                                  style={{ background: inputBg, border: `1px solid ${borderFaint}`, borderRadius: '3px', padding: '14px', textDecoration: 'none', display: 'block' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: textMain, fontFamily: "'Playfair Display', serif" }}>{r.name}</span>
                                    <span style={{ fontSize: '11px', color: textFaint, fontFamily: "'DM Mono', monospace" }}>⭐{r.stars} · 🍴{r.forks}</span>
                                  </div>
                                  <p style={{ margin: 0, fontSize: '12px', color: textFaint, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{r.description || 'No description'}</p>
                                  {r.language && <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '11px', color: accent, fontFamily: "'DM Mono', monospace" }}>● {r.language}</span>}
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
                            <button onClick={() => setSelected(c)}
                              style={{ background: `linear-gradient(135deg, ${accent}, ${dark ? '#8b6820' : '#4a2a0a'})`, border: 'none', color: dark ? '#050a07' : 'white', fontSize: '13px', fontWeight: 700, padding: '10px 20px', borderRadius: '3px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: `0 0 18px ${accentGlow}`, letterSpacing: '0.01em' }}>
                              ✉ View Outreach Email
                            </button>
                            <a href={c.github_url} target="_blank" rel="noopener noreferrer"
                              style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: textDim, fontSize: '13px', padding: '10px 18px', borderRadius: '3px', textDecoration: 'none', fontWeight: 500 }}>
                              GitHub →
                            </a>
                            <button onClick={() => setExpanded(isExp ? null : c.username)}
                              style={{ background: inputBg, border: `1px solid ${borderFaint}`, color: textFaint, fontSize: '13px', padding: '10px 16px', borderRadius: '3px', cursor: 'pointer', fontFamily: 'inherit' }}>
                              {isExp ? '▲ Less' : '▼ Repos'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px', color: textFaint }}>
                <div style={{ fontSize: '40px', marginBottom: '14px' }}>🌲</div>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px' }}>No candidates match your current filters.</p>
                <p style={{ fontSize: '13px', marginTop: '8px' }}>Try lowering the minimum score or removing language filters.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── EMAIL MODAL ── */}
      {selected && (
        <div onClick={() => { setSelected(null); setCopied(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: dark ? '#0a1510' : '#f5f0e5', border: `1px solid ${cardBorder}`, borderRadius: '4px', padding: '28px', maxWidth: '620px', width: '100%', maxHeight: '85vh', overflow: 'auto', boxShadow: `0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px ${borderFaint}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src={selected.avatar} alt="" style={{ width: '42px', height: '42px', borderRadius: '3px', objectFit: 'cover', border: `1px solid ${borderFaint}` }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', fontFamily: "'Playfair Display', serif" }}>{selected.name}</div>
                  <div style={{ color: textFaint, fontSize: '12px', fontFamily: "'DM Mono', monospace" }}>@{selected.username}</div>
                </div>
              </div>
              <button onClick={() => { setSelected(null); setCopied(false); }}
                style={{ background: inputBg, border: `1px solid ${borderFaint}`, color: textFaint, width: '32px', height: '32px', borderRadius: '3px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>✕</button>
            </div>
            <div style={{ background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: '3px', padding: '20px' }}>
              <pre style={{ margin: 0, fontSize: '13px', color: textDim, whiteSpace: 'pre-wrap', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.75 }}>{selected.email}</pre>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(selected.email); setCopied(true); }}
              style={{ marginTop: '14px', width: '100%', fontWeight: 700, padding: '13px', borderRadius: '3px', fontSize: '14px', cursor: 'pointer', border: 'none', fontFamily: "'DM Sans', sans-serif", background: copied ? `linear-gradient(135deg, ${forestGreen}, #1e5c38)` : `linear-gradient(135deg, ${accent}, ${dark ? '#8b6820' : '#4a2a0a'})`, color: copied ? 'white' : (dark ? '#050a07' : 'white'), transition: 'all 0.3s', boxShadow: `0 0 24px ${copied ? `${forestGreen}44` : accentGlow}` }}>
              {copied ? '✓ Copied to Clipboard!' : 'Copy Email'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}