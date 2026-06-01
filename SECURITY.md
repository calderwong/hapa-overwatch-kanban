# Security and Publication Notes

Hapa Overwatch Kanban stores coordination events, task comments, checkpoints, and review evidence. It should never store raw secrets.

## Secret Boundaries

- Do not append API keys, bearer tokens, private keys, passwords, or credential JSON into board events.
- Event logs under `data/<project-id>/events.ndjson` may be published as project history only after review for sensitive paths, private context, and credential leakage.
- Keep `.env`, `.node_token`, local databases, logs, generated media, and dependency folders out of Git.

## GitHub Readiness

Before publishing:

```bash
git status --short
find . -maxdepth 4 -name '.env' -o -name '.node_token' -o -name '*.db' -o -name '*.db-wal' -o -name '*.db-shm'
```

Run a scanner such as:

```bash
gitleaks detect --source . --no-git=false
```

If `gitleaks` is not installed, record that as an open publication gate instead of claiming the repo is public-ready.

## Data Boundary

Source code, docs, small seed boards, and schema-like examples can live in Git. Long-lived or sensitive board histories should be reviewed before publication, and heavy artifacts referenced by board events should live in `hapa-vault`/Hypercore flows.
