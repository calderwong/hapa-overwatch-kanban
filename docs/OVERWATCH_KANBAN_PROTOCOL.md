# Overwatch Kanban Protocol

Status: prototype protocol

Date: 2026-05-30

## Purpose

The Overwatch Kanban protocol gives Hapa projects a reusable coordination surface where humans and Codex agents can track work, blockers, handoffs, communications, and telemetry without losing provenance.

The protocol treats coordination as a replayable event stream:

- Love connects the work to context, people, and benefit.
- Truth records the exact event and its source.
- Conviction moves the card, resolves the block, ships the work, and leaves a lineage trail.

## Source Of Truth

The canonical record is the append-only NDJSON event log:

```text
data/<project-id>/events.ndjson
```

The UI, API state endpoint, CLI summaries, telemetry panels, and future visualizations are projections from that event log.

## Required For Hapa App Builds

Every Hapa app build should create a project-scoped Overwatch Kanban before broad implementation begins. This applies to Unity scenes, Electron apps, FastAPI/Node services, local MLX agents, wiki viewers, dashboards, and node wrappers.

Minimum registration:

- Create `config/projects/<project-id>.json`.
- Create `seed/<project-id>.events.ndjson`.
- Add a board reference and writeback rule to the owning app's `AGENTS.md`.
- Advertise the board in the owning app manifest when one exists.
- Append implementation progress, blockers, handoffs, and verification evidence as events.

The first Unity proof is `hapa-black-horizon-mvp`. The Qwen MLX proof is `qwen-creative-writer-agent`.

## Hapa Source Truth Hierarchy

1. Live source and endpoints.
2. Wiki canon.
3. `.Overwatch` operations evidence.
4. Node Space/front-door routing.
5. Second Brain retrieval and enrichment.

When a board event refers to real repo or Unity state, the agent should inspect the live source first and label any unverified claim as inference.

## Event Types

- `task_created`: creates a card.
- `task_updated`: edits card metadata.
- `task_moved`: moves a card across columns.
- `task_assigned`: changes owner.
- `task_blocked`: marks a card blocked and records why.
- `task_unblocked`: clears blockers and returns a card to a chosen column.
- `task_comment`: appends task-local context.
- `review_decision`: records a required human-note/evidence-linked decision for a review card.
- `message`: appends project communication.
- `checkpoint`: records an integration or review summary.
- `telemetry`: records observation data.
- `protocol_note`: records a protocol decision, warning, or operating note.

## Route Script

`Human -> Overwatch Kanban [UI]`: The user or project lead creates a card, posts a decision, or reviews a checkpoint.

`Codex Avatar -> Overwatch Kanban [CLI|API]`: Blue, Red, Green, or Overwatch appends progress, blocks, moves, and handoffs.

`Overwatch Kanban -> Event Log [DATA]`: The event is appended as NDJSON. It is never rewritten as mutable board state.

`Event Log -> Board Projection [API]`: The server folds the event stream into current cards, columns, messages, and telemetry.

`Board Projection -> Human/Agents [UI|CLI]`: The UI and CLI expose the same state, so humans and agents see the same coordination record.

`Checkpoint -> Second Brain/Wiki/Overwatch [DATA]`: Important milestones can later be promoted into durable docs, flow explainers, or status reports.

## Record Rule

- Event log owns coordination facts.
- Owning node repos own implementation facts.
- Unity owns scene/runtime facts.
- Wiki owns canon/protocol explanations after human review.
- Second Brain owns enrichment and retrieval.
- Overwatch owns cross-agent status and handoff evidence.

## Safety Rules

- Do not use the Kanban app to perform destructive repo, Unity, or credential actions.
- Do not claim a task is done unless the verification command or review note is recorded.
- Do not move a review card to done through the UI without a Review Gate decision.
- Blocks must include a reason.
- Generated or inferred status must be labeled.
- Secrets must not be placed in frontend state, messages, or event payloads.

## Human Review Gate

