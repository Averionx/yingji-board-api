// Vercel Serverless Function — 盈迹Board API
const TWELVE_DATA_KEY = '82e0ae48d8bc4afca6fc14410765e847';
const SERVERCHAN_KEY = 'SCT121948TA-QPHfFwB0QTXlujllcpDoaME7';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, tickers, keyword } = req.query;

  try {
    // 健康检查
    if (!action || action === 'health') {
      return res.json({ status: 'ok', app: '盈迹Board' });
    }

    // 获取股价
    if (action === 'quote') {
      if (!tickers) return res.status(400).json({ error: 'missing tickers' });

      const tickerList = tickers.split(',');
      const data = [];

      for (const ticker of tickerList) {
        const api = `https://api.twelvedata.com/quote?symbol=${ticker.trim()}&apikey=${TWELVE_DATA_KEY}`;
        const resp = await fetch(api);
        const json = await resp.json();

        if (json.symbol) {
          data.push({
            symbol: json.symbol,
            name: json.name,
            close: parseFloat(json.close),
            change: json.change,
            changePercent: json.percent_change,
            high: json.fifty_two_week?.high || null,
            low: json.fifty_two_week?.low || null,
          });
        }
      }

      return res.json({ data });
    }

    // 搜索股票
    if (action === 'search') {
      if (!keyword) return res.status(400).json({ error: 'missing keyword' });

      const api = `https://api.twelvedata.com/symbol_search?symbol=${keyword}&apikey=${TWELVE_DATA_KEY}`;
      const resp = await fetch(api);
      const json = await resp.json();

      const seen = new Set();
      const data = (json.data || [])
        .filter(item => {
          if (seen.has(item.symbol)) return false;
          seen.add(item.symbol);
          return true;
        })
        .slice(0, 8)
        .map(item => ({
          symbol: item.symbol,
          name: item.instrument_name,
          exchange: item.exchange,
          type: item.instrument_type,
        }));

      return res.json({ data });
    }

    // 美元兑人民币汇率
    if (action === 'exchange-rate') {
      const resp = await fetch('https://open.er-api.com/v6/latest/USD');
      const json = await resp.json();
      const rate = Number(json?.rates?.CNY);
      if (!rate || !Number.isFinite(rate)) {
        return res.status(502).json({ error: 'rate unavailable' });
      }
      return res.json({
        data: {
          base: 'USD',
          target: 'CNY',
          rate,
          updatedAt: Date.now(),
        },
      });
    }

    // 常用外汇行情
    if (action === 'forex') {
      const resp = await fetch('https://open.er-api.com/v6/latest/USD');
      const json = await resp.json();
      const rates = json?.rates || {};
      const usdCny = Number(rates.CNY);
      const usdHkd = Number(rates.HKD);
      const eur = Number(rates.EUR);
      const jpy = Number(rates.JPY);

      if (!usdCny || !usdHkd || !eur || !jpy) {
        return res.status(502).json({ error: 'forex unavailable' });
      }

      return res.json({
        data: [
          { symbol: 'USD/CNY', name: '美元/人民币', rate: usdCny },
          { symbol: 'USD/HKD', name: '美元/港币', rate: usdHkd },
          { symbol: 'HKD/CNY', name: '港币/人民币', rate: usdCny / usdHkd },
          { symbol: 'EUR/USD', name: '欧元/美元', rate: 1 / eur },
          { symbol: 'USD/JPY', name: '美元/日元', rate: jpy },
        ],
        updatedAt: Date.now(),
      });
    }

    // 测试推送
    if (action === 'test-push') {
      const title = encodeURIComponent('盈迹Board 测试推送');
      const content = encodeURIComponent('这是一条测试消息，Server酱推送正常工作。');
      const pushUrl = `https://sctapi.ftqq.com/${SERVERCHAN_KEY}.send?title=${title}&desp=${content}`;
      const resp = await fetch(pushUrl);
      const json = await resp.json();
      return res.json({ ok: true, result: json });
    }

    // Logo 代理 — 从 unavatar.io 获取公司 logo
    if (action === 'logo') {
      const domain = req.query.domain;
      if (!domain) return res.status(400).json({ error: 'missing domain' });

      try {
        const logoResp = await fetch(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          redirect: 'follow',
        });

        if (!logoResp.ok) {
          return res.status(404).json({ error: 'logo not found' });
        }

        const buffer = await logoResp.arrayBuffer();
        const contentType = logoResp.headers.get('content-type') || 'image/png';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'no-cache, max-age=0');
        return res.send(Buffer.from(buffer));
      } catch (e) {
        return res.status(502).json({ error: 'logo fetch failed' });
      }
    }

    return res.status(404).json({ error: 'not found' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
