// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Public origin of the deployed site. Set PUBLIC_SITE_URL in Vercel once the
// custom domain is attached; it drives canonical URLs, share links and the sitemap.
const site = process.env.PUBLIC_SITE_URL || 'https://fabeventsisrael.com';

/** Local-only helper for the tap-to-edit preview. It is never included in a build. */
function localEditor() {
  const historyDirectory = join(process.cwd(), '.local-editor-history');
  const historyFile = join(historyDirectory, 'edit-history.json');
  const readHistory = async () => {
    const history = await readFile(historyFile, 'utf8').then(JSON.parse).catch(() => []);
    return Array.isArray(history) ? history : [];
  };
  const writeHistory = async (history) => {
    await mkdir(historyDirectory, { recursive: true });
    await writeFile(historyFile, JSON.stringify(history.slice(-80), null, 2), 'utf8');
  };
  const saveJson = (response, status, body) => {
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(body));
  };
  const safePage = (page) => typeof page === 'string' && /^[a-z0-9-]+$/.test(page);
  const describeMarkup = (markup) => markup.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 88);
  return {
    name: 'fab-local-editor',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/edit-history/', async (request, response, next) => {
        if (request.method !== 'GET') return next();
        const url = new URL(request.url || '/', 'http://localhost');
        const page = url.searchParams.get('page');
        if (!safePage(page)) return saveJson(response, 400, { error: 'The page could not be identified safely.' });
        const history = await readHistory();
        const entries = history
          .filter((entry) => entry.page === page)
          .slice(-15)
          .reverse()
          .map(({ id, savedAt, area, description }) => ({ id, savedAt, area, description }));
        return saveJson(response, 200, { entries });
      });

      server.middlewares.use('/api/undo-edit/', async (request, response, next) => {
        if (request.method !== 'POST') return next();
        let input;
        try { input = JSON.parse(await new Promise((resolve, reject) => { let raw = ''; request.on('data', (chunk) => raw += chunk); request.on('end', () => resolve(raw)); request.on('error', reject); })); } catch { return saveJson(response, 400, { error: 'The undo request could not be read.' }); }
        if (!safePage(input.page)) return saveJson(response, 400, { error: 'The page could not be identified safely.' });
        const history = await readHistory();
        const index = history.map((entry) => entry.page).lastIndexOf(input.page);
        if (index < 0) return saveJson(response, 404, { error: 'There are no saved edits to undo on this page yet.' });
        const [entry] = history.splice(index, 1);
        await server.watcher.unwatch(join(process.cwd(), entry.relativePath));
        await writeFile(join(process.cwd(), entry.relativePath), entry.before, 'utf8');
        await writeHistory(history);
        server.moduleGraph.invalidateAll();
        return saveJson(response, 200, { restored: true, description: entry.description });
      });

      server.middlewares.use('/api/restore-edit/', async (request, response, next) => {
        if (request.method !== 'POST') return next();
        let input;
        try { input = JSON.parse(await new Promise((resolve, reject) => { let raw = ''; request.on('data', (chunk) => raw += chunk); request.on('end', () => resolve(raw)); request.on('error', reject); })); } catch { return saveJson(response, 400, { error: 'The restore request could not be read.' }); }
        if (!safePage(input.page) || typeof input.id !== 'string') return saveJson(response, 400, { error: 'That saved version could not be identified safely.' });
        const history = await readHistory();
        const index = history.findIndex((entry) => entry.id === input.id && entry.page === input.page);
        if (index < 0) return saveJson(response, 404, { error: 'That saved version is no longer available.' });
        const entry = history[index];
        await server.watcher.unwatch(join(process.cwd(), entry.relativePath));
        await writeFile(join(process.cwd(), entry.relativePath), entry.before, 'utf8');
        await writeHistory(history.slice(0, index + 1));
        server.moduleGraph.invalidateAll();
        return saveJson(response, 200, { restored: true, description: entry.description });
      });

      server.middlewares.use('/api/save-edit/', async (request, response, next) => {
        if (request.method !== 'POST') return next();
        let raw = '';
        for await (const chunk of request) raw += chunk;
        let input;
        try {
          input = JSON.parse(raw);
        } catch {
          response.writeHead(400, { 'Content-Type': 'application/json' });
          return response.end(JSON.stringify({ error: 'The text change could not be read.' }));
        }

        const validPage = typeof input.page === 'string' && /^[a-z0-9-]+$/.test(input.page);
        const validArea = ['content', 'header', 'footer'].includes(input.area);
        const validText = typeof input.oldText === 'string' && typeof input.newText === 'string' && input.newText.trim();
        const validOccurrence = Number.isInteger(input.occurrence) && input.occurrence >= 0;
        if (!validPage || !validArea || !validText || !validOccurrence) {
          response.writeHead(400, { 'Content-Type': 'application/json' });
          return response.end(JSON.stringify({ error: 'That text could not be identified safely.' }));
        }

        const relativePath = input.area === 'content'
          ? join('src', 'data', 'pages', input.page, 'content.html')
          : join('src', 'data', 'layout', `${input.area}.html`);
        const filePath = join(process.cwd(), relativePath);
        const source = await readFile(filePath, 'utf8').catch(() => null);
        // The browser normalizes Windows line endings to "\n" in editable text.
        // Match either line-ending style without changing the rest of the file.
        const escapedText = input.oldText
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\r?\n/g, '\\r?\\n');
        const matches = source ? [...source.matchAll(new RegExp(escapedText, 'g'))] : [];
        if (input.occurrence >= matches.length) {
          response.writeHead(409, { 'Content-Type': 'application/json' });
          return response.end(JSON.stringify({ error: matches.length ? 'The matching text changed before it could be saved. Please try again.' : 'The matching website text was not found.' }));
        }

        const match = matches[input.occurrence];
        const updated = source.slice(0, match.index) + input.newText + source.slice(match.index + match[0].length);
        // Do not refresh the browser while someone is editing. Invalidate the
        // server copy so the new text is read from disk on a later manual reload.
        const history = await readHistory();
        history.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          page: input.page,
          area: input.area,
          relativePath,
          before: source,
          description: describeMarkup(input.newText),
          savedAt: new Date().toISOString(),
        });
        await server.watcher.unwatch(filePath);
        await writeFile(filePath, updated, 'utf8');
        await writeHistory(history);
        server.moduleGraph.invalidateAll();
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ saved: true }));
      });
    },
  };
}

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  // The page markup is Elementor's rendered output; keep whitespace exactly as captured.
  compressHTML: false,
  build: { format: 'directory', inlineStylesheets: 'never' },
  integrations: [sitemap()],
  vite: { plugins: [localEditor()] },
});
