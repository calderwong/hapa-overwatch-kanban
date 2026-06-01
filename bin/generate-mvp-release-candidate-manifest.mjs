#!/usr/bin/env node
import { getProjectState } from '../src/overwatch-core.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUTPUT_MD = path.join(PROJECT_ROOT, 'hapa-mvp-demo-notes/BLACK_HORIZON_MVP_RELEASE_CANDIDATE_MANIFEST.md');
const OUTPUT_JSON = path.join(PROJECT_ROOT, 'hapa-mvp-demo-notes/black_horizon_mvp_release_candidate_manifest.json');

const args = process.argv.slice(2);
const check = args.includes('--check');

const files = {
  nextSteps: 'HAPA_BLACK_HORIZON_MVP_NEXT_STEPS.md',
  nextTasks: 'HAPA_BLACK_HORIZON_MVP_NEXT_TASKS.md',
  fullSmoke: 'hapa-mvp-demo-notes/FULL_SMOKE_REFRESH_REPORT.md',
  reviewGate: 'hapa-mvp-demo-notes/HUMAN_REVIEW_ACCEPTANCE_GATE_REPORT.md',
  reviewPack: 'hapa-mvp-demo-notes/PHASE3_REVIEW_ACCEPTANCE_SESSION_PACK.md',
  reviewPackJson: 'hapa-mvp-demo-notes/phase3_review_acceptance_session_pack.json',
  fleetManifest: 'hapa-fleet-compiler/fleet_manifest.json',
  shipCards: 'hapa-fleet-compiler/ship_cards_draft.json',
  runtimeState: 'hapa-fleet-compiler/node_runtime_state.json',
  roomPanels: 'hapa-fleet-compiler/room_panel_presets.json',
  crewReplay: 'hapa-fleet-compiler/crew_duty_replay.json',
  gameMatchLayer: 'hapa-fleet-compiler/game_match_layer.json',
  matchLoop: 'hapa-fleet-compiler/black_horizon_match_loop_v1.json',
  janusBridge: 'hapa-fleet-compiler/janus_world_state_bridge.json',
  anvilLanceManifest: 'hapa-fleet-compiler/anvil_lance_card_export/manifest.json',
  proceduralBuilder: 'hapa-fleet-compiler/procedural_fleet_builder_v2.json',
  interiorArt: 'hapa-fleet-compiler/interior_art_pass_v1.json',
  consul: 'hapa-fleet-compiler/consul_decision_node_mechanics_v1.json',
  onboarding: 'hapa-fleet-compiler/operator_onboarding_ten_minute_lore_v1.json',
  videoReport: 'hapa-mvp-demo-notes/PHASE2_REFERENCE_DEMO_VIDEO_CAPTURE.md',
  videoMp4: 'hapa-mvp-demo-notes/black-horizon-reference-video/renders/black-horizon-reference-video.mp4',
  phoneMotion: 'hapa-mvp-demo-notes/PHONE_MOTION_6DOF_PROOF_REPORT.md',
  phoneQr: 'hapa-mvp-demo-notes/PHONE_QR_PAIRING_REPORT.md',
  phoneOrientation: 'hapa-mvp-demo-notes/PHONE_DECK_ORIENTATION_TIER1_REPORT.md',
  nodeCardStats: 'hapa-mvp-demo-notes/STAT_PROFILE_NODE_CARD_DETAIL_REPORT.md',
  roomMap: 'hapa-mvp-demo-notes/NODE_INTERIOR_ROOM_MAP_TIER1_REPORT.md',
  operationalPanels: 'hapa-mvp-demo-notes/OPERATIONAL_ROOM_PANELS_PHASE1_REPORT.md',
  phase3PostMortem: 'hapa-mvp-demo-notes/PHASE3_ARCHITECT_POST_MORTEM_AND_BACKLOG_REFILL_2026-05-30.md',
  protocol: 'hapa-overwatch-kanban/docs/OVERWATCH_KANBAN_PROTOCOL.md',
};

function abs(relPath) {
  return path.join(PROJECT_ROOT, relPath);
}

async function readJson(relPath) {
  return JSON.parse(await fs.readFile(abs(relPath), 'utf8'));
}

function link(label, relPath) {
  return { label, href: abs(relPath), exists: null };
}

function mdLink(item) {
  const href = item.href.includes(' ') ? `<${item.href}>` : item.href;
  return `[${item.label}](${href})`;
}

function count(value) {
  return Array.isArray(value) ? value.length : 0;
}

function truthBadge(status) {
  return `\`${status}\``;
}

