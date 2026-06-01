#!/usr/bin/env node
import { getProjectState } from '../src/overwatch-core.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUTPUT_MD = path.join(PROJECT_ROOT, 'hapa-mvp-demo-notes/PHASE3_REVIEW_ACCEPTANCE_SESSION_PACK.md');
const OUTPUT_JSON = path.join(PROJECT_ROOT, 'hapa-mvp-demo-notes/phase3_review_acceptance_session_pack.json');
const SESSION_PACK_TASK_ID = 'phase3-review-acceptance-session-pack';

const args = process.argv.slice(2);
const check = args.includes('--check');

const QUICK_ACCEPT = new Set([
  'unity-full-smoke-refresh',
  'live-node-runtime-state',
  'room-panel-schema',
  'ship-card-definition-schema',
  'build-recipe-validator',
  'module-library-metadata',
  'crew-duty-replay-model',
  'promotion-confirmation-protocol',
  'promotion-dry-run-command',
  'crew-avatar-identity-linkage',
  'live-node-telemetry-refresh-loop',
  'first-real-readonly-node-duty',
  'operational-room-panels-phase1',
  'repo-to-ship-stat-tuning-v1',
  'stat-profile-node-card-detail',
  'node-interior-room-map-tier1',
  'phase1-human-review-triage',
  'phase2-human-review-acceptance-gate',
  'phase2-lore-wiki-second-brain-sync',
  'phase2-real-node-capability-ingest',
  'phase2-consul-decision-node-mechanics',
  'phase2-operator-onboarding-ten-minute-lore',
]);

const FOLLOWUP_MAP = {
  'phone-deck-tier0': ['phase3-phone-playtest-runbook'],
  'phone-qr-pairing': ['phase3-phone-playtest-runbook'],
  'phone-deck-orientation-tier1': ['phase3-phone-playtest-runbook'],
  'phone-motion-6dof-proof': ['phase3-phone-playtest-runbook', 'phase2-physical-phone-playtest'],
  'game-match-layer': ['phase3-match-loop-v2-playability-pass'],
  'match-proposal-selection': ['phase3-match-loop-v2-playability-pass'],
  'phase2-black-horizon-match-loop-v1': ['phase3-match-loop-v2-playability-pass'],
  'builder-review-console': ['phase3-unity-generated-data-hub'],
  'phase2-janus-world-state-bridge': ['phase3-janus-world-state-readonly-handshake'],
  'phase2-hapa-card-anvil-lance-export': ['phase3-anvil-lance-card-review-import-plan'],
  'phase2-demo-video-capture': ['phase3-onboarding-content-pack-v2'],
  'phase2-ship-interior-art-pass': ['phase3-runtime-interior-cockpit-pass', 'phase3-asset-kit-promotion-protocol'],
  'phase2-procedural-fleet-builder-v2': ['phase3-unity-generated-data-hub', 'phase3-asset-kit-promotion-protocol'],
};

const SPOT_CHECK = new Set([
  'phase0-demo-package',
  'demo-capture-refresh',
  'overwatch-event-bridge',
  'telemetry-readonly-duty',
  'black-horizon-canon-scene-alpha',
  'orbit-epic-clock',
  'websocket-command-bridge',
  'first-real-room-panel',
  'canon-scene-alpha-upgrade',
  'phase1-demo-capture-pack-v2',
]);

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

function classify(task) {
  const followups = FOLLOWUP_MAP[task.id] || [];
  if (followups.length) {
    return {
      batch: 'accept_with_existing_followup',
      batchLabel: 'Accept And Keep Existing Phase 3 Follow-Up',
      recommendedDecision: 'accept',
      risk: followups.some((item) => item.includes('phone') || item.includes('asset') || item.includes('janus')) ? 'high' : 'medium',
      proofStrength: 'strong',
      followups,
      spotCheck: 'Confirm the linked report/proof exists, then keep the listed Phase 3 follow-up for productization.',
    };
  }
  if (QUICK_ACCEPT.has(task.id)) {
    return {
      batch: 'quick_accept',
      batchLabel: 'Quick Accept After Evidence Skim',
      recommendedDecision: 'accept',
      risk: 'low',
      proofStrength: 'strong',
      followups: [],
      spotCheck: 'Skim evidence link, confirm no authority expansion, then accept if it matches the report.',
    };
  }
  if (SPOT_CHECK.has(task.id)) {
    return {
      batch: 'accept_after_spot_check',
      batchLabel: 'Accept After Live/Visual Spot-Check',
      recommendedDecision: 'accept',
      risk: 'medium',
      proofStrength: 'medium',
      followups: [],
      spotCheck: 'Run or visually inspect the named UI/Unity/demo proof before accepting.',
    };
  }
  return {
    batch: 'accept_after_spot_check',
    batchLabel: 'Accept After Live/Visual Spot-Check',
    recommendedDecision: 'accept',
    risk: task.priority === 'P0' ? 'medium' : 'low',
    proofStrength: 'medium',
    followups: [],
    spotCheck: 'Confirm the latest evidence and safety boundary before accepting.',
  };
}

