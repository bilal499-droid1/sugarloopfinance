import { tokenStorage } from './client';

// Subscribe to the server's live change feed (GET /api/live, Server-Sent Events).
// Uses fetch rather than EventSource so the token goes in a header, not the URL.
// Reconnects with backoff; returns a function that closes the connection.
export const connectLive = ({ onStatus, onChange, onReconnect }) => {
  const controller = new AbortController();

  const readEvents = async (body) => {
    const reader = body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      buffer += value.replace(/\r/g, '');
      let end;
      while ((end = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        let event = 'message';
        let data = '';
        for (const line of block.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) data += line.slice(5).trim();
        }
        if (event === 'changed' && data) {
          try {
            onChange(JSON.parse(data));
          } catch {
            /* ignore a malformed event */
          }
        }
      }
    }
  };

  (async () => {
    let delay = 1000;
    let connectedBefore = false;
    while (!controller.signal.aborted) {
      onStatus('connecting');
      try {
        const res = await fetch('/api/live', {
          headers: { Authorization: `Bearer ${tokenStorage.get()}` },
          signal: controller.signal,
        });
        if (res.status === 401) break; // signed out; the API client handles that
        if (!res.ok) throw new Error(`Live feed returned ${res.status}`);
        onStatus('live');
        delay = 1000;
        // Catch up on anything missed while disconnected.
        if (connectedBefore) onReconnect();
        connectedBefore = true;
        await readEvents(res.body);
      } catch {
        if (controller.signal.aborted) break;
      }
      onStatus('offline');
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, 30000);
    }
    onStatus('off');
  })();

  return () => controller.abort();
};