function renderClaimTable(claims, evidenceById) {
  const rows = [
    '| Claim | Truth Lane | Current Claim | Caveat | Evidence |',
    '| --- | --- | --- | --- | --- |',
  ];
  for (const claim of claims) {
    const evidence = claim.evidence
      .map((id) => evidenceById[id])
      .filter(Boolean)
      .map(mdLink)
      .join('<br>');
    rows.push(`| ${claim.title} | ${truthBadge(claim.truthLane)} | ${claim.currentClaim} | ${claim.caveat} | ${evidence} |`);
  }
  return rows.join('\n');
}

function renderEvidenceCatalog(evidence) {
  const rows = [
    '| ID | Type | Evidence | Truth Lane |',
    '| --- | --- | --- | --- |',
  ];
  for (const item of evidence) {
    rows.push(`| \`${item.id}\` | ${item.type} | ${mdLink(item)} | ${truthBadge(item.truthLane)} |`);
  }
  return rows.join('\n');
}

async function withExistence(evidence) {
  return Promise.all(evidence.map(async (item) => {
    try {
      await fs.access(item.href);
      return { ...item, exists: true };
    } catch {
      return { ...item, exists: false };
    }
  }));
}

function renderMarkdown(doc) {
  const evidenceById = Object.fromEntries(doc.evidence.map((item) => [item.id, item]));
  const lines = [
    '# Black Horizon MVP Release-Candidate Manifest',
    '',
    `Date: ${doc.generatedAt.slice(0, 10)}`,
    'Owner: Overwatch',
    `Status: ${doc.releaseStatus}`,
    '',
    '## Purpose',
    '',
    'This manifest states what the current Black Horizon MVP can truthfully claim, where the proof lives, and what remains proposal-only, review-gated, or blocked. It is a release-candidate evidence map, not a human acceptance decision.',
    '',
    '## Board Snapshot',
    '',
    '```json',
    JSON.stringify(doc.boardSnapshot),
    '```',
    '',
    '## Summary',
    '',
    `- Fleet nodes compiled: \`${doc.summary.fleetNodeCount}\`.`,
    `- Draft ship cards generated: \`${doc.summary.shipCardCount}\`.`,
    `- Runtime-state nodes observed: \`${doc.summary.runtimeNodeCount}\`.`,
    `- Review cards waiting for Human Review Gate: \`${doc.summary.reviewCardsTotal}\`.`,
    `- Review cards inside the generated decision workbook: \`${doc.summary.reviewCardsInDecisionWorkbook}\`.`,
    `- Backlog remaining after this card started: \`${doc.summary.backlogRemaining}\`.`,
    `- Blocked hardware cards: ${doc.summary.blockedHardwareCards.map((id) => `\`${id}\``).join(', ') || 'none'}.`,
    `- Mutation authority enabled: \`${doc.summary.mutationAuthorityEnabled}\`.`,
    '',
    '## Truth Lanes',
    '',
    '| Lane | Meaning | Release Handling |',
    '| --- | --- | --- |',
    '| `verified_runtime` | Unity/browser/board/generator proof exists and is safe to show as implemented prototype behavior. | Can be demoed as MVP proof, still pending human acceptance where card is in review. |',
    '| `generated_proposal` | Generated data, dry-runs, staging packages, or proposal-only match/world/card state. | Can be shown as design/protocol proof, not as live authority. |',
    '| `lore_frame` | Story, onboarding, canon framing, and operator language. | Can explain the product, but does not grant runtime/canon authority. |',
    '| `future_authority` | Requires explicit human authorization before real service, asset, canon, repo, prefab, scene, or credential mutation. | Must stay out of release claims until accepted. |',
    '| `blocked` | Waiting on real external proof, hardware, or human action. | Must be labeled as blocked. |',
    '',
    '## Release Candidate Claim Matrix',
    '',
    renderClaimTable(doc.claims, evidenceById),
    '',
    '## Evidence Catalog',
    '',
    renderEvidenceCatalog(doc.evidence),
    '',
    '## Explicit Non-Claims',
    '',
    ...doc.nonClaims.map((item) => `- ${item}`),
    '',
    '## Human Acceptance Path',
    '',
    '1. Use the Review Acceptance Session Pack to process existing review cards.',
    '2. Accept only cards that pass evidence review and human judgment.',
    '3. Keep proposal-only artifacts out of canon/live authority until their import or promotion protocol is accepted.',
    '4. Keep physical phone proof blocked until a real device/LAN test is run.',
    '5. Treat this manifest as the release-candidate evidence index for that review, not as the review decision itself.',
    '',
    '## Safety Boundary',
    '',
    ...doc.safety.map((item) => `- ${item}`),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

