#!/usr/bin/env node
import { getProjectState } from '../src/overwatch-core.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUTPUT_MD = path.join(PROJECT_ROOT, 'hapa-mvp-demo-notes/PHASE4_REVIEW_BURN_DOWN_DECISION_WORKBENCH_REPORT.md');
const OUTPUT_JSON = path.join(PROJECT_ROOT, 'hapa-mvp-demo-notes/phase4_review_burn_down_decision_workbench.json');
const WIKI_COPY = '/Users/calderwong/Desktop/Hapa_Worldbuilding_Wiki/Operations/Black Horizon Review Burn Down Decision Workbench.md';
const TASK_ID = 'phase4-review-burn-down-decision-workbench';

const args = process.argv.slice(2);
const check = args.includes('--check');
const existing = check ? await readExistingJson(OUTPUT_JSON) : null;
const state = await getProjectState('hapa-black-horizon-mvp');
const generatedAt = existing?.generatedAt || new Date().toISOString();
const document = buildDocument(state, generatedAt);
const markdown = renderMarkdown(document);
const jsonText = `${JSON.stringify(document, null, 2)}\n`;

if (check) {
  const [actualMd, actualJson, actualWiki] = await Promise.all([
    fs.readFile(OUTPUT_MD, 'utf8').catch(() => null),
    fs.readFile(OUTPUT_JSON, 'utf8').catch(() => null),
    fs.readFile(WIKI_COPY, 'utf8').catch(() => null)
  ]);
  const failures = [];
  if (actualMd !== markdown) failures.push(`mismatch ${OUTPUT_MD}`);
  if (actualJson !== jsonText) failures.push(`mismatch ${OUTPUT_JSON}`);
  if (actualWiki !== markdown) failures.push(`mismatch ${WIKI_COPY}`);
  if (document.summary.reviewDecisionEventsWrittenByThisPass !== 0) failures.push('review decisions were written by this pass');
  if (document.reviewRows.some((row) => !row.noteStarter || row.evidence.length === 0)) {
    failures.push('every current review recommendation must have evidence and a note starter');
  }
  if (failures.length) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    process.exit(1);
  }
  console.log('verification ok: phase4 review burn-down decision workbench outputs match generator output');
  process.exit(0);
}

await fs.mkdir(path.dirname(OUTPUT_MD), { recursive: true });
await fs.mkdir(path.dirname(WIKI_COPY), { recursive: true });
await Promise.all([
  fs.writeFile(OUTPUT_MD, markdown, 'utf8'),
  fs.writeFile(OUTPUT_JSON, jsonText, 'utf8'),
  fs.writeFile(WIKI_COPY, markdown, 'utf8')
]);

console.log(`phase4 review burn-down decision workbench ok: review=${document.summary.reviewCards}, evidence=${document.summary.evidenceLinkedReviewCards}, lanes=${document.lanes.length}, decisions=0`);

