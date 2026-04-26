import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function parseJobDescription(jd: string) {
  const res = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: 'You are a technical recruiter AI. Extract structured requirements from job descriptions. Respond ONLY with valid JSON, no markdown, no explanation.' },
      { role: 'user', content: `Extract from this job description and return ONLY this JSON:\n{\n  "role": "exact job title",\n  "skills": ["skill1","skill2","skill3","skill4","skill5"],\n  "languages": ["lang1","lang2"],\n  "experience_level": "junior|mid|senior",\n  "keywords": ["keyword1","keyword2","keyword3"],\n  "description": "one sentence summary of the role"\n}\n\nJob Description:\n${jd}` }
    ],
    temperature: 0.1,
  });
  const text = res.choices[0].message.content || '{}';
  try { return JSON.parse(text.replace(/```json|```/g, '').trim()); }
  catch { return { role: 'Software Engineer', skills: [], languages: ['javascript'], experience_level: 'mid', keywords: [], description: jd.slice(0, 100) }; }
}

async function searchGitHubCandidates(requirements: any, count: number, location?: string) {
  const languages = requirements.languages?.slice(0, 2) || ['javascript'];
  const locationQuery = location ? ` location:"${location}"` : '';
  
  const queries = [
    `type:user language:${languages[0]} followers:>100${locationQuery}`,
    `type:user language:${languages[0]} repos:>20 followers:>30${locationQuery}`,
    languages[1] ? `type:user language:${languages[1]} followers:>50${locationQuery}` : `type:user language:${languages[0]} followers:>20${locationQuery}`,
    requirements.keywords?.[0] ? `type:user ${requirements.keywords[0]} in:bio followers:>20${locationQuery}` : `type:user language:${languages[0]} repos:>15${locationQuery}`,
  ];

  const users = new Map();
  for (const query of queries) {
    try {
      const res = await fetch(
        `https://api.github.com/search/users?q=${encodeURIComponent(query)}&sort=followers&per_page=20`,
        { headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'ScoutAI-Agent' } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const user of data.items || []) {
        if (!users.has(user.login)) users.set(user.login, user);
      }
    } catch {}
    if (users.size >= count * 4) break;
  }
  return Array.from(users.values());
}

async function getCandidateDetails(username: string) {
  try {
    const [profileRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, {
        headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'ScoutAI-Agent' }
      }),
      fetch(`https://api.github.com/users/${username}/repos?sort=stars&per_page=8`, {
        headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'ScoutAI-Agent' }
      })
    ]);
    if (!profileRes.ok) return null;
    const profile = await profileRes.json();
    
    // Filter out organizations
    if (profile.type === 'Organization') return null;
    
    const repos = reposRes.ok ? await reposRes.json() : [];
    const ownRepos = repos.filter((r: any) => !r.fork);
    const topRepos = ownRepos.slice(0, 4).map((r: any) => ({
      name: r.name,
      description: r.description || '',
      stars: r.stargazers_count,
      forks: r.forks_count,
      language: r.language,
      topics: r.topics?.slice(0, 3) || [],
      url: r.html_url,
    }));

    const langCounts: Record<string, number> = {};
    for (const r of repos) { if (r.language) langCounts[r.language] = (langCounts[r.language] || 0) + 1; }
    const topLanguages = Object.entries(langCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([l]) => l);
    
    const totalStars = ownRepos.reduce((sum: number, r: any) => sum + r.stargazers_count, 0);
    const yearsOnGitHub = new Date().getFullYear() - new Date(profile.created_at).getFullYear();

    return {
      username: profile.login,
      name: profile.name || profile.login,
      avatar: profile.avatar_url,
      bio: profile.bio || '',
      location: profile.location || '',
      company: profile.company || '',
      blog: profile.blog || '',
      followers: profile.followers,
      following: profile.following,
      public_repos: profile.public_repos,
      github_url: profile.html_url,
      created_at: profile.created_at,
      topRepos,
      topLanguages,
      email: profile.email || '',
      hireable: profile.hireable,
      totalStars,
      yearsOnGitHub,
      type: profile.type,
    };
  } catch { return null; }
}

