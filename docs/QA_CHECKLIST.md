# QA Checklist

## Smoke

- `npm run smoke` returns `ok: true`.
- `GET /health` returns `ok: true`.
- `GET /capabilities` lists append-only events and Kanban projection.

## UI

- Board loads the seeded Blue, Red, Green, and Overwatch cards.
- Dragging a card to another column appends a `task_moved` event.
- `Append Message` creates a durable `message` event.
- `Create Card` creates a durable `task_created` event.
- `Block` records a reason and moves the card to Blocked.
- Telemetry updates after event append.

## Protocol

- Event log is append-only.
- UI state can be rebuilt from `data/<project-id>/events.ndjson`.
- Task completion is not claimed unless a verification event, comment, or checkpoint supports it.
- Generated or inferred status is labeled in the event payload or checkpoint.
