#!/usr/bin/env node
import {
  appendReviewDecision,
  appendEvent,
  DEFAULT_PROJECT_ID,
  getProjectState,
  listProjects,
  readEvents,
  smoke
} from '../src/overwatch-core.mjs';

const args = process.argv.slice(2);
const command = args[0] || 'help';

try {
  if (command === 'help' || command === '--help' || command === '-h') {
    print({
      ok: true,
      usage: [
        'node bin/overwatch-kanban.mjs projects',
        'node bin/overwatch-kanban.mjs state [project_id]',
        'node bin/overwatch-kanban.mjs events [project_id]',
        'node bin/overwatch-kanban.mjs telemetry [project_id]',
        'node bin/overwatch-kanban.mjs message <actor> <body> [project_id]',
        'node bin/overwatch-kanban.mjs move <task_id> <column> <actor> [project_id]',
        'node bin/overwatch-kanban.mjs review <task_id> <accept|revise|promote|defer> <actor> <note> <evidence_href> [project_id] [followup_title]',
        'node bin/overwatch-kanban.mjs block <task_id> <actor> <reason> [project_id]',
        'node bin/overwatch-kanban.mjs unblock <task_id> <actor> [next_column] [project_id]',
        'node bin/overwatch-kanban.mjs smoke [project_id]'
      ]
    });
    process.exit(0);
  }

  if (command === 'projects') {
    print({ ok: true, projects: await listProjects() });
    process.exit(0);
  }

  if (command === 'state') {
    const projectId = args[1] || DEFAULT_PROJECT_ID;
    print({ ok: true, state: await getProjectState(projectId) });
    process.exit(0);
  }

  if (command === 'events') {
    const projectId = args[1] || DEFAULT_PROJECT_ID;
    print({ ok: true, events: await readEvents(projectId) });
    process.exit(0);
  }

  if (command === 'telemetry') {
    const projectId = args[1] || DEFAULT_PROJECT_ID;
    const state = await getProjectState(projectId);
    print({ ok: true, telemetry: state.telemetry });
    process.exit(0);
  }

  if (command === 'message') {
    const [actor, body, projectId = DEFAULT_PROJECT_ID] = args.slice(1);
    requireArg(actor, 'actor');
    requireArg(body, 'body');
    print({
      ok: true,
      event: await appendEvent(projectId, {
        type: 'message',
        actor,
        payload: { scope: 'project', body }
      })
    });
    process.exit(0);
  }

  if (command === 'move') {
    const [taskId, column, actor = 'Overwatch', projectId = DEFAULT_PROJECT_ID] = args.slice(1);
    requireArg(taskId, 'task_id');
    requireArg(column, 'column');
    print({
      ok: true,
      event: await appendEvent(projectId, {
        type: 'task_moved',
        actor,
        task_id: taskId,
        payload: { to: column }
      })
    });
    process.exit(0);
  }

  if (command === 'review') {
    const [taskId, decision, actor = 'Human', note, evidenceHref, projectId = DEFAULT_PROJECT_ID, ...followupTitleParts] = args.slice(1);
    requireArg(taskId, 'task_id');
    requireArg(decision, 'decision');
    requireArg(note, 'note');
    requireArg(evidenceHref, 'evidence_href');
    print({
      ok: true,
      result: await appendReviewDecision(projectId, {
        taskId,
        decision,
        actor,
        note,
        evidenceHref,
        followupTitle: followupTitleParts.join(' ').trim()
      })
    });
    process.exit(0);
  }

  if (command === 'block') {
    const [taskId, actor = 'Overwatch', reason = 'Blocked.', projectId = DEFAULT_PROJECT_ID] = args.slice(1);
    requireArg(taskId, 'task_id');
    print({
      ok: true,
      event: await appendEvent(projectId, {
        type: 'task_blocked',
        actor,
        task_id: taskId,
        payload: { reason }
      })
    });
    process.exit(0);
  }

  if (command === 'unblock') {
    const [taskId, actor = 'Overwatch', nextColumn = 'ready', projectId = DEFAULT_PROJECT_ID] = args.slice(1);
    requireArg(taskId, 'task_id');
    print({
      ok: true,
      event: await appendEvent(projectId, {
        type: 'task_unblocked',
        actor,
        task_id: taskId,
        payload: { nextColumn }
      })
    });
    process.exit(0);
  }

  if (command === 'smoke') {
    const projectId = args[1] || DEFAULT_PROJECT_ID;
    const report = await smoke(projectId);
    print(report);
    process.exit(report.ok ? 0 : 1);
  }

  throw new Error(`Unknown command: ${command}`);
} catch (error) {
  print({ ok: false, error: error.message });
  process.exit(1);
}

function requireArg(value, name) {
  if (!value) throw new Error(`${name} is required`);
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