async function scoreCandidate(candidate: any, requirements: any) {
  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are an expert technical recruiter. Score candidates objectively and critically. Do not give high scores unless clearly justified. Respond ONLY with valid JSON.' },
        { role: 'user', content: `Score this GitHub developer for: ${requirements.role}\n\nRequired skills: ${requirements.skills?.join(', ')}\nRequired languages: ${requirements.languages?.join(', ')}\nExperience level needed: ${requirements.experience_level}\n\nCandidate Profile:\nName: ${candidate.name}\nBio: ${candidate.bio}\nLocation: ${candidate.location}\nLanguages used: ${candidate.topLanguages.join(', ')}\nFollowers: ${candidate.followers}\nPublic Repos: ${candidate.public_repos}\nTotal Stars: ${candidate.totalStars}\nYears on GitHub: ${candidate.yearsOnGitHub}\nTop Projects: ${candidate.topRepos.map((r: any) => `${r.name}(${r.stars}⭐, ${r.forks} forks): ${r.description}`).join(' | ')}\n\nReturn ONLY this JSON:\n{\n  "technical_fit": 0-100,\n  "technical_reasoning": "one specific sentence citing their actual repos/languages",\n  "activity_score": 0-100,\n  "activity_reasoning": "one sentence about their GitHub activity patterns",\n  "project_quality": 0-100,\n  "quality_reasoning": "one sentence about their best projects specifically",\n  "presence_score": 0-100,\n  "presence_reasoning": "one sentence about their community presence",\n  "overall_score": 0-100,\n  "verdict": "2 sentence honest assessment for a recruiter",\n  "strengths": ["specific strength 1","specific strength 2","specific strength 3"],\n  "concerns": ["specific concern 1"],\n  "seniority_estimate": "junior|mid|senior|principal",\n  "hire_recommendation": "strong_yes|yes|maybe|no"\n}` }
      ],
      temperature: 0.2,
    });
    const text = res.choices[0].message.content || '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    return {
      technical_fit: 50, activity_score: 50, project_quality: 50, presence_score: 50,
      overall_score: 50, verdict: 'Scoring unavailable.', strengths: [], concerns: [],
      technical_reasoning: '', activity_reasoning: '', quality_reasoning: '', presence_reasoning: '',
      seniority_estimate: 'mid', hire_recommendation: 'maybe'
    };
  }
}

async function generateEmail(candidate: any, requirements: any, scores: any) {
  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a world-class tech recruiter. Write compelling, highly personalized outreach emails. Reference the candidate\'s actual work specifically. Be genuine, concise, and human. Never use generic templates.' },
        { role: 'user', content: `Write a personalized recruiter outreach email to ${candidate.name} for the role of ${requirements.role}.\n\nAbout the candidate:\n- Bio: ${candidate.bio}\n- Best project: "${candidate.topRepos[0]?.name}" — ${candidate.topRepos[0]?.description} (${candidate.topRepos[0]?.stars} stars, ${candidate.topRepos[0]?.forks} forks)\n- Other notable work: ${candidate.topRepos.slice(1, 3).map((r: any) => r.name).join(', ')}\n- Primary languages: ${candidate.topLanguages.slice(0, 3).join(', ')}\n- Total stars earned: ${candidate.totalStars}\n- Their key strengths for this role: ${scores.strengths?.join(', ')}\n\nRole: ${requirements.description}\nKey skills needed: ${requirements.skills?.slice(0, 4).join(', ')}\n\nWrite 150-200 words. Format:\nSubject: [compelling subject line]\n\n[email body — start with their name, reference their specific work, explain why this role fits them, end with a clear CTA]` }
      ],
      temperature: 0.7,
    });
    return res.choices[0].message.content || '';
  } catch {
    return `Subject: Exciting opportunity — ${requirements.role}\n\nHi ${candidate.name},\n\nWe came across your GitHub profile and were impressed by your work on ${candidate.topRepos[0]?.name}. We think you'd be a great fit for our ${requirements.role} role.\n\nWould love to connect!\n\nBest regards`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, count = 5, location = '' } = await req.json();
    if (!jobDescription) return NextResponse.json({ error: 'Job description required' }, { status: 400 });

    const requirements = await parseJobDescription(jobDescription);
    const rawCandidates = await searchGitHubCandidates(requirements, count, location);
    const detailPromises = rawCandidates.slice(0, count + 8).map(u => getCandidateDetails(u.login));
    const details = (await Promise.all(detailPromises)).filter(Boolean).filter((c: any) => c.type !== 'Organization');

    const scoredCandidates = [];
    for (const candidate of details.slice(0, count)) {
      const scores = await scoreCandidate(candidate, requirements);
      const email = await generateEmail(candidate, requirements, scores);
      scoredCandidates.push({ ...candidate, scores, email });
    }

    scoredCandidates.sort((a, b) => (b.scores?.overall_score || 0) - (a.scores?.overall_score || 0));

    return NextResponse.json({
      requirements,
      candidates: scoredCandidates,
      total_searched: rawCandidates.length,
      location: location || 'Global',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}