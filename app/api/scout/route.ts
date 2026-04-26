import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function parseJobDescription(jd: string) {
  const res = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: 'You are a technical recruiter AI. Extract structured requirements from job descriptions. Respond ONLY with valid JSON, no markdown.' },
      { role: 'user', content: `Extract requirements from this job description. Return ONLY this JSON:\n{\n  "role": "job title",\n  "skills": ["skill1","skill2"],\n  "languages": ["python","javascript"],\n  "experience_level": "junior|mid|senior",\n  "keywords": ["keyword1","keyword2"],\n  "description": "one sentence summary"\n}\n\nJob Description:\n${jd}` }
    ],
    temperature: 0.1,
  });
  const text = res.choices[0].message.content || '{}';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

async function searchGitHubCandidates(requirements: any, count: number) {
  const languages = requirements.languages?.slice(0, 2) || ['javascript'];
  const queries = [
    `language:${languages[0]} followers:>50`,
    languages[1] ? `language:${languages[1]} followers:>30` : `language:${languages[0]} followers:>20`,
    requirements.keywords?.[0] ? `${requirements.keywords[0]} in:bio followers:>10` : `language:${languages[0]} repos:>10`,
  ];

  const users = new Map();
  for (const query of queries) {
    try {
      const res = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(query)}&sort=followers&per_page=15`, {
        headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'ScoutAI-Agent' }
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const user of data.items || []) {
        if (!users.has(user.login)) users.set(user.login, user);
      }
    } catch {}
    if (users.size >= count * 3) break;
  }
  return Array.from(users.values());
}

async function getCandidateDetails(username: string) {
  try {
    const [profileRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'ScoutAI-Agent' } }),
      fetch(`https://api.github.com/users/${username}/repos?sort=stars&per_page=6`, { headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'ScoutAI-Agent' } })
    ]);
    if (!profileRes.ok) return null;
    const profile = await profileRes.json();
    const repos = reposRes.ok ? await reposRes.json() : [];
    const topRepos = repos.filter((r: any) => !r.fork).slice(0, 4).map((r: any) => ({
      name: r.name, description: r.description || '', stars: r.stargazers_count, language: r.language, topics: r.topics?.slice(0, 3) || []
    }));
    const langCounts: Record<string, number> = {};
    for (const r of repos) { if (r.language) langCounts[r.language] = (langCounts[r.language] || 0) + 1; }
    const topLanguages = Object.entries(langCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l]) => l);
    return {
      username: profile.login, name: profile.name || profile.login, avatar: profile.avatar_url,
      bio: profile.bio || '', location: profile.location || '', company: profile.company || '',
      blog: profile.blog || '', followers: profile.followers, public_repos: profile.public_repos,
      github_url: profile.html_url, created_at: profile.created_at, topRepos, topLanguages,
      email: profile.email || '', hireable: profile.hireable,
    };
  } catch { return null; }
}

async function scoreCandidate(candidate: any, requirements: any) {
  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are an expert technical recruiter AI. Score candidates objectively. Respond ONLY with valid JSON, no markdown.' },
        { role: 'user', content: `Score this GitHub developer for the role of ${requirements.role}.\n\nRequired skills: ${requirements.skills?.join(', ')}\nRequired languages: ${requirements.languages?.join(', ')}\nExperience level: ${requirements.experience_level}\n\nCandidate:\nName: ${candidate.name}\nBio: ${candidate.bio}\nLocation: ${candidate.location}\nLanguages: ${candidate.topLanguages.join(', ')}\nFollowers: ${candidate.followers}\nPublic Repos: ${candidate.public_repos}\nTop Repos: ${candidate.topRepos.map((r: any) => `${r.name}(${r.stars}⭐): ${r.description}`).join(' | ')}\nYears on GitHub: ${new Date().getFullYear() - new Date(candidate.created_at).getFullYear()}\n\nReturn ONLY this JSON:\n{\n  "technical_fit": 0-100,\n  "technical_reasoning": "one sentence",\n  "activity_score": 0-100,\n  "activity_reasoning": "one sentence",\n  "project_quality": 0-100,\n  "quality_reasoning": "one sentence",\n  "presence_score": 0-100,\n  "presence_reasoning": "one sentence",\n  "overall_score": 0-100,\n  "verdict": "2 sentence assessment",\n  "strengths": ["s1","s2","s3"],\n  "concerns": ["c1"]\n}` }
      ],
      temperature: 0.2,
    });
    const text = res.choices[0].message.content || '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    return { technical_fit: 50, activity_score: 50, project_quality: 50, presence_score: 50, overall_score: 50, verdict: 'Scoring unavailable.', strengths: [], concerns: [], technical_reasoning: '', activity_reasoning: '', quality_reasoning: '', presence_reasoning: '' };
  }
}

async function generateEmail(candidate: any, requirements: any, scores: any) {
  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a world-class tech recruiter. Write compelling, highly personalized outreach emails referencing specific candidate work. Never use generic templates. Be genuine and concise.' },
        { role: 'user', content: `Write a personalized recruiter outreach email for ${candidate.name} for the role of ${requirements.role}.\n\nCandidate details:\n- Bio: ${candidate.bio}\n- Top project: ${candidate.topRepos[0]?.name} — ${candidate.topRepos[0]?.description} (${candidate.topRepos[0]?.stars} stars)\n- Other projects: ${candidate.topRepos.slice(1).map((r: any) => r.name).join(', ')}\n- Languages: ${candidate.topLanguages.slice(0, 3).join(', ')}\n- Their strengths for this role: ${scores.strengths?.join(', ')}\n\nRole summary: ${requirements.description}\n\n150-200 words. Mention their actual work. Format:\nSubject: [subject line]\n\n[email body]` }
      ],
      temperature: 0.7,
    });
    return res.choices[0].message.content || '';
  } catch { return `Subject: Exciting opportunity — ${requirements.role}\n\nHi ${candidate.name},\n\nWe came across your GitHub profile and were impressed by your work on ${candidate.topRepos[0]?.name}. We think you'd be a great fit for our ${requirements.role} role.\n\nWould love to connect.\n\nBest regards`; }
}

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, count = 5 } = await req.json();
    if (!jobDescription) return NextResponse.json({ error: 'Job description required' }, { status: 400 });

    const requirements = await parseJobDescription(jobDescription);
    const rawCandidates = await searchGitHubCandidates(requirements, count);

    const detailPromises = rawCandidates.slice(0, count + 5).map(u => getCandidateDetails(u.login));
    const details = (await Promise.all(detailPromises)).filter(Boolean);

    const scoredCandidates = [];
    for (const candidate of details.slice(0, count)) {
      const scores = await scoreCandidate(candidate, requirements);
      const email = await generateEmail(candidate, requirements, scores);
      scoredCandidates.push({ ...candidate, scores, email });
    }

    scoredCandidates.sort((a, b) => (b.scores?.overall_score || 0) - (a.scores?.overall_score || 0));

    return NextResponse.json({ requirements, candidates: scoredCandidates, total_searched: rawCandidates.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}