Review cards use a dedicated decision path instead of the normal `Done` button. The gate requires:

- a review card currently in the `review` column,
- a decision: `accept`, `revise`, `promote`, or `defer`,
- a human reviewer/actor,
- a human note,
- an evidence link.

Decision outcomes:

- `accept`: records the decision and moves the reviewed card to `done`.
- `revise`: records the decision and moves the card back to `ready`.
- `promote`: records the decision, moves the reviewed card to `done`, and creates a Phase 2 follow-up in `backlog`.
- `defer`: records the decision and moves the card to `backlog`.

The gate is an append-only coordination mechanism. It does not accept cards in batches, mutate repositories, write Unity scenes or prefabs, run services, touch credentials, or promote generated assets.

## Human Authorization Grant Pattern

When the project owner explicitly grants broader authority, Overwatch must preserve the grant as evidence before crossing gates.

Rules:

1. Record the human grant in markdown and JSON evidence files.
2. Link the grant from any Review Gate decisions or authority-crossing checkpoints.
3. Keep secrets out of logs, frontend state, generated reports, and committed artifacts.
4. Prefer read-only checks before writes.
5. Keep work scoped to the authorized project/assets.
6. Preserve rollback notes for dataset writes, prefab/scene writes, canon promotion, and generated asset promotion.
7. Destructive cleanup and external paid actions still require separate explicit requests.
8. Verification remains required before completion.

Current Black Horizon proof:

- [HUMAN_AUTHORIZATION_GRANT_2026-05-31.md](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/HUMAN_AUTHORIZATION_GRANT_2026-05-31.md)
- [human_authorization_grant_2026_05_31.json](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/human_authorization_grant_2026_05_31.json)

The 2026-05-31 Black Horizon grant accepted the then-current `72` review cards and authorized scoped credential access, live service calls, dataset writes, Unity prefab writes, Unity persistent scene writes, canon promotion, and generated asset promotion.

The first authority-aware architecture pass after the grant is:

- [PHASE4B_AUTHORITY_ARCHITECTURE_PASS_2026-05-31.md](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/PHASE4B_AUTHORITY_ARCHITECTURE_PASS_2026-05-31.md)
- [phase4b_authority_architecture_backlog_2026_05_31.json](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/phase4b_authority_architecture_backlog_2026_05_31.json)

It created `12` backlog cards for authority operation ledgering, secret redaction, live service pilots, Unity persistence, dataset/canon/generated-asset promotion, phone confirmations, and rollback discipline. Board proof after refill: `106` tasks, `82` done, `0` review, `4` ready, `20` backlog, `843` events, and `0` blocked.

## Review Acceptance Session Pack Pattern

When the board becomes review-heavy, agents may create a decision workbook, but the workbook is not a Review Gate decision.

Rules:

1. Group review cards by decision type, risk, proof strength, and existing follow-up coverage.
2. Include evidence links and note starters so a human can make faster `accept`, `revise`, `promote`, or `defer` decisions.
3. Do not execute review decisions from the pack.
4. Do not batch-accept cards, move review cards to done, or claim human acceptance.
5. Keep hardware/device blockers blocked unless a real device pass exists.
6. Preserve the safety boundary: no repo/service/credential/prefab/persistent scene/generated asset promotion without explicit human authority.

Current Black Horizon proof:

- [PHASE3_REVIEW_ACCEPTANCE_SESSION_PACK_REPORT.md](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/PHASE3_REVIEW_ACCEPTANCE_SESSION_PACK_REPORT.md)
- [PHASE3_REVIEW_ACCEPTANCE_SESSION_PACK.md](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/PHASE3_REVIEW_ACCEPTANCE_SESSION_PACK.md)
- [phase3_review_acceptance_session_pack.json](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/phase3_review_acceptance_session_pack.json)

## Phase Refill Pattern

When a phase drains safe ready/backlog work, Overwatch may define the next phase and refill the board as append-only planning events.

Rules:

