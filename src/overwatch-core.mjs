import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, '..');
export const DEFAULT_PROJECT_ID = 'hapa-black-horizon-mvp';

const CONFIG_DIR = path.join(ROOT_DIR, 'config', 'projects');
const DATA_DIR = path.join(ROOT_DIR, 'data');

export const EVENT_TYPES = new Set([
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
]);

export const REVIEW_DECISIONS = new Set(['accept', 'revise', 'promote', 'defer']);

export const REVIEW_DECISION_TARGETS = {
  accept: 'done',
  revise: 'ready',
  promote: 'done',
  defer: 'backlog'
};

export async function listProjects() {
  const files = await fs.readdir(CONFIG_DIR);
  const projects = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const project = await readProjectConfig(file.replace(/\.json$/, ''));
    projects.push({
      id: project.id,
      name: project.name,
      summary: project.summary,
      active: project.active !== false
    });
  }

  return projects;
}

export async function readProjectConfig(projectId = DEFAULT_PROJECT_ID) {
  const configPath = path.join(CONFIG_DIR, `${projectId}.json`);
  const raw = await fs.readFile(configPath, 'utf8');
  return JSON.parse(raw);
}

export function projectDataDir(projectId = DEFAULT_PROJECT_ID) {
  return path.join(DATA_DIR, projectId);
}

export function projectEventsPath(projectId = DEFAULT_PROJECT_ID) {
  return path.join(projectDataDir(projectId), 'events.ndjson');
}

export async function ensureProjectStorage(projectId = DEFAULT_PROJECT_ID) {
  const config = await readProjectConfig(projectId);
  const dir = projectDataDir(projectId);
  const eventsPath = projectEventsPath(projectId);

  await fs.mkdir(dir, { recursive: true });

  try {
    await fs.access(eventsPath);
  } catch {
    const seedPath = path.join(ROOT_DIR, config.seedEventsPath || '');
    await fs.copyFile(seedPath, eventsPath);
  }

  return { config, eventsPath };
}

export async function readEvents(projectId = DEFAULT_PROJECT_ID) {
  const { eventsPath } = await ensureProjectStorage(projectId);
  const raw = await fs.readFile(eventsPath, 'utf8');

  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return { ...JSON.parse(line), sequence: index + 1 };
      } catch (error) {
        return {
          id: `parse_error_${index + 1}`,
          type: 'protocol_note',
          actor: 'Overwatch',
          ts: new Date(0).toISOString(),
          sequence: index + 1,
          payload: {
            title: 'Unparseable event line',
            error: error.message,
            line
          }
        };
      }
    });
}

export async function appendEvent(projectId = DEFAULT_PROJECT_ID, input = {}) {
  const { eventsPath } = await ensureProjectStorage(projectId);
  const event = normalizeEvent(projectId, input);
  await fs.appendFile(eventsPath, `${JSON.stringify(event)}\n`, 'utf8');
  return event;
}

