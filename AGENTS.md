# AGENTS.md

## Repo Role

`hapa-overwatch-kanban` owns reusable append-only Kanban boards for Hapa projects. It is the per-project coordination/event-log layer used by Quest Keeper and individual Hapa app boards.

## Source Of Truth

- `config/projects/*.json` defines project metadata, actors, columns, source-truth hierarchy, and safe-action policy.
- `seed/*.events.ndjson` contains initial board events.
- `data/<project-id>/events.ndjson` is the append-only event log. Do not rewrite it.
- `src/overwatch-core.mjs`, `server.mjs`, and `bin/overwatch-kanban.mjs` define the projection/API/CLI behavior.
- `docs/OVERWATCH_KANBAN_PROTOCOL.md` and `docs/QA_CHECKLIST.md` document expected behavior.

## Safe Edit Boundaries

- Append events; do not hand-edit historical event lines except for explicit repair work authorized by the human.
- Keep event payloads free of raw secrets, bearer tokens, private keys, and unredacted credentials.
- Do not use board operations to mutate app source repos, generated assets, live databases, or vault contents.
- Preserve project IDs and event IDs once published; downstream dashboards and reports may link to them.

## Verification

```bash
npm run smoke
npm run cli -- projects
npm run cli -- smoke hapa-ecosystem-packaging-quest
```

For server checks:

```bash
npm start
curl -fsS http://127.0.0.1:5181/health
curl -fsS http://127.0.0.1:5181/v1/projects
```

## Related Hapa Nodes

- `/Users/calderwong/Desktop/hapa-quest-keeper` reads all project boards and summarizes ecosystem work state.
- `/Users/calderwong/Desktop/hapa` is the Hapa front door and node map.
- `/Users/calderwong/Desktop/.Overwatch` is the operations knowledgebase.
- `/Users/calderwong/Desktop/Hapa_Worldbuilding_Wiki` stores protocol and operations documentation.