1. Run a post-mortem against current docs, board state, generated data, and known human feedback.
2. Name the phase goal in one short phrase and describe what acceptance means.
3. Add cards as `task_created` events only; do not rewrite board state.
4. Keep review cards in review unless a human uses the Review Gate.
5. Split cards into ready work that agents can safely start and backlog work that depends on human/device/authority context.
6. File a markdown report and, when useful, a machine-readable JSON sidecar with the card list.
7. Append a checkpoint with created-card count, board counts, and safety boundaries.
8. Refresh telemetry/status docs after the refill.

Current Black Horizon proof:

- [PHASE4_POST_MORTEM_AND_BACKLOG_REFILL_2026-05-31.md](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/PHASE4_POST_MORTEM_AND_BACKLOG_REFILL_2026-05-31.md)
- [phase4_backlog_refill_2026_05_31.json](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/phase4_backlog_refill_2026_05_31.json)
- [PHASE4B_AUTHORITY_ARCHITECTURE_PASS_2026-05-31.md](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/PHASE4B_AUTHORITY_ARCHITECTURE_PASS_2026-05-31.md)
- [phase4b_authority_architecture_backlog_2026_05_31.json](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/phase4b_authority_architecture_backlog_2026_05_31.json)
- [PHASE5_ARCHITECTURE_PASS_AND_BACKLOG_REFILL_2026-05-31.md](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/PHASE5_ARCHITECTURE_PASS_AND_BACKLOG_REFILL_2026-05-31.md)
- [phase5_architecture_backlog_2026_05_31.json](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/phase5_architecture_backlog_2026_05_31.json)

Phase 4 is `Operator Proof`: a consolidation pass to make Unity, phone, board, generated-data truth lanes, and authority gates demonstrable by a human without expanding writer authority.

Phase 4B is `Authority Architecture`: a follow-on architecture pass that turns the human grant into audited implementation work before broad credential/live-service/dataset/Unity-persistence/canon/generated-asset writes.

Phase 5 is `Operator Alpha`: a product spine pass that turns the authority-aware proof stack into one playable demo route, release-candidate burn-down, Unity scene hardening, live telemetry control plane, phone controller alpha, ship-card builder, crew ops console, content capture, and playtestable game-loop rules.

## Release-Candidate Manifest Pattern

When the prototype has many proofs but no single release truth surface, create an RC evidence manifest before expanding feature breadth.

Rules:

1. Separate verified runtime proof, generated proposal state, lore framing, future authority, and blocked proof.
2. Link the primary evidence artifact for every major claim.
3. Label non-claims explicitly, especially live services, credentials, canon promotion, asset promotion, persistent Unity scene/prefab writes, and hardware proof.
4. Validate that evidence links exist.
5. Do not use the manifest to accept review cards or promote generated artifacts.
6. Move the manifest itself to Review Gate only after markdown, JSON, generator check, board telemetry, and report evidence are filed.

Current Black Horizon proof:

- [PHASE3_MVP_RELEASE_CANDIDATE_MANIFEST_REPORT.md](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/PHASE3_MVP_RELEASE_CANDIDATE_MANIFEST_REPORT.md)
- [BLACK_HORIZON_MVP_RELEASE_CANDIDATE_MANIFEST.md](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/BLACK_HORIZON_MVP_RELEASE_CANDIDATE_MANIFEST.md)
- [black_horizon_mvp_release_candidate_manifest.json](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/black_horizon_mvp_release_candidate_manifest.json)

## Unity Generated Data Hub Pattern

When Unity-facing generated data spreads across many files, create a single hub contract before adding more runtime UI.

Rules:

1. Index generated artifacts with source path, Unity copy path, hashes, schema/version/timestamp, truth lane, visual state, and operator hint.
2. Keep runtime proof, generated proposal, lore frame, future authority, and blocked proof visually distinct.
3. Verify source existence and Unity copy hash parity.
4. Limit Unity writes to `Assets/HapaBlackHorizon/Data/Generated` and `Assets/HapaBlackHorizon/Data/Schemas` unless a human authorizes broader Unity mutation.
5. Do not persist scenes, write prefabs, promote generated assets, call services, touch credentials, or claim review acceptance.
6. Preserve blocked physical-device proof as blocked.