function suggestedNote(task, classification) {
  if (classification.batch === 'accept_with_existing_followup') {
    return `Accepted as review-ready proof; productization continues through existing follow-up ${classification.followups.join(', ')}.`;
  }
  if (classification.batch === 'quick_accept') {
    return 'Accepted after evidence skim; proof is generated/read-only/proposal-safe and no authority expansion is approved.';
  }
  return 'Accepted after spot-check; live/visual proof matched the review evidence and no authority expansion is approved.';
}

function markdownLink(link) {
  return `[${link.label}](${link.href.includes(' ') ? `<${link.href}>` : link.href})`;
}

function renderTable(rows) {
  const lines = [
    '| Card | Priority | Risk | Proof | Suggested Gate | Evidence | Human note starter |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const row of rows) {
    const evidence = row.evidence.length ? row.evidence.map(markdownLink).join('<br>') : 'No direct link found; inspect card history.';
    lines.push(`| \`${row.id}\`<br>${row.title} | ${row.priority || ''} | ${row.risk} | ${row.proofStrength} | \`${row.recommendedDecision}\` | ${evidence} | ${row.note} |`);
  }
  return lines.join('\n');
}

function renderMarkdown(document) {
  const batches = document.batches;
  const lines = [
    '# Phase 3 Review Acceptance Session Pack',
    '',
    `Date: ${document.generatedAt.slice(0, 10)}`,
    'Owner: Overwatch',
    'Status: Review-ready decision workbook',
    '',
    '## Purpose',
    '',
    'This pack turns the current review queue into a human decision session. It proposes an order and note starters for Review Gate decisions, but it does not execute any accept/revise/promote/defer action.',
    '',
    '## Board Snapshot',
    '',
    '```json',
    JSON.stringify(document.boardSnapshot),
    '```',
    '',
    '## Session Agenda',
    '',
    '1. Open the board and confirm the snapshot still matches.',
    '2. Review the Review Gate rule: every decision needs a human actor, note, and evidence link.',
    '3. Process Quick Accept cards first. These are low-risk generated/read-only/protocol proofs.',
    '4. Process Live/Visual Spot-Check cards next. These need a quick UI, Unity, browser, or demo proof glance.',
    '5. Process Accept With Existing Follow-Up cards last. Accept the proof only if satisfied; the Phase 3 backlog already carries productization follow-ups.',
    '6. Leave `phase2-physical-phone-playtest` blocked until a real phone/LAN pass exists.',
    '',
    '## Decision Summary',
    '',
    '| Batch | Count | Suggested decision | Human action |',
    '| --- | ---: | --- | --- |',
    `| Quick Accept After Evidence Skim | ${batches.quick_accept.length} | \`accept\` | Skim evidence and safety boundary. |`,
    `| Accept After Live/Visual Spot-Check | ${batches.accept_after_spot_check.length} | \`accept\` if spot-check passes, otherwise \`revise\` | Run the named quick check. |`,
    `| Accept And Keep Existing Phase 3 Follow-Up | ${batches.accept_with_existing_followup.length} | \`accept\` | Avoid duplicate \`promote\` unless a new follow-up is needed. |`,
    '| Physical Phone Hardware | 1 | blocked, not review | Keep blocked until real device test. |',
    '',
    '## Revision Triggers',
    '',
    '- Use `revise` if an evidence link is missing, stale, or does not support the card.',
    '- Use `revise` if a claimed Unity/browser/phone proof cannot be reproduced during spot-check.',
    '- Use `revise` if safety language implies repo, service, credential, prefab, persistent scene, canon, or generated asset authority that was not explicitly approved.',
    '- Use `defer` if the card is still useful but the human does not want to decide it in this session.',
    '- Use `promote` only when the human wants the Review Gate to create a new follow-up. Many productization follow-ups already exist in Phase 3.',
    '',
    '## Quick Accept After Evidence Skim',
    '',
    renderTable(batches.quick_accept),
    '',
    '## Accept After Live/Visual Spot-Check',
    '',
    renderTable(batches.accept_after_spot_check),
    '',
    '## Accept And Keep Existing Phase 3 Follow-Up',
    '',
    renderTable(batches.accept_with_existing_followup),
    '',
    '## Blocked Hardware Card',
    '',
    '- `phase2-physical-phone-playtest`: keep blocked until a human physical phone/LAN device pass exists. Do not accept simulator proof as this card.',
    '',
    '## Review Gate Command Shape',
    '',
    'Do not run these automatically. They are here so a human can copy the shape once a card is actually reviewed.',
    '',
    '```bash',
    'node hapa-overwatch-kanban/bin/overwatch-kanban.mjs review <task_id> accept Human "<human note>" "<evidence_href>"',
    'node hapa-overwatch-kanban/bin/overwatch-kanban.mjs review <task_id> revise Human "<human note>" "<evidence_href>"',
    'node hapa-overwatch-kanban/bin/overwatch-kanban.mjs review <task_id> defer Human "<human note>" "<evidence_href>"',
    '```',
    '',
    '## Safety Boundary',
    '',
    '- This pack does not move review cards to done.',
    '- This pack does not create review decisions.',
    '- This pack does not mutate repos, services, credentials, Unity scenes, prefabs, generated assets, or canon.',
    '- This pack is a decision aid for a human Review Gate session.',
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function countByBatch(rows) {
  return rows.reduce((acc, row) => {
    acc[row.batch] = (acc[row.batch] || 0) + 1;
    return acc;
  }, {});
}

const state = await getProjectState();
const existing = check ? await readExistingJson(OUTPUT_JSON) : null;
const generatedAt = existing?.generatedAt || new Date().toISOString();
const eventCount = existing?.boardSnapshot?.events ?? state.telemetry.totalEvents;
const reviewTasks = state.tasks.filter((task) => task.column === 'review' && task.id !== SESSION_PACK_TASK_ID);
const rows = existing
  ? [
      ...(existing.batches?.quick_accept || []),
      ...(existing.batches?.accept_after_spot_check || []),
      ...(existing.batches?.accept_with_existing_followup || []),
    ]
  : reviewTasks.map((task) => {
  const classification = classify(task);
  return {
    id: task.id,
    title: task.title,
    priority: task.priority,
    owner: task.owner,
    lane: task.lane,
    tags: task.tags || [],
    evidence: latestEvidence(task),
    note: suggestedNote(task, classification),
    ...classification,
  };
});
const batches = existing?.batches || {
  quick_accept: rows.filter((row) => row.batch === 'quick_accept'),
  accept_after_spot_check: rows.filter((row) => row.batch === 'accept_after_spot_check'),
  accept_with_existing_followup: rows.filter((row) => row.batch === 'accept_with_existing_followup'),
};
const document = {
  schemaVersion: 'hapa.black_horizon.review_acceptance_session_pack.v0.1',
  generatedAt,
  truthStatus: 'review_session_decision_aid',
  boardSnapshot: existing?.boardSnapshot || {
    events: eventCount,
    tasks: state.tasks.length,
    review: reviewTasks.length,
    ready: state.tasks.filter((task) => task.column === 'ready').length,
    backlog: state.tasks.filter((task) => task.column === 'backlog').length,
    blocked: state.tasks.filter((task) => task.column === 'blocked').length,
    reviewCardsAutoAccepted: 0,
    reviewDecisionsExecuted: 0,
  },
  summary: existing?.summary || {
    reviewCards: reviewTasks.length,
    batchCounts: countByBatch(rows),
    suggestedAccepts: rows.filter((row) => row.recommendedDecision === 'accept').length,
    suggestedRevises: 0,
    suggestedPromotes: 0,
    suggestedDefers: 0,
    blockedHardwareCards: ['phase2-physical-phone-playtest'],
    reviewDecisionsExecuted: 0,
    authorityMutationEnabled: false,
  },
  batches,
};

const markdown = renderMarkdown(document);
const jsonText = `${JSON.stringify(document, null, 2)}\n`;

if (check) {
  const [actualMd, actualJson] = await Promise.all([
    fs.readFile(OUTPUT_MD, 'utf8').catch(() => null),
    fs.readFile(OUTPUT_JSON, 'utf8').catch(() => null),
  ]);
  const failures = [];
  if (actualMd !== markdown) failures.push(`mismatch ${OUTPUT_MD}`);
  if (actualJson !== jsonText) failures.push(`mismatch ${OUTPUT_JSON}`);
  if (failures.length) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    process.exit(1);
  }
  console.log('verification ok: review acceptance session pack outputs match generator output');
  process.exit(0);
}

await fs.mkdir(path.dirname(OUTPUT_MD), { recursive: true });
await Promise.all([
  fs.writeFile(OUTPUT_MD, markdown, 'utf8'),
  fs.writeFile(OUTPUT_JSON, jsonText, 'utf8'),
]);
console.log(`review acceptance session pack ok: review=${reviewTasks.length}, quick=${batches.quick_accept.length}, spot=${batches.accept_after_spot_check.length}, followup=${batches.accept_with_existing_followup.length}, decisions=0`);

async function readExistingJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}
