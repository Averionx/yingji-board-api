// 盈迹Board API — Vercel Serverless Function
// 代理转发到 Cloudflare Worker（国内可访问）

const WORKER_URL = 'https://stock-api.xiaopan-369.workers.dev';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 转发到 Worker
  const params = new URLSearchParams(req.query).toString();
  const workerPath = `/api/${req.query.action || 'health'}`;
  const targetUrl = `${WORKER_URL}${workerPath}${params ? '?' + params : ''}`;

  try {
    const fetchOptions = {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (req.method === 'POST' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const resp = await fetch(targetUrl, fetchOptions);
    const data = await resp.json();

    return res.status(resp.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Worker unreachable', detail: err.message });
  }
}