Current Black Horizon proof:

- [UNITY_GENERATED_DATA_HUB_REPORT.md](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/UNITY_GENERATED_DATA_HUB_REPORT.md)
- [unity_generated_data_hub.json](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-fleet-compiler/unity_generated_data_hub.json)
- [Unity generated copy](hapa-local://home/hapa-space/Assets/HapaBlackHorizon/Data/Generated/unity_generated_data_hub.json)

## Janus World-State Bridge Pattern

The Black Horizon board can produce proposal-only Janus world-state echoes from generated fleet, ship card, match, orbit, and Overwatch projections.

Rules for this bridge:

- Emit Janus-compatible `WorldCommand` payloads and `NodeSnapshotIn` payloads as generated data first.
- Keep live Janus ingest `not_attempted` unless a human explicitly authorizes credential use and live store mutation.
- Do not read `.node_token` during routine agent work.
- Exercise the ingest path with a temporary test token and temporary SQLite store when possible.
- Represent unknown live node health as `ok:null` with explicit error provenance, not as mocked healthy state.
- Sync Unity generated copies only as read-only data; do not write scenes, prefabs, or promoted generated assets from this path.

Current Black Horizon proof:

- [JANUS_WORLD_STATE_BRIDGE_REPORT.md](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/JANUS_WORLD_STATE_BRIDGE_REPORT.md)
- [janus_world_state_bridge.json](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-fleet-compiler/janus_world_state_bridge.json)
- [generate_janus_world_state_bridge.py](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-fleet-compiler/generate_janus_world_state_bridge.py)

## Janus Read-Only Handshake Pattern

After proposal-only Janus bridge proof exists, the next safe step is a read-only handshake contract, not live ingest.

Rules:

1. Distinguish temp TestClient proof, read-only live candidate, and future live mutation authority.
2. Name read-only endpoints separately from mutation endpoints.
3. Treat token-gated reads as `live_auth_not_authorized` until a human explicitly authorizes token use.
4. Do not read `.node_token`, environment tokens, or credential files.
5. Do not send Authorization headers, start services, post commands, post node snapshots, mutate live stores, or mock healthy node state.
6. Sync Unity copies only as generated JSON/schema evidence.

Current Black Horizon proof:

- [JANUS_READONLY_HANDSHAKE_REPORT.md](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/JANUS_READONLY_HANDSHAKE_REPORT.md)
- [janus_readonly_handshake.json](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-fleet-compiler/janus_readonly_handshake.json)
- [Unity generated copy](hapa-local://home/hapa-space/Assets/HapaBlackHorizon/Data/Generated/janus_readonly_handshake.json)

## Service Endpoint Observation Pattern

Runtime service truth must stay separate from static repository truth. The Black Horizon runtime state uses `service-endpoint-observation` signals for this.

Rules:

- Probe loopback URLs only.
- Use unauthenticated `GET /health` and unauthenticated capabilities candidates only.
- Record `401`/`403` as `auth_required`; do not read tokens or retry with credentials.
- Record offline/unreachable and no-candidate states honestly.
- Do not start services, mutate service state, call admin routes, or infer health from repo facts.
- Keep Unity-facing runtime data explicit about `credentialAccess=false`, `authorizationHeaderSent=false`, `authenticatedRoutesRead=false`, and `serviceStarted=false`.

Current Black Horizon proof:

- [REAL_NODE_CAPABILITY_INGEST_REPORT.md](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/REAL_NODE_CAPABILITY_INGEST_REPORT.md)
- [node_runtime_state.json](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-fleet-compiler/node_runtime_state.json)
- [generate_runtime_state.py](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-fleet-compiler/generate_runtime_state.py)

## Reference Video Capture Pattern

Reference videos are acceptable evidence when they are filed as generated artifacts, not as live runtime proof.

Rules:

- Record whether the artifact is a live screen recording, a generated reference video, or a hybrid.
- Include path, duration, resolution, codec, size, checksum, source composition, and QA stills when available.
- Caption or narrate the difference between generated scaffold, read-only proof, and future authority.
- Do not include credentials, private tokens, sensitive terminals, private chats, admin screens, or unreviewed authority claims.
- Do not use a reference video to mark implementation accepted; the Review Gate still requires explicit human decision.

Current Black Horizon proof:

- [PHASE2_REFERENCE_DEMO_VIDEO_CAPTURE.md](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/PHASE2_REFERENCE_DEMO_VIDEO_CAPTURE.md)
- [black-horizon-reference-video.mp4](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/black-horizon-reference-video/renders/black-horizon-reference-video.mp4)
- [black-horizon-reference-video index.html](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/black-horizon-reference-video/index.html)

## Draft Card Export Staging Pattern

Card export packages may prepare data for Anvil, Lance, or future card nodes, but staging does not equal canon promotion or service ingest.

Rules:

- Generate offline staging artifacts first: manifest, per-card exports, target-specific batches, target contract notes, and checks.
- Mark every generated card `draft_review_required` and `not_canon` until a human Review Gate decision says otherwise.
- Include source paths, source hashes, stat-profile references, and record counts.
- Do not read `.node_token`, call authenticated APIs, start node services, write node-owned databases/datasets, or promote generated cards without explicit human authority.
- When refreshing source cards, sync generated JSON copies only; do not write prefabs, scenes, or generated assets outside the declared staging folder.

Current Black Horizon proof:

- [ANVIL_LANCE_CARD_EXPORT_REPORT.md](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/ANVIL_LANCE_CARD_EXPORT_REPORT.md)
- [anvil_lance_card_export manifest.json](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-fleet-compiler/anvil_lance_card_export/manifest.json)
- [generate_anvil_lance_card_export.py](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-fleet-compiler/generate_anvil_lance_card_export.py)

## Anvil/Lance Review Import Plan Pattern

After an offline card export package exists, the next safe step is a review-only import plan, not an authenticated ingest.

Rules:

1. Map the staged package to future Anvil and Lance target routes without calling those services.
2. Include source hashes, target repos, future surfaces, expected writes if authorized, validation checks, human gates, and rollback steps.
3. Preserve `draft_review_required` and `not_canon` labels through the plan.
4. Treat token use, dataset writes, Anvil card writes, Lance ingest, and canon/card promotion as separate human gates.
5. Do not read credentials, send Authorization headers, write node-owned stores, mutate services, promote generated assets, or accept review cards from the plan.
6. File the plan as Review Gate evidence and create a separate future dry-run import task only after explicit human authority.

Current Black Horizon proof:

- [ANVIL_LANCE_CARD_REVIEW_IMPORT_PLAN_REPORT.md](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/ANVIL_LANCE_CARD_REVIEW_IMPORT_PLAN_REPORT.md)
- [anvil_lance_card_review_import_plan.json](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-fleet-compiler/anvil_lance_card_review_import_plan.json)
- [generate_anvil_lance_card_review_import_plan.py](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-fleet-compiler/generate_anvil_lance_card_review_import_plan.py)

## Physical Phone Playtest Runbook Pattern

When phone bridge proof exists but the real-device pass is blocked, prepare the human runbook without claiming physical proof.

Rules:

1. Cover LAN setup, pairing JSON, QR, phone deck load, selected card, orientation modes, motion/6DOF, safe command proof, Unity acknowledgement, privacy notes, and failure criteria.
2. List exact screenshots and log snippets the human should collect.
3. Separate real phone IMU proof from simulator/fallback proof.
4. Keep the physical-phone task blocked until a human uses an actual device on the LAN.
5. Do not treat a runbook, desktop browser, curl check, or simulator smoke as physical phone acceptance.
6. Do not access credentials, mutate repos/services, write Unity scenes or prefabs, promote canon, accept review cards, or promote generated assets.

Current Black Horizon proof:

- [PHASE3_PHONE_PLAYTEST_RUNBOOK_REPORT.md](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/PHASE3_PHONE_PLAYTEST_RUNBOOK_REPORT.md)
- [PHYSICAL_PHONE_PLAYTEST_RUNBOOK.md](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/PHYSICAL_PHONE_PLAYTEST_RUNBOOK.md)
- [physical_phone_playtest_evidence_checklist.json](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/physical_phone_playtest_evidence_checklist.json)

## Proposal-Only Match Loop Pattern

Match loops can make Hapa work feel playable, but they must stay below canon/runtime authority until reviewed.

Rules:

- Represent match state as generated proposal data first: snapshots, commands, resources, orbit state, selected proposal/card action, and a readable summary.
- Include at least one state-changing card/proposal action, but keep its effect scoped to match state, Overwatch proposal pressure, or visual replay.
- Mark canon fleet, Unity scene, repository, service, credential, and generated-asset mutation as disabled in safety, snapshots, and commands.
- Sync Unity generated copies only as read-only data; do not write scenes, prefabs, services, datasets, or node-owned stores.
- If board events advance after filing, preserve the generated artifact as review evidence and refresh the orbit/match projection on the next work slice.

Current Black Horizon proof:

- [BLACK_HORIZON_MATCH_LOOP_V1_REPORT.md](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/BLACK_HORIZON_MATCH_LOOP_V1_REPORT.md)
- [black_horizon_match_loop_v1.json](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-fleet-compiler/black_horizon_match_loop_v1.json)
- [generate_black_horizon_match_loop_v1.py](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-fleet-compiler/generate_black_horizon_match_loop_v1.py)

## Match Loop Playability Contract Pattern

After a proposal-only match loop exists, a playability pass should clarify repeatable session structure before adding more spectacle.

Rules:

1. Keep simulation state separate from rendering: the contract owns turns, choices, resources, commands, and pause/review state.
2. Include start, choice, commit, feedback, orbit/resource change, and pause/review steps.
3. Provide multiple choices with readable cost, source-card context, and expected feedback.
4. Use proposal-pressure language instead of win/loss, capture, deployment, or canon ownership language.
5. Sync Unity generated-data copies only; do not write scenes, prefabs, services, datasets, credentials, repos, canon, or generated asset promotion paths.
6. Move to Review Gate only after generator checks, Unity copy parity, report, and board evidence are filed.

Current Black Horizon proof:

- [BLACK_HORIZON_MATCH_LOOP_V2_PLAYABILITY_REPORT.md](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/BLACK_HORIZON_MATCH_LOOP_V2_PLAYABILITY_REPORT.md)
- [black_horizon_match_loop_v2_playability.json](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-fleet-compiler/black_horizon_match_loop_v2_playability.json)
- [generate_black_horizon_match_loop_v2_playability.py](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-fleet-compiler/generate_black_horizon_match_loop_v2_playability.py)

## CLI/API/UI Parity

The app exposes the same core capability on all surfaces:

- UI: browser board, communication log, telemetry, drag/drop movement, Review Gate.
- API: `/health`, `/capabilities`, `/v1/projects`, `/state`, `/events`, `/review-decisions`, `/smoke`.
- CLI: `state`, `events`, `telemetry`, `message`, `move`, `review`, `block`, `unblock`, `smoke`.
- DATA: append-only NDJSON plus project config JSON.

## Smoke Shape

The smoke command returns Hapa protocol-compatible JSON:

```json
{
  "ok": true,
  "run_id": "overwatch_smoke_...",
  "steps_results": [],
  "tasks": [],
  "downloads": [],
  "provenance": {}
}
```

## Reuse Pattern

For a new project:

1. Create a project config.
2. Create seed events.
3. Run the server.
4. Let humans use the UI and agents use CLI/API.
5. Promote important checkpoints into the relevant wiki, Second Brain, or `.Overwatch` records.

## Repeatable Agent Loop

The Hapa Black Horizon MVP now uses a 30-minute Overwatch heartbeat job as the overnight coordination pattern.

Each agent run should:

1. Read the current next-step docs, smoke report, post-mortem, and board state.
2. Ignore `done` and `review` cards unless the prompt is explicitly review-focused.
3. Pick the highest-priority non-blocked `ready` card; if no ready card exists, pick the highest-priority safe backlog card.
4. Append a start event before editing.
5. Implement one tightly scoped slice.
6. Run the relevant generator, Unity, board, or bridge smoke check.
7. Append telemetry/checkpoint events with links to evidence.
8. Move the card to `review` only when acceptance and verification are recorded.

Safety boundary: the loop may record proposals, dry-run data, Unity smoke, generated JSON, and docs. It must not perform repo/service mutation, prefab writes, scene persistence, credential access, or destructive cleanup unless a human explicitly confirms that authority for that task.

## Generated Runtime Art-Pass Pattern

When an autonomous agent takes an art-direction card but persistent Unity scene/prefab edits are not authorized, use a generated runtime contract instead of editing vendor assets:

1. Derive room identity, panel affordances, truth status, and command safety from generated source data such as `fleet_manifest.json`, `node_runtime_state.json`, and `room_panel_presets.json`.
2. Include Hapa/Astros style tokens, material intent, lighting state, wayfinding language, and progressive disclosure in JSON.
3. Sync only generated JSON/schema files into Unity data folders.
4. Run the generator check, source/copy parity check, board smoke, and a Unity smoke pass where possible.
5. Move to review only if the report states that vendor asset mutation, prefab writes, persistent scene mutation, repo/service mutation, and credential access stayed disabled.

Latest precedent: `phase2-ship-interior-art-pass` generated `interior_art_pass_v1.json` with `10` room treatments, `42` panel affordances, and Unity full-smoke `failures=[]` after a non-persistent Play Mode camera reset.

## Runtime Cockpit Presentation Pattern

When interior art direction exists but persistent Unity scene/prefab edits are not authorized, generate a cockpit presentation contract that a future runtime loader can consume.

Rules:

1. Cover specific ships first. For Black Horizon, dev and telemetry are the initial proof pair.
2. Use a stable information hierarchy: identity, mission readout, truth lanes, focused panel detail.
3. Separate source truth, runtime state, proposal actions, and safety/authority gates with different labels, colors, and command-safety states.
4. Every focused panel must reveal source path, truth status, observed timestamp when available, command safety, and authority boundary.
5. Sync only generated JSON/schema copies into Unity Data folders and refresh the generated-data hub.
6. Do not mutate purchased assets, prefabs, persistent scenes, repos, services, credentials, canon, review decisions, or generated asset promotion paths.

Current Black Horizon proof:

- [RUNTIME_INTERIOR_COCKPIT_PASS_REPORT.md](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-mvp-demo-notes/RUNTIME_INTERIOR_COCKPIT_PASS_REPORT.md)
- [runtime_interior_cockpit_pass.json](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-fleet-compiler/runtime_interior_cockpit_pass.json)
- [generate_runtime_interior_cockpit_pass.py](hapa-local://codex/2026-05-27/can-you-generate-me-some-concept/hapa-fleet-compiler/generate_runtime_interior_cockpit_pass.py)

## Procedural Builder Preview Pattern

For builder cards, prefer a staged progression:

1. Generate a procedural template contract that defines kind, role, canon tags, socket rules, budget limits, module bindings, provenance, and invalid controls.
2. Regenerate recipe candidates, validation report, promotion confirmation protocol, and dry-run command envelopes together so valid preview counts, review entries, and dry-run envelopes stay aligned.
3. Keep invalid controls in the recipe set. They must remain readable and testable, not silently removed.
4. Unity may render valid recipes as Play Mode ghost previews under `BH_BuildRecipePreviews_NonPersistent`, but prefab writes, persistent scene mutation, repository mutation, service execution, credential access, and generated asset promotion stay disabled.
5. Smoke must prove valid preview count equals valid recipe count, promotion review entries equal valid recipes, invalid controls produce rejection notices, and `failures=[]`.

Latest precedent: `phase2-procedural-fleet-builder-v2` generated `4` templates, `3` valid preview variants, `1` invalid control, `3` Unity ghost previews, `3` review-console cards, `3` accepted dry-runs, and `15` proposed text-only changes with promotion disabled.

## Consul Decision Mechanics Pattern

Consul/Triadic governance can become a playable mechanic only when it stays below real operating authority.

Rules:

1. Represent the Consul as a proposal primitive first: three seats, explicit evidence/context/action prompts, vote ledger, and review-ready output state.
2. Keep 2-of-3 consensus scoped to match/proposal state. A pass may create an Overwatch proposal or review request, but it cannot mutate repos, services, Unity scenes, prefabs, credentials, generated assets, or canon.
3. Use Fourth Leaf as a deadlock reframe, not as a tie-breaking authority. It may add an external perspective, human reviewer, or neutral retrieval coordinate.
4. Preserve the seven memory visibility layers as UI/protocol disclosure state: `A`, `B`, `C`, `AB`, `BC`, `CA`, `ABC`.
5. Every Consul artifact must distinguish lore metaphor, proposal state, and actual authority.
6. Actual authority still requires Human Review Gate, exact dry-run proof where relevant, and explicit human authorization for the specific boundary being crossed.

Latest precedent: `phase2-consul-decision-node-mechanics` generated `consul_decision_node_mechanics_v1.json` with `3` seats, `7` memory layers, `4` decision rules, `4` trial scenarios, `4` cards, `8/8` verified source anchors, 2-of-3 proposal consensus, Fourth Leaf deadlock reframe, Unity generated data copies, and mutation disabled.

## Operator Onboarding Truth-Status Pattern

Beginner-facing narration is part of the product surface, but it must carry the same source-truth discipline as code and generated data.

Rules:

1. Write onboarding from zero prior lore knowledge.
2. Introduce ships, cards, crew, phone controls, game loop, and review safety as one coherent story.
3. Label verified runtime facts separately from generated proposal state and mythopoetic framing.
4. Avoid implying that a story, card animation, match proposal, or narration beat grants real authority.
5. Include source anchors and a plain-language glossary.
6. Treat wiki copies as review-ready onboarding artifacts until a human Review Gate accepts them.

Latest precedent: `phase2-operator-onboarding-ten-minute-lore` generated a `10`-beat script, `781` spoken-script words plus visual cues, `8` glossary terms, `7/7` verified source anchors, Unity generated data copies, and a wiki-ready copy with no authority expansion.

## Architect Backlog Refill Pattern

When a safe autonomous queue drains, the next Overwatch move is not to keep manufacturing random tasks. Use an architect checkpoint.

Rules:

1. Read current board state, next-step docs, recent post-mortems, and latest evidence reports.
2. Name what the system is now, what worked, what is missing, and what the next phase should protect.
3. Add a bounded set of backlog cards that reduce risk or increase coherence.
4. Prefer acceptance, release-candidate packaging, source-truth ownership, and product integration before adding new feature breadth.
5. Preserve review cards; do not auto-accept or batch-promote.
6. Preserve hardware/device blockers as blocked unless a human can run the device pass.
7. File the post-mortem as the source link for the refill and append telemetry/checkpoint events.

Latest precedent: `PHASE3_ARCHITECT_POST_MORTEM_AND_BACKLOG_REFILL_2026-05-30.md` added `12` Phase 3 backlog cards, preserved `45` review cards, preserved the physical phone blocker, and verified board smoke at `389` events, `68` tasks, `12` backlog, and `1` blocked.