const [
  state,
  fleet,
  shipCards,
  runtimeState,
  reviewPack,
  janus,
  matchLoop,
  procedural,
  anvilLance,
  onboarding,
  crewReplay,
  roomPanels,
  interiorArt,
  consul,
] = await Promise.all([
  getProjectState(),
  readJson(files.fleetManifest),
  readJson(files.shipCards),
  readJson(files.runtimeState),
  readJson(files.reviewPackJson),
  readJson(files.janusBridge),
  readJson(files.matchLoop),
  readJson(files.proceduralBuilder),
  readJson(files.anvilLanceManifest),
  readJson(files.onboarding),
  readJson(files.crewReplay),
  readJson(files.roomPanels),
  readJson(files.interiorArt),
  readJson(files.consul),
]);

const existing = check ? await readExistingJson(OUTPUT_JSON) : null;
const boardSnapshot = existing?.boardSnapshot || {
  events: state.telemetry.totalEvents,
  tasks: state.tasks.length,
  done: state.telemetry.columnCounts.done ?? 0,
  review: state.telemetry.columnCounts.review ?? 0,
  ready: state.telemetry.columnCounts.ready ?? 0,
  backlog: state.telemetry.columnCounts.backlog ?? 0,
  blocked: state.telemetry.columnCounts.blocked ?? 0,
  reviewDecisionCount: state.reviewGate.decisionCount,
};

const evidence = await withExistence([
  { id: 'next_steps', type: 'status_doc', truthLane: 'verified_runtime', ...link('Hapa Black Horizon MVP next steps', files.nextSteps) },
  { id: 'next_tasks', type: 'status_doc', truthLane: 'verified_runtime', ...link('Hapa Black Horizon MVP next tasks', files.nextTasks) },
  { id: 'full_smoke', type: 'smoke_report', truthLane: 'verified_runtime', ...link('Full smoke refresh report', files.fullSmoke) },
  { id: 'fleet_manifest', type: 'generated_data', truthLane: 'verified_runtime', ...link('Fleet manifest JSON', files.fleetManifest) },
  { id: 'ship_cards', type: 'generated_data', truthLane: 'verified_runtime', ...link('Draft ship cards JSON', files.shipCards) },
  { id: 'runtime_state', type: 'generated_data', truthLane: 'verified_runtime', ...link('Runtime state JSON', files.runtimeState) },
  { id: 'node_card_stats', type: 'report', truthLane: 'verified_runtime', ...link('Stat-profile node-card report', files.nodeCardStats) },
  { id: 'room_map', type: 'report', truthLane: 'verified_runtime', ...link('Node interior room-map report', files.roomMap) },
  { id: 'operational_panels', type: 'report', truthLane: 'verified_runtime', ...link('Operational room panels report', files.operationalPanels) },
  { id: 'review_gate', type: 'protocol_report', truthLane: 'verified_runtime', ...link('Human Review Acceptance Gate report', files.reviewGate) },
  { id: 'review_pack', type: 'decision_workbook', truthLane: 'verified_runtime', ...link('Phase 3 review acceptance session pack', files.reviewPack) },
  { id: 'janus_bridge', type: 'generated_data', truthLane: 'generated_proposal', ...link('Janus world-state bridge JSON', files.janusBridge) },
  { id: 'anvil_lance', type: 'staging_package', truthLane: 'generated_proposal', ...link('Anvil/Lance export manifest', files.anvilLanceManifest) },
  { id: 'match_loop', type: 'generated_data', truthLane: 'generated_proposal', ...link('Black Horizon match loop v1 JSON', files.matchLoop) },
  { id: 'procedural_builder', type: 'generated_data', truthLane: 'generated_proposal', ...link('Procedural fleet builder v2 JSON', files.proceduralBuilder) },
  { id: 'interior_art', type: 'generated_data', truthLane: 'generated_proposal', ...link('Interior art pass JSON', files.interiorArt) },
  { id: 'crew_replay', type: 'generated_data', truthLane: 'verified_runtime', ...link('Crew duty replay JSON', files.crewReplay) },
  { id: 'phone_motion', type: 'browser_bridge_report', truthLane: 'verified_runtime', ...link('Phone motion and 6DOF proof report', files.phoneMotion) },
  { id: 'phone_qr', type: 'browser_bridge_report', truthLane: 'verified_runtime', ...link('Phone QR pairing report', files.phoneQr) },
  { id: 'phone_orientation', type: 'browser_bridge_report', truthLane: 'verified_runtime', ...link('Phone orientation report', files.phoneOrientation) },
  { id: 'video_report', type: 'reference_video_report', truthLane: 'generated_proposal', ...link('Phase 2 reference demo video report', files.videoReport) },
  { id: 'video_mp4', type: 'reference_video', truthLane: 'generated_proposal', ...link('Rendered reference demo MP4', files.videoMp4) },
  { id: 'onboarding', type: 'lore_onboarding', truthLane: 'lore_frame', ...link('Operator onboarding JSON', files.onboarding) },
  { id: 'consul', type: 'lore_mechanics', truthLane: 'lore_frame', ...link('Consul mechanics JSON', files.consul) },
  { id: 'protocol', type: 'protocol_doc', truthLane: 'verified_runtime', ...link('Overwatch Kanban protocol', files.protocol) },
  { id: 'phase3_post_mortem', type: 'planning_doc', truthLane: 'future_authority', ...link('Phase 3 architect post-mortem', files.phase3PostMortem) },
]);

