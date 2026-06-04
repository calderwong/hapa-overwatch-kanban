# Hapa Overwatch Kanban

Append-only coordination tracker for Hapa project work.

This app is a reusable scaffold for:

- Kanban work tracking.
- Blue/Red/Green/Overwatch agent coordination.
- Project-scoped communication.
- Protocol telemetry.
- UI/API/CLI parity checks.

The board is not the source of truth. The event log is.

## Hapa Ecosystem Context

Hapa is built as a constellation of modular nodes. Each node owns a focused capability, but participates in a shared protocol for provenance, handoff, cards, memory, and operations.

Every node is designed for both human operators and AI agents. The target contract is three surfaces: a UI for direct human review/control, an API for node-to-node and agent calls, and a CLI for scripted runs, audits, and handoffs. Individual repos may be at different maturity levels, but the public contract is that humans and agents can inspect, operate, and verify the node.

Hapa nodes power AI agents and avatar-agents that build new nodes and enhance existing ones. As work moves through the ecosystem, it is mined for utility, wisdom, and repeatable logic, then distilled into Hapa Cards: portable packets of skills, context, memories, and operational patterns.

Humans and AIs use Hapa Cards to discuss, ideate, prototype, and deploy increasingly complex workflows through a playable, card-collecting mechanic. Collaboration history, skills, work artifacts, and canonical decisions are stored in [hapa-second-brain](https://github.com/calderwong/hapa-second-brain), enriched into [Hapa Worldbuilding Wiki](https://github.com/calderwong/hapa-worldbuilding-wiki) entries, and converted back into cards. Avatar-agents can also be combined or specialized into purpose-built identities with their own storage, lore, canon, card decks, skills, and protocols.

## Hapa App Build Rule

Every Hapa app build should get an Overwatch Kanban project before implementation work spreads across agents. The project must include:

- `config/projects/<project-id>.json` with actors, columns, source-truth hierarchy, and safe-action policy.
- `seed/<project-id>.events.ndjson` with the initial backlog, protocol note, and checkpoint.
- Agent writeback instructions in the owning app's `AGENTS.md`.

Agents should append progress, blockers, handoffs, verification notes, and review evidence to the project event log. The UI/API/CLI board is a projection of those events.

## Run

```bash
npm start
```

Default URL:

```text
http://127.0.0.1:5181
```

## CLI

```bash
npm run smoke
npm run cli -- state
npm run cli -- telemetry
npm run cli -- message Overwatch "Integration note"
npm run cli -- move blue-fleet-manifest in_progress Blue
```

## API

- `GET /health`
- `GET /capabilities`
- `GET /v1/projects`
- `GET /v1/projects/hapa-black-horizon-mvp/state`
- `GET /v1/projects/qwen-creative-writer-agent/state`
- `GET /v1/projects/hapa-black-horizon-mvp/events`
- `POST /v1/projects/hapa-black-horizon-mvp/events`
- `GET /v1/projects/hapa-black-horizon-mvp/smoke`

## Record Rule

Every board change, communication, block, checkpoint, and telemetry observation is appended as an event in:

```text
data/hapa-black-horizon-mvp/events.ndjson
```

The Kanban board, project log, and telemetry panels are projections from that event log.

## Reuse For Another Project

1. Add `config/projects/<project-id>.json`.
2. Add `seed/<project-id>.events.ndjson`.
3. Start the server.
4. Open `http://127.0.0.1:5181/?project=<project-id>` or call `/v1/projects/<project-id>/state`.
5. Register the project in the owning app's `AGENTS.md` and node manifest.

The event model is intentionally small so other Hapa nodes can write to it from a CLI, API, or future agent harness.

## Related Hapa nodes

- [Hapa Quest Keeper](https://github.com/calderwong/hapa-quest-keeper) — Consolidated board overview that audits and enriches per-app Kanban projects.
- [Overwatch](https://github.com/calderwong/overwatch) — Operations spine that gives the board engine its broader inventory/protocol context.
- [Hapa Space](https://github.com/calderwong/hapa-space) — Black Horizon consumer of board tasks, evidence, review gates, and telemetry.
- [Hapa Telemetry Node](https://github.com/calderwong/hapa-telemetry-node) — Discovery and status companion for board-covered services.
- [Hapa](https://github.com/calderwong/hapa) — Front-door documentation for the board standard and ecosystem role.
