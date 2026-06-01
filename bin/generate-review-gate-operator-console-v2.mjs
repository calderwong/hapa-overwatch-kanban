#!/usr/bin/env node
import { getProjectState } from '../src/overwatch-core.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUTPUT_MD = path.join(PROJECT_ROOT, 'hapa-mvp-demo-notes/PHASE3B_REVIEW_GATE_OPERATOR_CONSOLE_V2_REPORT.md');
const OUTPUT_JSON = path.join(PROJECT_ROOT, 'hapa-mvp-demo-notes/phase3b_review_gate_operator_console_v2.json');
const TASK_ID = 'phase3b-review-gate-operator-console-v2';

const args = process.argv.slice(2);
const check = args.includes('--check');

const LANE_DEFINITIONS = [
  {
    id: 'authority',
    label: 'Authority Gated',
    prompt: 'Promotion, canon, Janus, Anvil, Lance, assets',
    humanAction: 'Confirm the evidence and keep all authority expansion disabled unless explicitly approved.'
  },
  {
    id: 'device',
    label: 'Device Evidence',
    prompt: 'Phone, LAN, QR, sensor, 6DOF proof',
    humanAction: 'Spot-check physical-device artifacts before accepting device-specific claims.'
  },
  {
    id: 'visual',
    label: 'Live / Visual Check',
    prompt: 'Unity, demo, browser, scene, interior proof',
    humanAction: 'Run or inspect the live surface named by the card before accepting.'
  },
  {
    id: 'evidence',
    label: 'Evidence Skim',
    prompt: 'Generated/read-only proof review',
    humanAction: 'Skim linked artifacts and accept only if the report supports the card.'
  },
  {
    id: 'missing',
    label: 'Evidence Needed',
    prompt: 'No linked artifact found in history',
    humanAction: 'Revise or defer until a concrete evidence link is attached.'
  }
];

const LANE_WEIGHT = Object.fromEntries(LANE_DEFINITIONS.map((lane, index) => [lane.id, index]));
const PRIORITY_WEIGHT = { P0: 0, P1: 1, P2: 2, P3: 3 };

const existing = check ? await readExistingJson(OUTPUT_JSON) : null;
const state = await getProjectState();
const generatedAt = existing?.generatedAt || new Date().toISOString();
const document = existing || buildDocument(state, generatedAt);
const markdown = renderMarkdown(document);
const jsonText = `${JSON.stringify(document, null, 2)}\n`;

if (check) {
  const [actualMd, actualJson] = await Promise.all([
    fs.readFile(OUTPUT_MD, 'utf8').catch(() => null),
    fs.readFile(OUTPUT_JSON, 'utf8').catch(() => null)
  ]);
  const failures = [];
  if (actualMd !== markdown) failures.push(`mismatch ${OUTPUT_MD}`);
  if (actualJson !== jsonText) failures.push(`mismatch ${OUTPUT_JSON}`);
  if (failures.length) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    process.exit(1);
  }
  console.log('verification ok: review gate operator console v2 outputs match generator output');
  process.exit(0);
}

await fs.mkdir(path.dirname(OUTPUT_MD), { recursive: true });
await Promise.all([
  fs.writeFile(OUTPUT_MD, markdown, 'utf8'),
  fs.writeFile(OUTPUT_JSON, jsonText, 'utf8')
]);

console.log(`review gate operator console v2 ok: review=${document.boardSnapshot.review}, lanes=${document.lanes.length}, candidates=${document.topCandidates.length}, decisions=0`);