function buildDocument(boardState, generatedAtValue) {
  const reviewTasks = boardState.tasks.filter((task) => task.column === 'review');
  const rows = reviewTasks.map((task) => summarizeTask(task));
  const progressQueue = boardState.tasks
    .filter((task) => ['ready', 'in-progress', 'backlog'].includes(task.column))
    .sort(comparePullOrder)
    .slice(0, 12)
    .map((task) => ({
      id: task.id,
      title: task.title,
      column: task.column,
      priority: task.priority,
      owner: task.owner,
      lane: task.lane,
      authorityRelated: classifyTask(task) === 'authority'
    }));

  return {
    schemaVersion: 'hapa.black_horizon.phase4_review_burndown_decision_workbench.v0.1',
    generatedAt: generatedAtValue,
    taskId: TASK_ID,
    truthStatus: 'read_only_review_burndown_workbench',
    boardSnapshot: {
      events: boardState.telemetry.totalEvents,
      tasks: boardState.tasks.length,
      done: boardState.telemetry.columnCounts.done || 0,
      review: reviewTasks.length,
      ready: boardState.telemetry.columnCounts.ready || 0,
      inProgress: boardState.telemetry.columnCounts['in-progress'] || boardState.telemetry.columnCounts.in_progress || 0,
      backlog: boardState.telemetry.columnCounts.backlog || 0,
      blocked: boardState.telemetry.columnCounts.blocked || 0
    },
    summary: {
      reviewCards: reviewTasks.length,
      evidenceLinkedReviewCards: rows.filter((row) => row.evidence.length > 0).length,
      highRiskReviewCards: rows.filter((row) => row.risk === 'high').length,
      mediumRiskReviewCards: rows.filter((row) => row.risk === 'medium').length,
      lowRiskReviewCards: rows.filter((row) => row.risk === 'low').length,
      readyCards: boardState.telemetry.columnCounts.ready || 0,
      backlogCards: boardState.telemetry.columnCounts.backlog || 0,
      authorityQueueCards: boardState.tasks.filter((task) => ['ready', 'in-progress', 'backlog', 'review'].includes(task.column) && classifyTask(task) === 'authority').length,
      reviewDecisionEventsWrittenByThisPass: 0
    },
    lanes: laneDefinitions().map((lane) => ({
      ...lane,
      count: rows.filter((row) => row.laneId === lane.id).length
    })),
    proofBuckets: ['linked', 'partial', 'missing'].map((bucket) => ({
      id: bucket,
      count: rows.filter((row) => row.proofStrength === bucket).length
    })),
    decisionPaths: ['Accept after boundary skim', 'Accept after device proof', 'Accept after spot-check', 'Accept after evidence skim', 'Revise or defer'].map((pathLabel) => ({
      id: pathLabel.toLowerCase().replaceAll(' ', '-'),
      label: pathLabel,
      count: rows.filter((row) => row.recommendedDecisionPath === pathLabel).length
    })),
    topHumanChecks: [...rows].sort(compareReviewRows).slice(0, 12),
    reviewRows: rows,
    progressQueue,
    uiContract: [
      'Render review lane counts, proof buckets, recommended decision paths, evidence links, and note starters beside the existing Review Decision form.',
      'When the review queue is light, show the next ready/backlog pull queue so the surface stays useful after burn-down.',
      'Gate buttons only select a card in the existing human Review Gate form.',
      'The workbench does not call the review API, move review cards, or accept decisions.'
    ],
    safety: {
      reviewAutoAcceptance: false,
      reviewDecisionEventsWritten: 0,
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
  const proofStrength = evidence.length >= 2 ? 'linked' : evidence.length === 1 ? 'partial' : 'missing';
  return {
    id: task.id,
    title: task.title,
    priority: task.priority,
    owner: task.owner,
    lane: task.lane,
    laneId,
    laneLabel: laneDefinitions().find((lane) => lane.id === laneId)?.label || 'Review',
    risk: riskForTask(task, laneId),
    proofStrength,
    evidence,
    recommendedDecisionPath: recommendedDecisionPath(task, laneId, proofStrength),
    noteStarter: noteStarter(task, laneId, proofStrength),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt
  };
}

function laneDefinitions() {
  return [
    { id: 'authority', label: 'Authority Gated', humanAction: 'Confirm evidence, rollback/redaction notes, and authority boundary before accepting.' },
    { id: 'device', label: 'Device Evidence', humanAction: 'Spot-check device artifacts before accepting device-specific claims.' },
    { id: 'visual', label: 'Live / Visual Check', humanAction: 'Run or inspect the live visual surface before accepting.' },
    { id: 'evidence', label: 'Evidence Skim', humanAction: 'Skim generated/read-only proof and accept if it supports the card.' },
    { id: 'missing', label: 'Evidence Needed', humanAction: 'Revise or defer until a concrete evidence link is attached.' }
  ];
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
  if (matchesAny(text, ['promotion', 'promote', 'canon', 'janus', 'anvil', 'lance', 'asset kit', 'prefab', 'authority', 'credential', 'ledger'])) return 'authority';
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

function recommendedDecisionPath(task, laneId, proofStrength) {
  if (proofStrength === 'missing') return 'Revise or defer';
  if (laneId === 'authority') return 'Accept after boundary skim';
  if (laneId === 'device') return 'Accept after device proof';
  if (laneId === 'visual') return 'Accept after spot-check';
  return 'Accept after evidence skim';
}

function noteStarter(task, laneId, proofStrength) {
  if (proofStrength === 'missing') return `Revise or defer ${task.id} until a concrete evidence link is attached.`;
  if (laneId === 'authority') return 'Reviewed authority boundary, evidence, rollback/redaction notes, and confirmed acceptance does not itself execute promotion or mutation.';
  if (laneId === 'device') return 'Reviewed physical device/LAN evidence and confirmed the claim is limited to the artifacts attached.';
  if (laneId === 'visual') return 'Spot-checked the linked live/visual proof and confirmed the screen state matches the acceptance claim.';
  return 'Skimmed the linked generated/read-only proof and confirmed the card is ready to accept without authority expansion.';
}

function compareReviewRows(a, b) {
  const laneWeight = { authority: 0, device: 1, visual: 2, missing: 3, evidence: 4 };
  const priorityWeight = { P0: 0, P1: 1, P2: 2, P3: 3 };
  const laneDelta = laneWeight[a.laneId] - laneWeight[b.laneId];
  if (laneDelta) return laneDelta;
  const priorityDelta = (priorityWeight[a.priority] ?? 9) - (priorityWeight[b.priority] ?? 9);
  if (priorityDelta) return priorityDelta;
  return a.createdAt.localeCompare(b.createdAt);
}

function comparePullOrder(a, b) {
  const columnWeight = { ready: 0, 'in-progress': 1, backlog: 2 };
  const priorityWeight = { P0: 0, P1: 1, P2: 2, P3: 3 };
  const columnDelta = (columnWeight[a.column] ?? 9) - (columnWeight[b.column] ?? 9);
  if (columnDelta) return columnDelta;
  const priorityDelta = (priorityWeight[a.priority] ?? 9) - (priorityWeight[b.priority] ?? 9);
  if (priorityDelta) return priorityDelta;
  const authorityDelta = Number(classifyTask(b) === 'authority') - Number(classifyTask(a) === 'authority');
  if (authorityDelta) return authorityDelta;
  return a.createdAt.localeCompare(b.createdAt);
}

function renderMarkdown(doc) {
  return [
    '# Phase 4 Review Burn-Down Decision Workbench Report',
    '',
    `Date: ${doc.generatedAt.slice(0, 10)}`,
    'Owner: Overwatch',
    `Task: \`${doc.taskId}\``,
    '',
    '## Result',
    '',
    'The Overwatch board now has a read-only decision workbench that adapts to the post-review phase. It groups current review cards by risk, proof strength, and recommended decision path, while also showing the next ready/backlog pull queue when review pressure is low.',
    '',
    '## Board Snapshot',
    '',
    '```json',
    JSON.stringify(doc.boardSnapshot, null, 2),
    '```',
    '',
    '## Review Lanes',
    '',
    renderLaneTable(doc.lanes),
    '',
    '## Proof Buckets',
    '',
    renderSimpleTable(doc.proofBuckets, 'Proof'),
    '',
    '## Decision Paths',
    '',
    renderDecisionTable(doc.decisionPaths),
    '',
    '## Top Human Checks',
    '',
    renderCandidateTable(doc.topHumanChecks),
    '',
    '## Next Pull Queue',
    '',
    renderProgressTable(doc.progressQueue),
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
    'No review decisions were executed by this pass.',
    ''
  ].join('\n');
}

function renderLaneTable(lanes) {
  const lines = ['| Lane | Count | Human Action |', '| --- | ---: | --- |'];
  for (const lane of lanes) {
    lines.push(`| ${lane.label} | ${lane.count} | ${lane.humanAction} |`);
  }
  return lines.join('\n');
}

function renderSimpleTable(items, label) {
  const lines = [`| ${label} | Count |`, '| --- | ---: |'];
  for (const item of items) lines.push(`| ${item.id} | ${item.count} |`);
  return lines.join('\n');
}

function renderDecisionTable(items) {
  const lines = ['| Recommended Path | Count |', '| --- | ---: |'];
  for (const item of items) lines.push(`| ${item.label} | ${item.count} |`);
  return lines.join('\n');
}

function renderCandidateTable(rows) {
  if (!rows.length) return 'No review cards are waiting.';
  const lines = ['| Card | Priority | Owner | Lane | Risk | Proof | Evidence | Note starter |', '| --- | --- | --- | --- | --- | --- | --- | --- |'];
  for (const row of rows) {
    const evidence = row.evidence.map((link) => `[${link.label}](${link.href})`).join('<br>');
    lines.push(`| \`${row.id}\`<br>${row.title} | ${row.priority} | ${row.owner} | ${row.laneLabel} | ${row.risk} | ${row.proofStrength} | ${evidence} | ${row.noteStarter} |`);
  }
  return lines.join('\n');
}

function renderProgressTable(rows) {
  if (!rows.length) return 'No ready or backlog cards are waiting.';
  const lines = ['| Card | Column | Priority | Owner | Lane | Authority Related |', '| --- | --- | --- | --- | --- | --- |'];
  for (const row of rows) {
    lines.push(`| \`${row.id}\`<br>${row.title} | ${row.column} | ${row.priority} | ${row.owner} | ${row.lane || ''} | ${row.authorityRelated ? 'yes' : 'no'} |`);
  }
  return lines.join('\n');
}

async function readExistingJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}