const claims = [
  {
    id: 'repo_to_ship_loop',
    title: 'Repository-to-ship loop exists',
    truthLane: 'verified_runtime',
    currentClaim: `${count(fleet.nodes)} Hapa repositories compile into ${count(shipCards.cards)} draft ship cards and runtime-readable ship data.`,
    caveat: 'Human Review Gate has not accepted the review queue yet.',
    evidence: ['fleet_manifest', 'ship_cards', 'node_card_stats', 'full_smoke'],
  },
  {
    id: 'unity_operating_fleet',
    title: 'Unity Operating Fleet Alpha is demoable',
    truthLane: 'verified_runtime',
    currentClaim: 'Unity smoke verifies 10 visible ships, the two-black-hole/two-station/artifact scene, epic clock, telemetry panels, room panels, and input bridge acceptance.',
    caveat: 'Proof is smoke/report based; persistent scene/prefab promotion remains gated.',
    evidence: ['full_smoke', 'room_map', 'operational_panels'],
  },
  {
    id: 'runtime_state',
    title: 'Runtime state is read-only and source-labeled',
    truthLane: 'verified_runtime',
    currentClaim: `${count(runtimeState.nodes)} runtime nodes include read-only refresh policy, repo observations, service endpoint observations, and safe duties.`,
    caveat: 'Service health is loopback/unauthenticated only; no credentials or service starts.',
    evidence: ['runtime_state', 'full_smoke'],
  },
  {
    id: 'control_surfaces',
    title: 'Local, phone, and WebSocket controls have safe proof',
    truthLane: 'verified_runtime',
    currentClaim: 'Phone deck, QR pairing, orientation modes, motion envelope, and WebSocket command routing are browser/bridge verified.',
    caveat: 'Physical phone/LAN playtest remains blocked and must not be claimed as done.',
    evidence: ['phone_qr', 'phone_orientation', 'phone_motion', 'full_smoke'],
  },
  {
    id: 'review_spine',
    title: 'Append-only review and coordination spine exists',
    truthLane: 'verified_runtime',
    currentClaim: `Board has ${boardSnapshot.events} append-only events, ${boardSnapshot.tasks} tasks, and a Review Gate with accept/revise/promote/defer outcomes.`,
    caveat: `${boardSnapshot.review} cards are still waiting for human Review Gate decisions.`,
    evidence: ['review_gate', 'review_pack', 'protocol', 'next_tasks'],
  },
  {
    id: 'janus_world_state',
    title: 'Janus world-state route is staged',
    truthLane: 'generated_proposal',
    currentClaim: `${janus.summary.commandCount} Janus-compatible commands and ${janus.summary.nodeSnapshotCount} node snapshots are generated as read-only proposal data.`,
    caveat: 'Live Janus ingest and credential use are not authorized.',
    evidence: ['janus_bridge'],
  },
  {
    id: 'anvil_lance_cards',
    title: 'Anvil/Lance card export is staged',
    truthLane: 'generated_proposal',
    currentClaim: `${anvilLance.exportCardCount} draft cards are staged for Anvil/Lance review/import paths.`,
    caveat: `Cards remain ${anvilLance.reviewState} and ${anvilLance.canonState}.`,
    evidence: ['anvil_lance', 'ship_cards'],
  },
  {
    id: 'match_loop',
    title: 'Playable match loop exists as proposal state',
    truthLane: 'generated_proposal',
    currentClaim: `${count(matchLoop.stateSnapshots)} match snapshots and ${count(matchLoop.availableCommands)} safe commands prove start, proposal-card play, orbit/resource advance, and pause-for-review.`,
    caveat: 'Match effects do not mutate canon fleet, Unity scene, repos, services, credentials, or generated assets.',
    evidence: ['match_loop'],
  },
  {
    id: 'builder_loop',
    title: 'Procedural builder loop has preview authority only',
    truthLane: 'generated_proposal',
    currentClaim: `${procedural.summary.generatedVariantCount} valid generated variants and ${procedural.summary.invalidControlCount} invalid controls are represented for non-persistent preview.`,
    caveat: 'Prefab writes, persistent scene mutation, and generated asset promotion are disabled.',
    evidence: ['procedural_builder', 'interior_art'],
  },
  {
    id: 'crew_and_lore',
    title: 'Crew, Consul, and onboarding are framed for humans',
    truthLane: 'lore_frame',
    currentClaim: `${crewReplay.summary.nodeCount} ships have crew replay records; onboarding has ${onboarding.summary.segmentCount} beats and Consul mechanics model ${consul.summary.seatCount} seats.`,
    caveat: 'Lore and onboarding explain the system; they do not grant operating authority.',
    evidence: ['crew_replay', 'onboarding', 'consul'],
  },
  {
    id: 'reference_video',
    title: 'Reference video exists for content and review',
    truthLane: 'generated_proposal',
    currentClaim: 'A caption-driven reference MP4 exists to explain the MVP and safety boundaries.',
    caveat: 'It is generated reference content, not a substitute for live runtime acceptance.',
    evidence: ['video_report', 'video_mp4'],
  },
  {
    id: 'phase3_backlog',
    title: 'Next authority work is identified',
    truthLane: 'future_authority',
    currentClaim: 'Phase 3 backlog focuses release packaging, Unity data hub, Janus handshake, Anvil/Lance import, phone playtest, match feel, interiors, asset promotion, telemetry, and ADRs.',
    caveat: 'These are planned follow-ups, not current release claims.',
    evidence: ['phase3_post_mortem', 'next_steps'],
  },
];

