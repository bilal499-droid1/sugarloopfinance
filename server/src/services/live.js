// Live updates over Server-Sent Events. Every open app subscribes to
// GET /api/live; after any successful change (POST/PATCH/PUT/DELETE) all
// subscribers get a small "changed" event and re-fetch what they show.

const clients = new Set();

const send = (res, event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

export const liveStream = (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  send(res, 'ready', { at: Date.now() });

  clients.add(res);
  // Comment lines keep proxies from closing an idle connection.
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
};

// Middleware: announce successful writes, e.g. { area: 'records', by: 'Admin' }.
export const announceChanges = (req, res, next) => {
  if (req.method === 'GET') return next();
  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    const change = {
      area: req.originalUrl.split('?')[0].split('/')[2], // /api/records/123 -> records
      by: req.user?.name,
      clientId: req.get('X-Client-Id'), // lets the tab that made the change skip its own echo
      at: Date.now(),
    };
    for (const client of clients) send(client, 'changed', change);
  });
  next();
};
