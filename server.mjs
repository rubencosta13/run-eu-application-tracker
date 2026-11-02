import { createServer } from 'node:http';
import { readFile, readdir, writeFile, mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const APPLICATIONS_DIR = path.join(DATA_DIR, 'applications');
const LIBRARY_FILE = path.join(DATA_DIR, 'answer-library.yaml');
const PARTICIPATION_FILE = path.join(DATA_DIR, 'participation-history.yaml');
const COMMON_QUESTIONS_FILE = path.join(DATA_DIR, 'common-questions.yaml');
const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml' };

const send = (res, status, body, type='application/json; charset=utf-8') => {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
  res.end(body);
};
const json = (res, status, value) => send(res, status, JSON.stringify(value));
const safeId = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);

async function readYaml(file, fallback) {
  try { return YAML.parse(await readFile(file, 'utf8')) ?? fallback; }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}
async function writeYaml(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const content = YAML.stringify(value, { lineWidth: 100, defaultStringType: 'QUOTE_DOUBLE' });
  await writeFile(file, content, 'utf8');
}
async function readApplications() {
  await mkdir(APPLICATIONS_DIR, { recursive: true });
  const names = (await readdir(APPLICATIONS_DIR)).filter(n => /^[-a-z0-9_]+\.ya?ml$/i.test(n)).sort();
  return Promise.all(names.map(async name => ({ ...(await readYaml(path.join(APPLICATIONS_DIR, name), {})), _file:name })));
}
async function bodyJson(req) {
  let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 1_000_000) throw new Error('Request body too large'); }
  return raw ? JSON.parse(raw) : {};
}
function applicationPath(filename) {
  if (!/^[-a-z0-9_]+\.ya?ml$/i.test(filename)) throw new Error('Invalid application filename');
  return path.join(APPLICATIONS_DIR, filename);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const method = req.method;

    if (url.pathname === '/api/applications' && method === 'GET') return json(res, 200, await readApplications());
    if (url.pathname === '/api/applications' && method === 'POST') {
      const data = await bodyJson(req);
      if (!data.programme?.id || !data.programme?.name) return json(res, 400, { error:'Programme ID and name are required.' });
      const filename = `${safeId(data.programme.id)}.yaml`;
      const file = applicationPath(filename);
      try { await readFile(file); return json(res, 409, { error:'An application with this programme ID already exists.' }); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      const { _file, ...stored } = data;
      await writeYaml(file, stored);
      return json(res, 201, { ...stored, _file:filename });
    }
    const appMatch = url.pathname.match(/^\/api\/applications\/([^/]+)$/);
    if (appMatch && method === 'PUT') {
      const filename = decodeURIComponent(appMatch[1]); const file = applicationPath(filename); const data = await bodyJson(req);
      if (!data.programme?.id || !data.programme?.name) return json(res, 400, { error:'Programme ID and name are required.' });
      const { _file, ...stored } = data;
      await writeYaml(file, stored); return json(res, 200, { ...stored, _file:filename });
    }
    if (appMatch && method === 'DELETE') {
      await unlink(applicationPath(decodeURIComponent(appMatch[1]))); return json(res, 200, { ok:true });
    }

    if (url.pathname === '/api/participation-history') {
      if (method === 'GET') return json(res, 200, await readYaml(PARTICIPATION_FILE, { entries:[] }));
      if (method === 'PUT') { const data = await bodyJson(req); await writeYaml(PARTICIPATION_FILE, data); return json(res, 200, data); }
    }
    if (url.pathname === '/api/answer-library') {
      if (method === 'GET') return json(res, 200, await readYaml(LIBRARY_FILE, { entries:[] }));
      if (method === 'PUT') { const data = await bodyJson(req); await writeYaml(LIBRARY_FILE, data); return json(res, 200, data); }
    }
    if (url.pathname === '/api/common-questions') {
      if (method === 'GET') return json(res, 200, await readYaml(COMMON_QUESTIONS_FILE, { questions:[] }));
      if (method === 'PUT') { const data = await bodyJson(req); await writeYaml(COMMON_QUESTIONS_FILE, data); return json(res, 200, data); }
    }

    if (method !== 'GET') return json(res, 405, { error:'Method not allowed' });
    const requested = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    const file = path.resolve(PUBLIC_DIR, requested);
    if (!file.startsWith(PUBLIC_DIR + path.sep) && file !== path.join(PUBLIC_DIR, 'index.html')) return send(res, 403, 'Forbidden', 'text/plain');
    return send(res, 200, await readFile(file), MIME[path.extname(file)] || 'application/octet-stream');
  } catch (error) {
    console.error(error);
    return json(res, error instanceof SyntaxError ? 400 : 500, { error:error.message || 'Unexpected server error' });
  }
});

server.listen(PORT, HOST, () => console.log(`RUN-EU tracker: http://${HOST}:${PORT}`));
