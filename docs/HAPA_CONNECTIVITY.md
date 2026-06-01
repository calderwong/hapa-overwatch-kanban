<!-- HAPA-CONNECTIVITY-DOC:BEGIN -->
# Hapa Connectivity

Generated: 2026-06-01T01:03:18.085Z

This file is a publication-safe cross-link for humans and AIs. It describes how this repo fits into the Hapa system without embedding private local paths, secrets, heavy assets, DB payloads, or generated media.

## Identity

- Node id: `hapa-overwatch-kanban`
- Repo name: `hapa-overwatch-kanban`
- Hapa system group: `ops/control-plane` (Operations / Control Plane)
- Target assembly path: `hapa-system/ops/control-plane/hapa-overwatch-kanban`
- Link mode: `wrap_or_initialize_then_link`

## Role

This repo is part of the Hapa ecosystem and should remain linked to the shared front door, wiki, memory, board, and vault contracts.

## Reads From

- Hapa ecosystem docs and node manifests.
- Wiki pages or operations docs when this node needs canonical human context.
- Second Brain relation exports or memory summaries when this node needs durable recall.
- Private assets and generated media through `$HAPA_VAULT_ROOT`, not checked-in binaries.
- Append-only board events and local runtime state.

## Writes To

- Source-safe docs, schemas, manifests, or small fixtures that can pass publication preflight.

## Related Hapa Nodes

| Node | Relationship |
| --- | --- |
| `hapa` | Front door and ecosystem map. |
| `Hapa_Worldbuilding_Wiki` | Canonical wiki and operations knowledge. |
| `hapa_second_brain` | Durable memory, SQLite relation exports, and recall surface. |
| `hapa-quest-keeper` | Consolidated Quest board overview and board coverage audit. |

## Shared Control Surfaces

- `hapa`: front door, operator map, and ecosystem entry point.
- `Hapa_Worldbuilding_Wiki`: canonical human-readable lore, operations, and node documentation.
- `hapa_second_brain`: durable memory, relation exports, and local-first recall surface.
- `hapa-overwatch-kanban`: append-only board/event protocol for node work.
- `hapa-quest-keeper`: consolidated board overview and app coverage audit.
- `$HAPA_VAULT_ROOT`: private companion root for heavy assets, runtime DBs, generated media, and relation exports.

## Publication Boundary

- Publication strategy: `publish_source_with_vault_pointers`
- Publication wave: `wave_4_wrap_or_initialize`
- Current assembly gate: `local_pointer_after_review`

Source code, docs, schemas, and tiny fixtures are Git candidates after preflight. Runtime DBs, WAL/SHM files, local tokens, generated media, model weights, logs, app bundles, and vault exports stay out of public Git and should be represented by pointer manifests or rebuild instructions.

## Open Gates

- Wrap or initialize a repo boundary before publication.

## Safe Next Commands

- `git status --short`
- `Apply vault pointer manifests only after vault copy and hash verification.`
- `Choose GitHub owner, repo name, and private/public visibility before remote creation.`
- `Run gitleaks/history scan before public release.`
- `Do not move repos, create remotes, push, purge, copy heavy assets, or rewrite history without the matching approval gate.`

## Verification

Run the fastest local checks that exist for this repo before publication or assembly:

```bash
git status --short
npm run start -- --help
```

<!-- HAPA-CONNECTIVITY-DOC:END -->