export async function appendReviewDecision(projectId = DEFAULT_PROJECT_ID, input = {}) {
  const taskId = String(input.taskId || input.task_id || '').trim();
  if (!taskId) throw new Error('Review decision taskId is required.');

  const decision = String(input.decision || '').trim().toLowerCase();
  if (!REVIEW_DECISIONS.has(decision)) {
    throw new Error(`Review decision must be one of: ${Array.from(REVIEW_DECISIONS).join(', ')}`);
  }

  const actor = String(input.actor || 'Human').trim();
  const note = String(input.note || input.body || '').trim();
  const evidenceHref = String(input.evidenceHref || input.evidence || '').trim();
  const evidenceLabel = String(input.evidenceLabel || 'Review evidence').trim();

  if (!note) throw new Error('Human review note is required.');
  if (!evidenceHref) throw new Error('Evidence link is required.');

  const state = await getProjectState(projectId);
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task) throw new Error(`Unknown task for review decision: ${taskId}`);
  if (task.column !== 'review') {
    throw new Error(`Review decisions can only be applied to review cards. ${taskId} is in ${task.column}.`);
  }

  const targetColumn = REVIEW_DECISION_TARGETS[decision];
  const nowId = `${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
  const followupTitle = String(input.followupTitle || '').trim();
  const followupTaskId = decision === 'promote'
    ? String(input.followupTaskId || slugify(`phase2-${task.id}-${followupTitle || 'follow-up'}-${nowId}`)).trim()
    : null;

  const links = [{ label: evidenceLabel, href: evidenceHref }];
  const events = [];

  const decisionEvent = await appendEvent(projectId, {
    type: 'review_decision',
    actor,
    task_id: taskId,
    links,
    protocol: {
      truthStatus: 'human_review_decision',
      recordOwner: 'hapa-overwatch-kanban',
      source: 'human-review-acceptance-gate'
    },
    payload: {
      taskId,
      decision,
      note,
      evidenceHref,
      evidenceLabel,
      targetColumn,
      followupTaskId,
      followupTitle: followupTitle || null
    }
  });
  events.push(decisionEvent);

  events.push(await appendEvent(projectId, {
    type: 'task_comment',
    actor,
    task_id: taskId,
    links,
    protocol: {
      truthStatus: 'human_review_decision',
      recordOwner: 'hapa-overwatch-kanban',
      source: 'human-review-acceptance-gate'
    },
    payload: {
      body: `Review decision: ${decision}. ${note}`,
      reviewDecisionId: decisionEvent.id
    }
  }));

  if (decision === 'promote') {
    const title = followupTitle || `Phase 2 follow-up: ${task.title}`;
    events.push(await appendEvent(projectId, {
      type: 'task_created',
      actor,
      task_id: followupTaskId,
      links,
      protocol: {
        truthStatus: 'human_review_decision',
        recordOwner: 'hapa-overwatch-kanban',
        source: 'human-review-acceptance-gate'
      },
      payload: {
        taskId: followupTaskId,
        title,
        description: `Follow-up created from human review decision on ${taskId}. ${note}`,
        column: 'backlog',
        owner: task.owner || 'Overwatch',
        priority: 'P1',
        node: task.node,
        lane: 'Phase 2 / Review Follow-up',
        tags: ['phase2', 'review-follow-up', taskId],
        acceptance: [
          'Preserve the linked human review decision and evidence.',
          'Do not mutate repositories, services, scenes, prefabs, credentials, or generated asset promotion paths without explicit authority.',
          'Move to review only after verification evidence is appended.'
        ],
        sourceReviewTaskId: taskId,
        reviewDecisionId: decisionEvent.id
      }
    }));
  }

  events.push(await appendEvent(projectId, {
    type: 'task_moved',
    actor,
    task_id: taskId,
    links,
    protocol: {
      truthStatus: 'human_review_decision',
      recordOwner: 'hapa-overwatch-kanban',
      source: 'human-review-acceptance-gate'
    },
    payload: {
      to: targetColumn,
      decision,
      reviewDecisionId: decisionEvent.id
    }
  }));

  events.push(await appendEvent(projectId, {
    type: 'message',
    actor,
    task_id: taskId,
    links,
    protocol: {
      truthStatus: 'human_review_decision',
      recordOwner: 'hapa-overwatch-kanban',
      source: 'human-review-acceptance-gate'
    },
    payload: {
      scope: 'review',
      body: `${taskId}: ${decision} -> ${targetColumn}. ${note}`
    }
  }));

  return {
    taskId,
    decision,
    targetColumn,
    followupTaskId,
    reviewDecisionId: decisionEvent.id,
    events
  };
}

export function normalizeEvent(projectId, input) {
  const type = String(input.type || '').trim();
  if (!EVENT_TYPES.has(type)) {
    throw new Error(`Unsupported event type: ${type || '(empty)'}`);
  }

  const now = new Date().toISOString();
  const actor = String(input.actor || 'Overwatch').trim();
  if (!actor) {
    throw new Error('Event actor is required.');
  }

  const payload = input.payload && typeof input.payload === 'object' && !Array.isArray(input.payload)
    ? input.payload
    : {};

  return {
    id: input.id || `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    project_id: projectId,
    ts: input.ts || now,
    actor,
    type,
    task_id: input.task_id || payload.taskId || null,
    parent_event_id: input.parent_event_id || null,
    visibility: input.visibility || 'project',
    protocol: {
      truthStatus: input.protocol?.truthStatus || payload.truthStatus || 'verified_event',
      recordOwner: input.protocol?.recordOwner || payload.recordOwner || 'hapa-overwatch-kanban',
      source: input.protocol?.source || payload.source || 'operator_entry'
    },
    links: Array.isArray(input.links) ? input.links : [],
    payload
  };
}