function buildDocument(boardState, generatedAtValue) {
  const reviewTasks = boardState.tasks.filter((task) => task.column === 'review');
  const rows = reviewTasks.map((task) => summarizeTask(task));
  const lanes = LANE_DEFINITIONS.map((lane) => ({
    ...lane,
    count: rows.filter((row) => row.laneId === lane.id).length
  }));
  const topCandidates = [...rows]
    .sort((a, b) => {
      const laneDelta = LANE_WEIGHT[a.laneId] - LANE_WEIGHT[b.laneId];
      if (laneDelta) return laneDelta;
      const priorityDelta = (PRIORITY_WEIGHT[a.priority] ?? 9) - (PRIORITY_WEIGHT[b.priority] ?? 9);
      if (priorityDelta) return priorityDelta;
      return a.createdAt.localeCompare(b.createdAt);
    })
    .slice(0, 12);

  return {
    schemaVersion: 'hapa.black_horizon.review_gate_operator_console.v0.1',
    generatedAt: generatedAtValue,
    taskId: TASK_ID,
    truthStatus: 'read_only_review_triage_console',
    boardSnapshot: {
      events: boardState.telemetry.totalEvents,
      tasks: boardState.tasks.length,
      done: boardState.telemetry.columnCounts.done || 0,
      review: reviewTasks.length,
      ready: boardState.telemetry.columnCounts.ready || 0,
      inProgress: boardState.telemetry.columnCounts.in_progress || 0,
      backlog: boardState.telemetry.columnCounts.backlog || 0,
      blocked: boardState.telemetry.columnCounts.blocked || 0,
      reviewDecisionsExecutedByThisPass: 0
    },
    summary: {
      reviewCards: reviewTasks.length,
      evidenceLinkedReviewCards: rows.filter((row) => row.evidence.length > 0).length,
      highRiskReviewCards: rows.filter((row) => row.risk === 'high').length,
      mediumRiskReviewCards: rows.filter((row) => row.risk === 'medium').length,
      lowRiskReviewCards: rows.filter((row) => row.risk === 'low').length,
      backlogCards: boardState.telemetry.columnCounts.backlog || 0,
      readyCards: boardState.telemetry.columnCounts.ready || 0,
      reviewAutoAcceptEnabled: false,
      reviewDecisionsExecuted: 0
    },
    lanes,
    topCandidates,
    allReviewRows: rows,
    uiContract: [
      'Render lane counts and top candidates beside the existing Review Decision form.',
      'Gate buttons only select a card in the existing human Review Gate form.',
      'The console does not call the review API, move review cards, or accept decisions.',
      'Every actual decision still requires a human actor, evidence link, and note.'
    ],
    safety: {
      reviewAutoAcceptance: false,
      repoMutation: false,
      serviceMutation: false,
      credentialAccess: false,
      prefabWrites: false,
      persistentSceneMutation: false,
      canonPromotion: false,
      generatedAssetPromotion: false
    }
  };
}

function summarizeTask(task) {
  const laneId = classifyTask(task);
  const evidence = latestEvidence(task);
  return {
    id: task.id,
    title: task.title,
    priority: task.priority,
    owner: task.owner,
    lane: task.lane,
    laneId,
    laneLabel: LANE_DEFINITIONS.find((lane) => lane.id === laneId)?.label || 'Review',
    risk: riskForTask(task, laneId),
    evidence,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    recommendedGate: laneId === 'missing' ? 'revise_or_defer' : 'human_review_required',
    noteStarter: noteStarter(task, laneId, evidence)
  };
}

function classifyTask(task) {
  const text = [
    task.id,
    task.title,
    task.description,
    task.lane,
    ...(task.tags || []),
    ...(task.acceptance || [])
  ].join(' ').toLowerCase();
  if (matchesAny(text, ['promotion', 'promote', 'canon', 'janus', 'anvil', 'lance', 'asset kit', 'prefab', 'authority', 'credential'])) return 'authority';
  if (matchesAny(text, ['phone', '6dof', 'motion', 'qr', 'lan', 'device', 'sensor', 'pairing'])) return 'device';
  if (matchesAny(text, ['unity', 'scene', 'interior', 'focus', 'demo', 'video', 'screenshot', 'browser', 'visual', 'cockpit'])) return 'visual';
  if (latestEvidence(task).length === 0) return 'missing';
  return 'evidence';
}

