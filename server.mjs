import http from 'node:http';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  appendReviewDecision,
  appendEvent,
  DEFAULT_PROJECT_ID,
  getProjectState,
  listProjects,
  readEvents,
  smoke
} from './src/overwatch-core.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CONTROL_PLANE_PATH = path.join(PROJECT_ROOT, 'hapa-fleet-compiler', 'phase5_live_telemetry_control_plane_alpha.json');
const AGENT_CREW_OPS_PATH = path.join(PROJECT_ROOT, 'hapa-fleet-compiler', 'phase5_agent_crew_ops_console_alpha.json');
const PORT = Number(process.env.PORT || 5181);
const HOST = process.env.HOST || '127.0.0.1';

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      return sendJson(res, {
        ok: true,
        service: 'hapa-overwatch-kanban',
        project_id: DEFAULT_PROJECT_ID,
        stage: 'prototype',
        ts: new Date().toISOString()
      });
    }

    if (req.method === 'GET' && url.pathname === '/capabilities') {
      return sendJson(res, {
        ok: true,
        capabilities: [
          'append-only-events',
          'kanban-projection',
          'project-communications',
          'protocol-telemetry',
          'human-review-gate',
          'cli-api-ui-parity-scaffold'
        ],
        event_types: [
          'task_created',
          'task_updated',
          'task_moved',
          'task_assigned',
          'task_blocked',
          'task_unblocked',
          'task_comment',
          'review_decision',
          'message',
          'checkpoint',
          'telemetry',
          'protocol_note'
        ],
        auth: 'loopback prototype; bind to 127.0.0.1 by default'
      });
    }

    if (req.method === 'GET' && url.pathname === '/v1/projects') {
      return sendJson(res, { ok: true, projects: await listProjects() });
    }

    const stateMatch = url.pathname.match(/^\/v1\/projects\/([^/]+)\/state$/);
    if (req.method === 'GET' && stateMatch) {
      return sendJson(res, { ok: true, state: await getProjectState(stateMatch[1]) });
    }

    const controlPlaneMatch = url.pathname.match(/^\/v1\/projects\/([^/]+)\/control-plane$/);
    if (req.method === 'GET' && controlPlaneMatch) {
      try {
        const controlPlane = JSON.parse(await fs.readFile(CONTROL_PLANE_PATH, 'utf8'));
        return sendJson(res, {
          ok: true,
          project_id: controlPlaneMatch[1],
          source: CONTROL_PLANE_PATH,
          controlPlane
        });
      } catch (error) {
        return sendJson(res, {
          ok: false,
          project_id: controlPlaneMatch[1],
          source: CONTROL_PLANE_PATH,
          error: `control_plane_unavailable: ${error.message}`
        }, 404);
      }
    }

    const agentCrewOpsMatch = url.pathname.match(/^\/v1\/projects\/([^/]+)\/agent-crew-ops$/);
    if (req.method === 'GET' && agentCrewOpsMatch) {
      try {
        const agentCrewOps = JSON.parse(await fs.readFile(AGENT_CREW_OPS_PATH, 'utf8'));
        return sendJson(res, {
          ok: true,
          project_id: agentCrewOpsMatch[1],
          source: AGENT_CREW_OPS_PATH,
          agentCrewOps
        });
      } catch (error) {
        return sendJson(res, {
          ok: false,
          project_id: agentCrewOpsMatch[1],
          source: AGENT_CREW_OPS_PATH,
          error: `agent_crew_ops_unavailable: ${error.message}`
        }, 404);
      }
    }

    const eventsMatch = url.pathname.match(/^\/v1\/projects\/([^/]+)\/events$/);
    if (eventsMatch && req.method === 'GET') {
      return sendJson(res, { ok: true, events: await readEvents(eventsMatch[1]) });
    }

    if (eventsMatch && req.method === 'POST') {
      const body = await readJsonBody(req);
      const event = await appendEvent(eventsMatch[1], body);
      return sendJson(res, { ok: true, event }, 201);
    }

    const reviewDecisionMatch = url.pathname.match(/^\/v1\/projects\/([^/]+)\/review-decisions$/);
    if (reviewDecisionMatch && req.method === 'POST') {
      const body = await readJsonBody(req);
      const result = await appendReviewDecision(reviewDecisionMatch[1], body);
      return sendJson(res, { ok: true, result }, 201);
    }

    const smokeMatch = url.pathname.match(/^\/v1\/projects\/([^/]+)\/smoke$/);
    if (smokeMatch && req.method === 'GET') {
      return sendJson(res, await smoke(smokeMatch[1]));
    }

    if (req.method === 'GET') {
      return serveStatic(url.pathname, res);
    }

    sendJson(res, { ok: false, error: 'not_found' }, 404);
  } catch (error) {
    sendJson(res, { ok: false, error: error.message }, 500);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Hapa Overwatch Kanban listening at http://${HOST}:${PORT}`);
});

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function serveStatic(requestPath, res) {
  const safePath = requestPath === '/' ? '/index.html' : requestPath;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    return sendJson(res, { ok: false, error: 'invalid_path' }, 400);
  }

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) throw new Error('not a file');
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': contentTypes[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(await fs.readFile(filePath));
  } catch {
    sendJson(res, { ok: false, error: 'not_found' }, 404);
  }
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': 'http://127.0.0.1'
  });
  res.end(JSON.stringify(data, null, 2));
}