export function deriveState(config, events) {
  const columns = config.columns || [];
  const actors = config.actors || [];
  const tasks = new Map();
  const messages = [];
  const checkpoints = [];
  const protocolNotes = [];
  const reviewDecisions = [];
  const eventTypeCounts = {};
  const actorEventCounts = {};

  for (const event of events) {
    eventTypeCounts[event.type] = (eventTypeCounts[event.type] || 0) + 1;
    actorEventCounts[event.actor] = (actorEventCounts[event.actor] || 0) + 1;

    if (event.type === 'task_created') {
      const taskId = event.task_id || event.payload.taskId;
      if (!taskId) continue;
      tasks.set(taskId, {
        id: taskId,
        title: event.payload.title || taskId,
        description: event.payload.description || '',
        column: event.payload.column || columns[0]?.id || 'backlog',
        owner: event.payload.owner || event.actor,
        priority: event.payload.priority || 'P2',
        node: event.payload.node || null,
        lane: event.payload.lane || 'Coordination',
        tags: Array.isArray(event.payload.tags) ? event.payload.tags : [],
        acceptance: Array.isArray(event.payload.acceptance) ? event.payload.acceptance : [],
        createdAt: event.ts,
        updatedAt: event.ts,
        history: [event],
        comments: [],
        blockers: [],
        reviewDecisions: [],
        lastReviewDecision: null
      });
      continue;
    }

    if (event.type === 'message') {
      messages.push({
        id: event.id,
        ts: event.ts,
        actor: event.actor,
        scope: event.payload.scope || 'project',
        body: event.payload.body || event.payload.message || '',
        taskId: event.task_id,
        links: event.links
      });
      continue;
    }

    if (event.type === 'checkpoint') {
      checkpoints.push(event);
      continue;
    }

    if (event.type === 'protocol_note') {
      protocolNotes.push(event);
    }

    const taskId = event.task_id || event.payload.taskId;
    if (!taskId || !tasks.has(taskId)) continue;

    const task = tasks.get(taskId);
    task.updatedAt = event.ts;
    task.history.push(event);

    if (event.type === 'task_updated') {
      for (const field of ['title', 'description', 'priority', 'node', 'lane']) {
        if (event.payload[field] !== undefined) task[field] = event.payload[field];
      }
      if (Array.isArray(event.payload.tags)) task.tags = event.payload.tags;
      if (Array.isArray(event.payload.acceptance)) task.acceptance = event.payload.acceptance;
    }

    if (event.type === 'task_moved') {
      task.column = event.payload.to || event.payload.column || task.column;
    }

    if (event.type === 'task_assigned') {
      task.owner = event.payload.owner || event.payload.to || task.owner;
    }

    if (event.type === 'task_blocked') {
      task.column = 'blocked';
      task.blockers.push({
        id: event.id,
        ts: event.ts,
        actor: event.actor,
        reason: event.payload.reason || 'Blocked without reason.',
        cleared: false
      });
    }

    if (event.type === 'task_unblocked') {
      for (const blocker of task.blockers) blocker.cleared = true;
      task.column = event.payload.nextColumn || 'ready';
    }

    if (event.type === 'task_comment') {
      task.comments.push({
        id: event.id,
        ts: event.ts,
        actor: event.actor,
        body: event.payload.body || event.payload.comment || ''
      });
    }

    if (event.type === 'review_decision') {
      const decision = {
        id: event.id,
        ts: event.ts,
        actor: event.actor,
        decision: event.payload.decision || '',
        note: event.payload.note || '',
        evidenceHref: event.payload.evidenceHref || '',
        evidenceLabel: event.payload.evidenceLabel || 'Review evidence',
        targetColumn: event.payload.targetColumn || REVIEW_DECISION_TARGETS[event.payload.decision] || '',
        followupTaskId: event.payload.followupTaskId || null
      };
      task.reviewDecisions.push(decision);
      task.lastReviewDecision = decision;
      reviewDecisions.push({ taskId, ...decision });
    }
  }

  const tasksList = Array.from(tasks.values()).sort((a, b) => {
    const colA = columns.findIndex((column) => column.id === a.column);
    const colB = columns.findIndex((column) => column.id === b.column);
    if (colA !== colB) return colA - colB;
    return a.createdAt.localeCompare(b.createdAt);
  });

  const columnCounts = {};
  for (const column of columns) columnCounts[column.id] = 0;
  for (const task of tasksList) {
    columnCounts[task.column] = (columnCounts[task.column] || 0) + 1;
  }

  const actorLoad = {};
  for (const actor of actors) {
    actorLoad[actor.id] = {
      id: actor.id,
      label: actor.label,
      color: actor.color,
      activeTasks: 0,
      blockedTasks: 0,
      doneTasks: 0,
      eventCount: actorEventCounts[actor.id] || 0
    };
  }

  for (const task of tasksList) {
    if (!actorLoad[task.owner]) {
      actorLoad[task.owner] = {
        id: task.owner,
        label: task.owner,
        color: '#9aa4b2',
        activeTasks: 0,
        blockedTasks: 0,
        doneTasks: 0,
        eventCount: actorEventCounts[task.owner] || 0
      };
    }
    if (task.column === 'done') actorLoad[task.owner].doneTasks += 1;
    else actorLoad[task.owner].activeTasks += 1;
    if (task.column === 'blocked') actorLoad[task.owner].blockedTasks += 1;
  }

  const doneCount = columnCounts.done || 0;
  const blockedCount = columnCounts.blocked || 0;
  const progress = tasksList.length ? Math.round((doneCount / tasksList.length) * 100) : 0;

  return {
    project: {
      id: config.id,
      name: config.name,
      summary: config.summary,
      protocolVersion: config.protocolVersion
    },
    columns,
    actors,
    protocol: config.protocol,
    tasks: tasksList,
    messages: messages.slice(-80).reverse(),
    checkpoints: checkpoints.slice(-20).reverse(),
    protocolNotes: protocolNotes.slice(-20).reverse(),
    telemetry: {
      ok: blockedCount === 0,
      generatedAt: new Date().toISOString(),
      totalEvents: events.length,
      totalTasks: tasksList.length,
      columnCounts,
      eventTypeCounts,
      actorLoad: Object.values(actorLoad),
      blockedCount,
      doneCount,
      reviewDecisionCount: reviewDecisions.length,
      progress,
      lastEvent: events.at(-1) || null
    },
    reviewGate: {
      decisions: Array.from(REVIEW_DECISIONS),
      targets: REVIEW_DECISION_TARGETS,
      reviewTasks: tasksList.filter((task) => task.column === 'review').map((task) => ({
        id: task.id,
        title: task.title,
        owner: task.owner,
        priority: task.priority,
        riskTags: task.tags
      })),
      decisionCount: reviewDecisions.length,
      recentDecisions: reviewDecisions.slice(-20).reverse()
    }
  };
}

