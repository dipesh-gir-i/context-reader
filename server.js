import { createServer } from 'node:http';
import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.FEEDBACK_PORT || 8787);
const feedbackFile = join(dirname(fileURLToPath(import.meta.url)), 'feedback.jsonl');

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return sendJson(response, 204, {});
  if (request.method !== 'POST' || request.url !== '/api/feedback') return sendJson(response, 404, { error: 'Not found' });

  let raw = '';
  for await (const chunk of request) raw += chunk;
  try {
    const body = JSON.parse(raw);
    if (typeof body.message !== 'string' || !body.message.trim()) return sendJson(response, 400, { error: 'A feedback message is required.' });
    const entry = {
      type: typeof body.type === 'string' ? body.type : 'General feedback',
      message: body.message.trim(),
      email: typeof body.email === 'string' ? body.email.trim() : '',
      createdAt: Number(body.createdAt) || Date.now(),
      receivedAt: new Date().toISOString()
    };
    await mkdir(dirname(feedbackFile), { recursive: true });
    await appendFile(feedbackFile, `${JSON.stringify(entry)}\n`, 'utf8');
    return sendJson(response, 201, { ok: true });
  } catch {
    return sendJson(response, 400, { error: 'Invalid feedback request.' });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Feedback server listening at http://localhost:${port}`);
});