function matchesAny(value, needles) {
  return needles.some((needle) => value.includes(needle));
}

function riskForTask(task, laneId) {
  if (laneId === 'authority' || laneId === 'device') return 'high';
  if (laneId === 'visual' || task.priority === 'P0') return 'medium';
  return 'low';
}

function latestEvidence(task) {
  const seen = new Set();
  const links = [];
  for (const event of [...(task.history || [])].reverse()) {
    for (const link of event.links || []) {
      if (!link.href || seen.has(link.href)) continue;
      seen.add(link.href);
      links.push({ label: link.label || 'Evidence', href: link.href });
      if (links.length >= 3) return links;
    }
  }
  return links;
}

function noteStarter(task, laneId, evidence) {
  if (laneId === 'missing') return 'Revise or defer until a concrete evidence link is attached.';
  if (laneId === 'authority') return 'Reviewed authority boundary and evidence; no promotion or mutation authority is granted by this acceptance.';
  if (laneId === 'device') return 'Reviewed device/LAN evidence; accept only if the physical-device proof is sufficient for this card.';
  if (laneId === 'visual') return 'Spot-checked the live/visual proof and confirmed it matches the linked evidence.';
  return evidence.length
    ? 'Skimmed the linked read-only/generated proof and confirmed no authority expansion.'
    : `Evidence link needed before deciding ${task.id}.`;
}

function renderMarkdown(doc) {
  return [
    '# Phase 3B Review Gate Operator Console V2 Report',
    '',
    `Date: ${doc.generatedAt.slice(0, 10)}`,
    'Owner: Overwatch',
    `Task: \`${doc.taskId}\``,
    '',
    '## Result',
    '',
    'The Overwatch board now has a read-only Review Gate operator console beside the existing human Review Decision form. It summarizes review pressure, sorts cards into human decision lanes, and lets an operator select a card for the form without executing any decision.',
    '',
    '## Board Snapshot',
    '',
    '```json',
    JSON.stringify(doc.boardSnapshot, null, 2),
    '```',
    '',
    '## Console Lanes',
    '',
    renderLaneTable(doc.lanes),
    '',
    '## Top Human Checks',
    '',
    renderCandidateTable(doc.topCandidates),
    '',
    '## UI Contract',
    '',
    ...doc.uiContract.map((item) => `- ${item}`),
    '',
    '## Safety',
    '',
    '```json',
    JSON.stringify(doc.safety, null, 2),
    '```',
    '',
    'No review cards were accepted, promoted, deferred, or revised by this pass. The console is a triage surface only; human Review Gate remains the acceptance authority.',
    ''
  ].join('\n');
}

function renderLaneTable(lanes) {
  const lines = [
    '| Lane | Count | Human Action |',
    '| --- | ---: | --- |'
  ];
  for (const lane of lanes) {
    lines.push(`| ${escapeMarkdown(lane.label)} | ${lane.count} | ${escapeMarkdown(lane.humanAction)} |`);
  }
  return lines.join('\n');
}

function renderCandidateTable(rows) {
  const lines = [
    '| Card | Priority | Owner | Lane | Risk | Evidence | Note starter |',
    '| --- | --- | --- | --- | --- | --- | --- |'
  ];
  for (const row of rows) {
    const evidence = row.evidence.length ? row.evidence.map(markdownLink).join('<br>') : 'No direct link found';
    lines.push(`| \`${row.id}\`<br>${escapeMarkdown(row.title)} | ${row.priority || ''} | ${row.owner || ''} | ${escapeMarkdown(row.laneLabel)} | ${row.risk} | ${evidence} | ${escapeMarkdown(row.noteStarter)} |`);
  }
  return lines.join('\n');
}

function markdownLink(link) {
  const href = link.href.includes(' ') ? `<${link.href}>` : link.href;
  return `[${escapeMarkdown(link.label)}](${href})`;
}

function escapeMarkdown(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

async function readExistingJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}
