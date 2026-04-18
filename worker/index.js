const SCORES_KEY    = 'highscores';
const MAX_SCORES    = 10;
const MAX_SCORE_VAL = 36; // 8 tokens + 28 remaining deck
const ALLOWED_ORIGIN = 'https://mearkus.com';

function corsHeaders(origin) {
  const allow = (origin === ALLOWED_ORIGIN || origin?.endsWith('.mearkus.com'))
    ? origin : ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin':  allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

export default {
  async fetch(request, env) {
    const origin  = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);
    const url     = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (url.pathname !== '/scores') {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
    }

    if (request.method === 'GET') {
      const data = (await env.RAIN_KV.get(SCORES_KEY, 'json')) || [];
      return new Response(JSON.stringify(data), { headers });
    }

    if (request.method === 'POST') {
      let body;
      try { body = await request.json(); }
      catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers }); }

      const rawInitials = String(body.initials ?? '');
      const rawScore    = Number(body.score);
      const initials    = rawInitials.replace(/[^A-Z]/gi, '').toUpperCase().slice(0, 3);
      const score       = Math.max(0, Math.min(MAX_SCORE_VAL, Math.floor(rawScore)));

      if (!initials || !Number.isFinite(rawScore)) {
        return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400, headers });
      }

      const scores = (await env.RAIN_KV.get(SCORES_KEY, 'json')) || [];
      scores.push({ initials, score });
      scores.sort((a, b) => b.score - a.score);
      scores.splice(MAX_SCORES);
      await env.RAIN_KV.put(SCORES_KEY, JSON.stringify(scores));

      return new Response(JSON.stringify(scores), { headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  },
};