const missingEvidence = evidence.filter((item) => !item.exists);
const document = {
  schemaVersion: 'hapa.black_horizon.mvp_release_candidate_manifest.v0.1',
  generatedAt: existing?.generatedAt || new Date().toISOString(),
  releaseStatus: 'RC-0 evidence package, human acceptance pending',
  truthStatus: 'release_candidate_manifest',
  boardSnapshot,
  summary: {
    fleetNodeCount: count(fleet.nodes),
    shipCardCount: count(shipCards.cards),
    runtimeNodeCount: count(runtimeState.nodes),
    reviewCardsTotal: boardSnapshot.review,
    reviewCardsInDecisionWorkbook: reviewPack.summary.reviewCards,
    backlogRemaining: boardSnapshot.backlog,
    blockedHardwareCards: ['phase2-physical-phone-playtest'],
    mutationAuthorityEnabled: false,
    evidenceCount: evidence.length,
    missingEvidenceCount: missingEvidence.length,
  },
  claims,
  evidence,
  nonClaims: [
    'No review card has been accepted by this manifest.',
    'No live Janus store ingest, credential read, or live service mutation is claimed.',
    'No Anvil/Lance dataset, service, or canon card import is claimed.',
    'No physical phone/LAN playtest is claimed.',
    'No purchased Unity asset kit promotion, prefab write, or persistent scene mutation is claimed.',
    'No repository mutation, destructive cleanup, or generated asset promotion is claimed.',
  ],
  safety: [
    'Review cards still require explicit Human Review Gate decisions.',
    'Generated proposal artifacts remain below runtime/canon/service authority.',
    'Credential access, service mutation, repo mutation, prefab writes, persistent Unity scene mutation, and generated asset promotion remain disabled.',
    'Blocked hardware proof stays blocked until a human runs a physical phone/LAN pass.',
  ],
  checks: {
    missingEvidence,
    pass: missingEvidence.length === 0,
  },
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
  if (!document.checks.pass) failures.push(`missing evidence: ${missingEvidence.map((item) => item.id).join(', ')}`);
  if (failures.length) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    process.exit(1);
  }
  console.log('verification ok: release-candidate manifest outputs match generator output');
  process.exit(0);
}

await fs.mkdir(path.dirname(OUTPUT_MD), { recursive: true });
await Promise.all([
  fs.writeFile(OUTPUT_MD, markdown, 'utf8'),
  fs.writeFile(OUTPUT_JSON, jsonText, 'utf8'),
]);
console.log(`release-candidate manifest ok: claims=${claims.length}, evidence=${evidence.length}, missing=${missingEvidence.length}, review=${document.boardSnapshot.review}, backlog=${document.boardSnapshot.backlog}`);

async function readExistingJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}