export async function getProjectState(projectId = DEFAULT_PROJECT_ID) {
  const config = await readProjectConfig(projectId);
  const events = await readEvents(projectId);
  return deriveState(config, events);
}

export async function smoke(projectId = DEFAULT_PROJECT_ID) {
  const started = Date.now();
  const config = await readProjectConfig(projectId);
  const events = await readEvents(projectId);
  const state = deriveState(config, events);

  const checks = [
    {
      name: 'config_loaded',
      ok: Boolean(config.id && config.columns?.length && config.actors?.length),
      data: { project_id: config.id }
    },
    {
      name: 'events_parse',
      ok: events.length > 0,
      data: { events: events.length }
    },
    {
      name: 'board_projection',
      ok: state.tasks.length > 0 && state.columns.length > 0,
      data: { tasks: state.tasks.length, columns: state.columns.length }
    },
    {
      name: 'telemetry_projection',
      ok: typeof state.telemetry.progress === 'number',
      data: { progress: state.telemetry.progress, blocked: state.telemetry.blockedCount }
    },
    {
      name: 'review_gate_projection',
      ok: Array.isArray(state.reviewGate.reviewTasks) && state.reviewGate.decisions.length === 4,
      data: {
        reviewTasks: state.reviewGate.reviewTasks.length,
        decisions: state.reviewGate.decisions
      }
    }
  ];

  return {
    ok: checks.every((check) => check.ok),
    run_id: `overwatch_smoke_${Date.now()}`,
    duration_seconds: Number(((Date.now() - started) / 1000).toFixed(3)),
    steps_results: checks.map((check) => ({
      ...check,
      duration_seconds: 0,
      error: check.ok ? null : 'check failed'
    })),
    tasks: state.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      column: task.column,
      owner: task.owner
    })),
    downloads: [],
    provenance: {
      project_id: projectId,
      record_owner: 'hapa-overwatch-kanban',
      event_log: projectEventsPath(projectId)
    }
  };
}

function slugify(value) {
  const base = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72);
  return base || `review-follow-up-${Date.now().toString(36)}`;
}
