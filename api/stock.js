// 盈迹Board API — Vercel Serverless Function
// 代理转发到 Cloudflare Worker（国内可访问）

const WORKER_URL = 'https://stock-api.xiaopan-369.workers.dev';

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, tickers, keyword } = req.query;

  try {
    if (!action || action === 'health') {
      return res.status(200).json({ status: 'ok', app: '盈迹Board' });
    }

    // 转发到 Worker
    const params = new URLSearchParams(req.query).toString();
    const targetUrl = `${WORKER_URL}/api/${action}${params ? '?' + params : ''}`;

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
};
