export const maxDuration = 60;
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
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { role: 'Software Engineer', skills: [], languages: ['javascript'], experience_level: 'mid', keywords: [], description: jd.slice(0, 100) };
  } catch { return { role: 'Software Engineer', skills: [], languages: ['javascript'], experience_level: 'mid', keywords: [], description: jd.slice(0, 100) }; }
}

async function searchGitHubCandidates(requirements: any, count: number, location?: string) {
  const languages = requirements.languages?.slice(0, 2) || ['javascript'];
  const loc = location?.trim();
  const locationQuery = loc ? ` location:"${loc}"` : '';

  const queries = [
    `language:${languages[0]} followers:>100${locationQuery}`,
    `language:${languages[0]} followers:>50 repos:>15${locationQuery}`,
    languages[1] ? `language:${languages[1]} followers:>50${locationQuery}` : `language:${languages[0]} followers:>30${locationQuery}`,
    `language:javascript followers:>80${locationQuery}`,
    requirements.keywords?.[0] ? `${requirements.keywords[0]} in:bio followers:>30${locationQuery}` : `language:${languages[0]} repos:>25${locationQuery}`,
  ];

  const users = new Map();
  for (const query of queries) {
    try {
      const res = await fetch(
        `https://api.github.com/search/users?q=${encodeURIComponent(query)}&sort=followers&per_page=20`,
        { headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'ScoutAI-Agent', 'Authorization': `token ${process.env.GITHUB_TOKEN}` } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const user of data.items || []) {
        if (!users.has(user.login)) users.set(user.login, user);
      }
    } catch {}
    if (users.size >= count * 6) break;
  }
  return Array.from(users.values());
}

async function getCandidateDetails(username: string) {
  try {
    const [profileRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, {
        headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'ScoutAI-Agent', 'Authorization': `token ${process.env.GITHUB_TOKEN}` }
      }),
      fetch(`https://api.github.com/users/${username}/repos?sort=stars&per_page=8`, {
        headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'ScoutAI-Agent', 'Authorization': `token ${process.env.GITHUB_TOKEN}` }
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
  const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it'];
  for (const model of models) {
    try {
      const res = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: 'You are a senior technical recruiter. Score GitHub developers. Respond ONLY with valid JSON, no markdown.' },
          { role: 'user', content: `Score this developer for: ${requirements.role}\nRequired: ${requirements.skills?.join(', ')}\nLanguages needed: ${requirements.languages?.join(', ')}\n\nCandidate: ${candidate.name}\nBio: ${candidate.bio}\nLanguages: ${candidate.topLanguages.join(', ')}\nFollowers: ${candidate.followers}, Repos: ${candidate.public_repos}, Stars: ${candidate.totalStars}, Years: ${candidate.yearsOnGitHub}\nProjects: ${candidate.topRepos.map((r: any) => `${r.name}(${r.stars}⭐): ${r.description}`).join(' | ')}\n\nReturn ONLY this JSON:\n{"technical_fit":0-100,"technical_reasoning":"sentence","activity_score":0-100,"activity_reasoning":"sentence","project_quality":0-100,"quality_reasoning":"sentence","presence_score":0-100,"presence_reasoning":"sentence","overall_score":0-100,"verdict":"2 sentences","strengths":["s1","s2","s3"],"concerns":["c1"],"seniority_estimate":"junior|mid|senior|principal","hire_recommendation":"strong_yes|yes|maybe|no"}` }
        ],
        temperature: 0.2,
        max_tokens: 600,
      });
      const text = res.choices[0].message.content || '{}';
      const cleaned = text.replace(/```json|```/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) { await new Promise(r => setTimeout(r, 1000)); continue; }
      return JSON.parse(jsonMatch[0]);
    } catch (e: any) {
      if (e?.status === 429) { await new Promise(r => setTimeout(r, 2000)); continue; }
      continue;
    }
  }
  return { technical_fit: 50, activity_score: 50, project_quality: 50, presence_score: 50, overall_score: 50, verdict: 'Scoring unavailable.', strengths: [], concerns: [], technical_reasoning: '', activity_reasoning: '', quality_reasoning: '', presence_reasoning: '', seniority_estimate: 'mid', hire_recommendation: 'maybe' };
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
    const detailPromises = rawCandidates.slice(0, count + 20).map(u => getCandidateDetails(u.login));
    const details = (await Promise.all(detailPromises)).filter(Boolean).filter((c: any) => c.type !== 'Organization');

    // Pre-filter: only candidates whose languages overlap with requirements
    const requiredLangs = (requirements.languages || []).map((l: string) => l.toLowerCase());
    const preFiltered = details.filter((c: any) => {
      if (requiredLangs.length === 0) return true;
      const candidateLangs = (c.topLanguages || []).map((l: string) => l.toLowerCase());
      return requiredLangs.some((l: string) => candidateLangs.includes(l)) || candidateLangs.includes('javascript') || candidateLangs.includes('typescript') || candidateLangs.includes('css') || candidateLangs.includes('html');
    });

    // Score more than needed, then pick the best
    const toScore = preFiltered.slice(0, Math.min(count, preFiltered.length));
    const scoredCandidates = [];
    for (const candidate of toScore) {
      const scores = await scoreCandidate(candidate, requirements);
      await new Promise(r => setTimeout(r, 1500));
      const email = await generateEmail(candidate, requirements, scores);
      await new Promise(r => setTimeout(r, 1000));
      scoredCandidates.push({ ...candidate, scores, email });
    }
    scoredCandidates.sort((a, b) => (b.scores?.overall_score || 0) - (a.scores?.overall_score || 0));

    return NextResponse.json({
      requirements,
      candidates: scoredCandidates.slice(0, count),
      total_searched: rawCandidates.length,
      location: location || 'Global',
    });
  } catch (error: any) {
    const msg = error.message || '';
    if (msg.includes('429') || msg.includes('rate_limit') || msg.includes('Rate limit')) {
      return NextResponse.json({ error: 'The agent is taking a short break due to high demand. Please wait 2 minutes and try again.' }, { status: 429 });
    }
    if (msg.includes('401') || msg.includes('invalid_api_key')) {
      return NextResponse.json({ error: 'Configuration error. Please contact support.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Something went wrong. Please try again in a moment.' }, { status: 500 });
  }
}