const DEFAULT_PROJECT_ID = 'hapa-black-horizon-mvp';

let state = null;
let controlPlane = null;
let agentCrewOps = null;
let projects = [];
let projectId = new URLSearchParams(window.location.search).get('project') || DEFAULT_PROJECT_ID;

const board = document.querySelector('#board');
const projectTitle = document.querySelector('#projectTitle');
const projectSummary = document.querySelector('#projectSummary');
const projectSelect = document.querySelector('#projectSelect');
const statusStrip = document.querySelector('#statusStrip');
const recordRule = document.querySelector('#recordRule');
const protocolFlow = document.querySelector('#protocolFlow');
const telemetryGrid = document.querySelector('#telemetryGrid');
const actorLoad = document.querySelector('#actorLoad');
const controlPlaneGrid = document.querySelector('#controlPlaneGrid');
const controlPlaneLanes = document.querySelector('#controlPlaneLanes');
const controlPlaneNodes = document.querySelector('#controlPlaneNodes');
const agentCrewGrid = document.querySelector('#agentCrewGrid');
const agentCrewCommands = document.querySelector('#agentCrewCommands');
const agentCrewCards = document.querySelector('#agentCrewCards');
const messageLog = document.querySelector('#messageLog');
const messageActor = document.querySelector('#messageActor');
const taskOwner = document.querySelector('#taskOwner');
const reviewTask = document.querySelector('#reviewTask');
const reviewDecision = document.querySelector('#reviewDecision');
const reviewActor = document.querySelector('#reviewActor');
const reviewEvidence = document.querySelector('#reviewEvidence');
const reviewNote = document.querySelector('#reviewNote');
const reviewFollowupTitle = document.querySelector('#reviewFollowupTitle');
const reviewFollowupWrap = document.querySelector('#reviewFollowupWrap');
const reviewStatus = document.querySelector('#reviewStatus');
const reviewConsoleGrid = document.querySelector('#reviewConsoleGrid');
const reviewLanes = document.querySelector('#reviewLanes');
const reviewCandidates = document.querySelector('#reviewCandidates');
const authorityConsoleGrid = document.querySelector('#authorityConsoleGrid');
const authorityRiskRows = document.querySelector('#authorityRiskRows');
const authorityLedger = document.querySelector('#authorityLedger');
const authorityQueue = document.querySelector('#authorityQueue');
const promotionWorkbenchGrid = document.querySelector('#promotionWorkbenchGrid');
const promotionWorkbenchGates = document.querySelector('#promotionWorkbenchGates');
const promotionWorkbenchCandidates = document.querySelector('#promotionWorkbenchCandidates');
const promotionWorkbenchRollback = document.querySelector('#promotionWorkbenchRollback');

const AUTHORITY_GRANT_ID = 'human-authorization-grant-2026-05-31';
const AUTHORITY_COLUMNS = new Set(['ready', 'in_progress', 'in-progress', 'backlog', 'review']);
const AUTHORITY_FIELD_ALIASES = {
  rawCredentialValuesEmitted: ['rawCredentialValuesEmitted', 'rawSecretsEmitted', 'secretValuesStored'],
  credentialFilesRead: ['credentialFilesRead', 'credentialsRead'],
  authorizationHeadersSent: ['authorizationHeadersSent', 'authHeadersSent'],
  datasetWritesMade: ['datasetWritesMade', 'datasetWrites', 'datasetWritesMadeCount'],
  prefabWritesMade: ['prefabWritesMade', 'prefabWrites'],
  persistentSceneWritesMade: ['persistentSceneWritesMade', 'sceneWritesMade', 'persistentSceneWrites'],
  canonPromotionsMade: ['canonPromotionsMade', 'canonPromotions'],
  generatedAssetPromotionsMade: ['generatedAssetPromotionsMade', 'generatedAssetPromotions'],
  vendorAssetWritesMade: ['vendorAssetWritesMade', 'vendorWritesMade', 'vendorAssetWrites'],
  serviceCallsMade: ['serviceCallsMade', 'liveServiceCallsMade', 'externalNetworkCalls']
};

const PROMOTION_TASK_HINTS = {
  'phase3b-promotion-workbench-v2-authority-dry-run': {
    source: 'Promotion workbench dry-run',
    proposedTextChanges: 15,
    authorityGates: 25,
    rollback: '6 dry-run scenarios carry rollback preview language.',
    mode: 'dry-run'
  },
  'promotion-dry-run-command': {
    source: 'Build recipe promotion dry-run command',
    proposedTextChanges: 10,
    authorityGates: 2,
    rollback: 'Exact-phrase dry-run returns text-only prefab/scene changes.',
    mode: 'dry-run'
  },
  'builder-review-console': {
    source: 'In-scene builder review console',
    proposedTextChanges: 0,
    authorityGates: 2,
    rollback: 'Panel repeats confirmation-required and promotion-disabled state.',
    mode: 'runtime preview'
  },
  'phase3-asset-kit-promotion-protocol': {
    source: 'Asset kit promotion protocol',
    proposedTextChanges: 0,
    authorityGates: 6,
    rollback: 'Protocol carries 6 rollback steps before kit promotion authority.',
    mode: 'protocol'
  },
  'phase4b-generated-ship-prefab-promotion-pipeline': {
    source: 'Generated Telemetry AWACS prefab promotion evidence',
    proposedTextChanges: 0,
    authorityGates: 5,
    rollback: 'Rollback manifest created before prefab write.',
    mode: 'promotion evidence'
  },
  'phase4b-asset-kit-prefab-library-promotion': {
    source: 'KitLibrary wrapper prefab promotion evidence',
    proposedTextChanges: 0,
    authorityGates: 6,
    rollback: 'Rollback manifest created before wrapper-prefab writes.',
    mode: 'promotion evidence'
  },
  'phase4-generated-asset-promotion-workbench-ui': {
    source: 'This read-only Overwatch UI workbench pass',
    proposedTextChanges: 0,
    authorityGates: 3,
    rollback: 'UI-only change; rollback is reverting index/app/styles edits.',
    mode: 'ui preview'
  }
};

const PROMOTION_FIELD_ALIASES = {
  proposedTextChanges: ['proposedTextChanges', 'proposedTextChangeCount', 'proposedBuildChanges', 'proposedPrefabChanges', 'proposedChanges'],
  authorityGates: ['authorityGateCount', 'humanAuthorityRequiredCount', 'humanAuthorityRequiredGateCount', 'gates', 'gateCount'],
  acceptedDryRuns: ['acceptedDryRuns', 'sampleDryRunOperationCount'],
  prefabWritesMade: ['prefabWritesMade', 'prefabWrites'],
  persistentSceneWritesMade: ['persistentSceneWritesMade', 'sceneWritesMade', 'persistentSceneWrites'],
  generatedAssetPromotionsMade: ['generatedAssetPromotionsMade', 'generatedAssetPromotions'],
  vendorAssetWritesMade: ['vendorAssetWritesMade', 'vendorWritesMade', 'vendorAssetWrites'],
  rawCredentialValuesEmitted: ['rawCredentialValuesEmitted', 'rawSecretsEmitted', 'secretValuesStored']
};

document.querySelector('#refreshButton').addEventListener('click', loadState);
projectSelect.addEventListener('change', async () => {
  projectId = projectSelect.value || DEFAULT_PROJECT_ID;
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('project', projectId);
  window.history.replaceState({}, '', nextUrl);
  await loadState();
});
document.querySelector('#messageForm').addEventListener('submit', appendMessage);
document.querySelector('#taskForm').addEventListener('submit', createTask);
document.querySelector('#reviewForm').addEventListener('submit', appendReviewDecision);
reviewDecision.addEventListener('change', renderReviewDecisionControls);

await loadProjects();
await loadState();
setInterval(loadState, 15000);

async function loadProjects() {
  const response = await fetch('/v1/projects');
  const payload = await response.json();
  if (!payload.ok) throw new Error(payload.error || 'Failed to load projects.');
  projects = payload.projects || [];
  if (!projects.some((project) => project.id === projectId)) projectId = projects[0]?.id || DEFAULT_PROJECT_ID;
  renderProjectSelector();
}

function renderProjectSelector() {
  projectSelect.innerHTML = projects
    .map((project) => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name || project.id)}</option>`)
    .join('');
  projectSelect.value = projectId;
}

async function loadState() {
  const response = await fetch(`/v1/projects/${projectId}/state`);
  const payload = await response.json();
  if (!payload.ok) throw new Error(payload.error || 'Failed to load state.');
  state = payload.state;
  try {
    const controlPlaneResponse = await fetch(`/v1/projects/${projectId}/control-plane`);
    const controlPlanePayload = await controlPlaneResponse.json();
    controlPlane = controlPlanePayload.ok ? controlPlanePayload.controlPlane : null;
  } catch {
    controlPlane = null;
  }
  try {
    const agentCrewResponse = await fetch(`/v1/projects/${projectId}/agent-crew-ops`);
    const agentCrewPayload = await agentCrewResponse.json();
    agentCrewOps = agentCrewPayload.ok ? agentCrewPayload.agentCrewOps : null;
  } catch {
    agentCrewOps = null;
  }
  render();
}

function render() {
  renderStatus();
  renderActors();
  renderProtocol();
  renderBoard();
  renderTelemetry();
  renderControlPlane();
  renderAgentCrewOps();
  renderReviewConsole();
  renderAuthorityConsole();
  renderPromotionWorkbench();
  renderReviewGate();
  renderMessages();
}

function renderStatus() {
  projectTitle.textContent = state.project.name;
  projectSummary.textContent = state.project.summary;
  if (projectSelect.value !== state.project.id) projectSelect.value = state.project.id;
  const t = state.telemetry;
  statusStrip.innerHTML = [
    pill(t.ok ? 'protocol green' : 'blocked', t.ok ? 'good' : 'warn'),
    pill(`${t.totalTasks} cards`),
    pill(`${t.totalEvents} events`),
    pill(`${t.progress}% done`),
    pill(`${t.blockedCount} blocked`, t.blockedCount ? 'warn' : 'good')
  ].join('');
}

function renderActors() {
  const currentReviewActor = reviewActor.value;
  const options = state.actors
    .map((actor) => `<option value="${escapeHtml(actor.id)}">${escapeHtml(actor.label)}</option>`)
    .join('');
  messageActor.innerHTML = options;
  taskOwner.innerHTML = options;
  reviewActor.innerHTML = options;
  reviewActor.value = state.actors.some((actor) => actor.id === currentReviewActor)
    ? currentReviewActor
    : state.actors.some((actor) => actor.id === 'Human') ? 'Human' : state.actors[0]?.id || 'Overwatch';
}

function renderProtocol() {
  recordRule.textContent = state.protocol.recordRule;
  protocolFlow.innerHTML = state.protocol.sourceTruthHierarchy
    .map((label, index) => `
      <div class="flow-node">
        <div class="flow-index">${index + 1}</div>
        <div>
          <h3>${escapeHtml(label)}</h3>
          <p>${index === 0 ? 'Inspect and verify before summarizing.' : 'Use only after higher-trust layers are checked.'}</p>
        </div>
      </div>
    `)
    .join('');
}

function renderBoard() {
  const grouped = new Map(state.columns.map((column) => [column.id, []]));
  for (const task of state.tasks) {
    if (!grouped.has(task.column)) grouped.set(task.column, []);
    grouped.get(task.column).push(task);
  }

  board.innerHTML = state.columns
    .map((column) => {
      const tasks = grouped.get(column.id) || [];
      return `
        <section class="column" data-column="${escapeHtml(column.id)}">
          <div class="column-head">
            <div>
              <h3>${escapeHtml(column.label)}</h3>
              <p>${escapeHtml(column.intent)}</p>
            </div>
            <span class="count">${tasks.length}</span>
          </div>
          <div class="card-list">
            ${tasks.map(renderTask).join('')}
          </div>
        </section>
      `;
    })
    .join('');

  for (const card of board.querySelectorAll('.task-card')) {
    card.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', card.dataset.taskId);
    });
  }

  for (const column of board.querySelectorAll('.column')) {
    column.addEventListener('dragover', (event) => {
      event.preventDefault();
      column.classList.add('drag-over');
    });
    column.addEventListener('dragleave', () => column.classList.remove('drag-over'));
    column.addEventListener('drop', async (event) => {
      event.preventDefault();
      column.classList.remove('drag-over');
      const taskId = event.dataTransfer.getData('text/plain');
      await moveTask(taskId, column.dataset.column, 'Overwatch');
    });
  }

  for (const button of board.querySelectorAll('[data-action]')) {
    button.addEventListener('click', async () => {
      const action = button.dataset.action;
      const taskId = button.dataset.taskId;
      if (action === 'review') await moveTask(taskId, 'review', 'Overwatch');
      if (action === 'done') await moveTask(taskId, 'done', 'Overwatch');
      if (action === 'block') await blockTask(taskId);
      if (action === 'comment') await commentTask(taskId);
      if (action === 'gate') focusReviewGate(taskId);
    });
  }
}

function renderTask(task) {
  const reviewDecision = task.lastReviewDecision
    ? `<p class="review-decision">Last decision: ${escapeHtml(task.lastReviewDecision.decision)} / ${escapeHtml(task.lastReviewDecision.actor)}</p>`
    : '';
  const actions = task.column === 'review'
    ? `
        <button type="button" data-action="comment" data-task-id="${escapeHtml(task.id)}">Note</button>
        <button type="button" data-action="block" data-task-id="${escapeHtml(task.id)}">Block</button>
        <button class="gate-action" type="button" data-action="gate" data-task-id="${escapeHtml(task.id)}">Gate</button>
      `
    : `
        <button type="button" data-action="comment" data-task-id="${escapeHtml(task.id)}">Note</button>
        <button type="button" data-action="block" data-task-id="${escapeHtml(task.id)}">Block</button>
        <button type="button" data-action="review" data-task-id="${escapeHtml(task.id)}">Review</button>
        <button type="button" data-action="done" data-task-id="${escapeHtml(task.id)}">Done</button>
      `;
  return `
    <article class="task-card" draggable="true" data-task-id="${escapeHtml(task.id)}" data-owner="${escapeHtml(task.owner)}">
      <div class="task-title">
        <h3>${escapeHtml(task.title)}</h3>
        <span class="priority">${escapeHtml(task.priority)}</span>
      </div>
      <p class="task-description">${escapeHtml(task.description)}</p>
      <div class="task-meta">
        <span class="tag">${escapeHtml(task.owner)}</span>
        <span class="tag">${escapeHtml(task.lane)}</span>
        ${task.node ? `<span class="tag">${escapeHtml(task.node)}</span>` : ''}
        ${task.tags.slice(0, 3).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
      </div>
      ${reviewDecision}
      <div class="card-actions">
        ${actions}
      </div>
    </article>
  `;
}

function renderTelemetry() {
  const t = state.telemetry;
  telemetryGrid.innerHTML = [
    metric('Progress', `${t.progress}%`),
    metric('Blocked', t.blockedCount),
    metric('Events', t.totalEvents),
    metric('Cards', t.totalTasks)
  ].join('');

  const maxLoad = Math.max(1, ...t.actorLoad.map((actor) => actor.activeTasks + actor.doneTasks));
  actorLoad.innerHTML = t.actorLoad
    .map((actor) => {
      const total = actor.activeTasks + actor.doneTasks;
      const width = Math.max(4, Math.round((total / maxLoad) * 100));
      return `
        <div class="load-row">
          <span>${escapeHtml(actor.label)}</span>
          <div class="load-bar"><div class="load-fill" style="width:${width}%; background:${escapeHtml(actor.color)}"></div></div>
          <span>${total}</span>
        </div>
      `;
    })
    .join('');
}

function renderControlPlane() {
  if (!controlPlane) {
    controlPlaneGrid.innerHTML = [
      consoleMetric('Artifact', 'check', 'not generated'),
      consoleMetric('Lanes', 0, 'waiting'),
      consoleMetric('Live OK', 'check', 'waiting'),
      consoleMetric('Secrets', 'check', 'waiting')
    ].join('');
    controlPlaneLanes.innerHTML = '<p class="empty-state">Generate the Phase 5 control-plane artifact to populate this panel.</p>';
    controlPlaneNodes.innerHTML = '';
    return;
  }

  const summary = controlPlane.summary || {};
  const acceptance = controlPlane.acceptance || {};
  controlPlaneGrid.innerHTML = [
    consoleMetric('Lanes', summary.laneCount ?? 0, 'shared source'),
    consoleMetric('Live OK', summary.liveLoopbackServiceSurfaced ? 'yes' : 'check', `${summary.liveLoopbackStatusCode || 'n/a'} status`),
    consoleMetric('Writes', summary.authorizedDatasetWritesObserved ?? 0, 'observed'),
    consoleMetric('Secrets', summary.rawCredentialValuesEmitted ?? 'check', 'raw emitted')
  ].join('');

  controlPlaneLanes.innerHTML = (controlPlane.lanes || [])
    .map((lane) => `
      <article class="control-plane-lane" data-lane="${escapeHtml(lane.truthLane || 'unknown')}">
        <div>
          <strong>${escapeHtml(lane.label)}</strong>
          <span>${escapeHtml(lane.truthLane || 'unknown')}</span>
        </div>
        <b>${lane.count ?? 0}</b>
      </article>
    `)
    .join('');

  const rows = (controlPlane.nodeControlRows || [])
    .filter((row) => ['attention', 'unknown', 'authority_visible', 'observing'].includes(row.controlState))
    .slice(0, 6);
  controlPlaneNodes.innerHTML = `
    <div class="candidate-head progress-head">
      <strong>Node Telemetry</strong>
      <span>${acceptance.boardConsumesNormalizedArtifact ? 'board linked' : 'endpoint check'}</span>
    </div>
    ${rows.map(renderControlPlaneNode).join('') || '<p class="empty-state">No node telemetry rows available.</p>'}
  `;
}

function renderControlPlaneNode(row) {
  return `
    <article class="control-plane-node" data-state="${escapeHtml(row.controlState || 'unknown')}">
      <div class="candidate-title">
        <strong>${escapeHtml(row.displayName || row.nodeId)}</strong>
        <span>${escapeHtml(row.serviceState || 'unknown')}</span>
      </div>
      <p>${escapeHtml(row.operatorAction || '')}</p>
      <div class="candidate-meta">
        <span>${escapeHtml(row.shipClass || 'ship')}</span>
        <span>${escapeHtml(row.capabilityState || 'unknown')}</span>
        <span>${escapeHtml(row.freshness || 'unknown')}</span>
      </div>
    </article>
  `;
}

function renderAgentCrewOps() {
  if (!agentCrewOps) {
    agentCrewGrid.innerHTML = [
      consoleMetric('Console', 'check', 'not generated'),
      consoleMetric('Ships', 0, 'waiting'),
      consoleMetric('Crew', 0, 'waiting'),
      consoleMetric('Duties', 0, 'waiting')
    ].join('');
    agentCrewCommands.innerHTML = '<p class="empty-state">Generate the Phase 5 agent crew ops artifact to populate this panel.</p>';
    agentCrewCards.innerHTML = '';
    return;
  }

  const summary = agentCrewOps.summary || {};
  agentCrewGrid.innerHTML = [
    consoleMetric('Cards', summary.consoleCardCount ?? 0, 'ships'),
    consoleMetric('Crew', summary.crewSlotCount ?? 0, `${summary.agentSeatCount ?? 0} agents`),
    consoleMetric('Duties', summary.dutyQueueCardCount ?? 0, 'visible'),
    consoleMetric('Replay', summary.visibleReplayItemCount ?? 0, 'items')
  ].join('');

  agentCrewCommands.innerHTML = (agentCrewOps.console?.commandPalette || [])
    .slice(0, 4)
    .map((command) => `
      <article class="agent-crew-command">
        <strong>${escapeHtml(command.label || command.id)}</strong>
        <span>${escapeHtml(command.scope || 'console')}</span>
      </article>
    `)
    .join('');

  const cards = (agentCrewOps.console?.cards || [])
    .slice()
    .sort((a, b) => (b.dutyQueue?.length || 0) - (a.dutyQueue?.length || 0))
    .slice(0, 5);
  agentCrewCards.innerHTML = `
    <div class="candidate-head progress-head">
      <strong>Crew Consoles</strong>
      <span>${agentCrewOps.acceptance?.consoleDoesNotExecuteJobsServicesOrWrites ? 'safe preview' : 'check safety'}</span>
    </div>
    ${cards.map(renderAgentCrewCard).join('') || '<p class="empty-state">No crew console cards available.</p>'}
  `;
}

function renderAgentCrewCard(card) {
  const shipCard = card.shipCard || {};
  const telemetry = card.telemetry || {};
  const crewKinds = Object.entries(card.crewIdentityKinds || {})
    .map(([kind, count]) => `${kind}:${count}`)
    .join(' ');
  return `
    <article class="agent-crew-card" data-state="${escapeHtml(telemetry.controlState || 'unknown')}">
      <div class="candidate-title">
        <strong>${escapeHtml(card.displayName || card.nodeId)}</strong>
        <span>${escapeHtml(shipCard.rarity || 'card')}</span>
      </div>
      <p>${escapeHtml(card.consoleTitle || '')}</p>
      <div class="candidate-meta">
        <span>${escapeHtml(card.shipClass || 'ship')}</span>
        <span>${card.crewStations?.length || 0} crew</span>
        <span>${card.dutyQueue?.length || 0} duties</span>
      </div>
      <div class="candidate-meta">
        <span>${escapeHtml(telemetry.serviceState || 'unknown')}</span>
        <span>${escapeHtml(crewKinds || 'crew')}</span>
      </div>
    </article>
  `;
}

function renderReviewConsole() {
  const reviewTasks = getReviewTasks();
  const backlogTasks = state.tasks.filter((task) => task.column === 'backlog');
  const readyTasks = state.tasks.filter((task) => task.column === 'ready');
  const authorityQueue = state.tasks.filter((task) => ['ready', 'in-progress', 'backlog', 'review'].includes(task.column) && classifyReviewTask(task) === 'authority');
  const laneRows = summarizeReviewLanes(reviewTasks);
  const riskyCount = reviewTasks.filter((task) => reviewRisk(task, classifyReviewTask(task)) !== 'low').length;
  const evidenceReady = reviewTasks.filter((task) => latestEvidenceLinks(task).length > 0).length;

  reviewConsoleGrid.innerHTML = [
    consoleMetric('Review', reviewTasks.length, `${evidenceReady} evidence`),
    consoleMetric('Ready', readyTasks.length, 'pull next'),
    consoleMetric('Authority', authorityQueue.length, 'gated'),
    consoleMetric('Risky', riskyCount, 'spot-check')
  ].join('');

  reviewLanes.innerHTML = laneRows
    .map((lane) => `
      <div class="review-lane" data-tone="${escapeHtml(lane.tone)}">
        <div>
          <strong>${escapeHtml(lane.label)}</strong>
          <span>${escapeHtml(lane.prompt)}</span>
        </div>
        <b>${lane.count}</b>
      </div>
    `)
    .join('');

  const candidates = topReviewCandidates(reviewTasks).slice(0, 8);
  const progressCandidates = topProgressCandidates().slice(0, 6);
  reviewCandidates.innerHTML = `
    <div class="candidate-head">
      <strong>Next Human Checks</strong>
      <span>${evidenceReady}/${reviewTasks.length} with evidence</span>
    </div>
    ${candidates.length ? candidates.map(renderReviewCandidate).join('') : '<p class="empty-state">No review cards waiting.</p>'}
    <div class="candidate-head progress-head">
      <strong>Next Pull</strong>
      <span>${readyTasks.length} ready / ${backlogTasks.length} backlog</span>
    </div>
    ${progressCandidates.map(renderProgressCandidate).join('')}
  `;

  for (const button of reviewCandidates.querySelectorAll('[data-console-gate]')) {
    button.addEventListener('click', () => focusReviewGate(button.dataset.consoleGate));
  }
}

function renderAuthorityConsole() {
  const model = buildAuthorityConsoleModel();
  authorityConsoleGrid.innerHTML = [
    consoleMetric('Grant', model.grantActive ? 'active' : 'check', AUTHORITY_GRANT_ID),
    consoleMetric('Queue', model.activeAuthorityTasks.length, `${model.readyAuthorityTasks.length} ready`),
    consoleMetric('Rollback', `${model.rollbackReady}/${model.proofOps.length}`, 'verified ops'),
    consoleMetric('Secrets', model.totals.rawCredentialValuesEmitted, 'raw emitted')
  ].join('');

  authorityRiskRows.innerHTML = [
    renderAuthorityRiskRow('Secret Boundary', model.totals.rawCredentialValuesEmitted === 0, `${model.totals.rawCredentialValuesEmitted} raw values emitted`),
    renderAuthorityRiskRow('Rollback Proof', model.rollbackReady === model.proofOps.length && model.proofOps.length > 0, `${model.rollbackReady}/${model.proofOps.length} operations ready`),
    renderAuthorityRiskRow('Live Writes', true, `${model.totalWrites} audited writes/promotions`),
    renderAuthorityRiskRow('Vendor/Scene Safety', model.totals.vendorAssetWritesMade === 0 && model.totals.persistentSceneWritesMade === 0, `${model.totals.vendorAssetWritesMade} vendor / ${model.totals.persistentSceneWritesMade} scene`)
  ].join('');

  authorityLedger.innerHTML = `
    <div class="candidate-head">
      <strong>Recent Authority Operations</strong>
      <span>${model.proofOps.length} evidence records</span>
    </div>
    ${model.proofOps.slice(0, 6).map(renderAuthorityOperation).join('') || '<p class="empty-state">No authority operation evidence yet.</p>'}
  `;

  authorityQueue.innerHTML = `
    <div class="candidate-head progress-head">
      <strong>Authority Pull Queue</strong>
      <span>${model.nextPull ? model.nextPull.id : 'empty'}</span>
    </div>
    ${model.pullQueue.slice(0, 5).map(renderAuthorityQueueItem).join('') || '<p class="empty-state">No authority backlog remains.</p>'}
  `;
}

function buildAuthorityConsoleModel() {
  const authorityTasks = state.tasks.filter((task) => classifyReviewTask(task) === 'authority');
  const activeAuthorityTasks = authorityTasks.filter((task) => AUTHORITY_COLUMNS.has(task.column));
  const readyAuthorityTasks = authorityTasks.filter((task) => task.column === 'ready');
  const proofOps = authorityTasks
    .map(authorityOperationFromTask)
    .filter(Boolean)
    .sort((a, b) => b.ts.localeCompare(a.ts));
  const totals = sumAuthorityTotals(proofOps);
  const pullQueue = topProgressCandidates().filter((task) => classifyReviewTask(task) === 'authority');
  const rollbackReady = proofOps.filter((op) => op.rollbackReady).length;
  const totalWrites = [
    'datasetWritesMade',
    'prefabWritesMade',
    'persistentSceneWritesMade',
    'canonPromotionsMade',
    'generatedAssetPromotionsMade',
    'vendorAssetWritesMade'
  ].reduce((sum, field) => sum + totals[field], 0);

  return {
    grantActive: proofOps.some((op) => op.grantId === AUTHORITY_GRANT_ID) || activeAuthorityTasks.length > 0,
    authorityTasks,
    activeAuthorityTasks,
    readyAuthorityTasks,
    proofOps,
    totals,
    rollbackReady,
    totalWrites,
    pullQueue,
    nextPull: pullQueue[0] || null
  };
}

function authorityOperationFromTask(task) {
  const evidenceEvent = [...(task.history || [])].reverse().find((event) => event.payload?.acceptanceProof);
  if (!evidenceEvent) return null;
  const proof = evidenceEvent.payload.acceptanceProof || {};
  const metrics = authorityMetricsFromProof(proof);
  const evidenceLinks = latestEvidenceLinks(task);
  return {
    task,
    ts: evidenceEvent.ts,
    title: task.title,
    targetClass: inferAuthorityTargetClass(metrics, proof),
    grantId: findGrantId(task, proof),
    rollbackReady: proof.rollbackManifestCreatedBeforeWrite === true || proof.rollbackBackupCreated === true,
    metrics,
    evidenceLinks
  };
}

function authorityMetricsFromProof(proof) {
  const metrics = {};
  for (const [field, aliases] of Object.entries(AUTHORITY_FIELD_ALIASES)) {
    metrics[field] = aliases.reduce((value, alias) => value + numericProofValue(proof, alias), 0);
  }
  return metrics;
}

function numericProofValue(proof, key) {
  const value = proof?.[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
  return 0;
}

function sumAuthorityTotals(ops) {
  const totals = {};
  for (const field of Object.keys(AUTHORITY_FIELD_ALIASES)) totals[field] = 0;
  for (const op of ops) {
    for (const field of Object.keys(AUTHORITY_FIELD_ALIASES)) {
      totals[field] += op.metrics[field] || 0;
    }
  }
  return totals;
}

function inferAuthorityTargetClass(metrics, proof) {
  if (metrics.canonPromotionsMade > 0) return 'canon';
  if (metrics.datasetWritesMade > 0) return 'dataset';
  if (metrics.generatedAssetPromotionsMade > 0 && metrics.prefabWritesMade > 0) return 'prefab asset';
  if (metrics.prefabWritesMade > 0) return 'prefab';
  if (metrics.serviceCallsMade > 0 || metrics.authorizationHeadersSent > 0 || metrics.credentialFilesRead > 0) return 'live service';
  if (proof.commandType) return proof.commandType;
  return 'authority proof';
}

function findGrantId(task, proof) {
  if (proof.grantId) return proof.grantId;
  const text = JSON.stringify(task.history || []);
  return text.includes(AUTHORITY_GRANT_ID) ? AUTHORITY_GRANT_ID : 'grant reference';
}

function renderAuthorityRiskRow(label, ok, detail) {
  return `
    <div class="authority-risk-row" data-tone="${ok ? 'good' : 'warn'}">
      <span>${escapeHtml(label)}</span>
      <strong>${ok ? 'clear' : 'review'}</strong>
      <em>${escapeHtml(detail)}</em>
    </div>
  `;
}

function renderAuthorityOperation(op) {
  const writes = op.metrics.datasetWritesMade
    + op.metrics.prefabWritesMade
    + op.metrics.persistentSceneWritesMade
    + op.metrics.canonPromotionsMade
    + op.metrics.generatedAssetPromotionsMade;
  const secretTone = op.metrics.rawCredentialValuesEmitted === 0 ? 'good' : 'warn';
  return `
    <article class="authority-operation" data-tone="${escapeHtml(secretTone)}">
      <div class="candidate-title">
        <strong>${escapeHtml(op.title)}</strong>
        <span>${escapeHtml(op.task.priority)}</span>
      </div>
      <p>${escapeHtml(op.task.id)}</p>
      <div class="candidate-meta">
        <span>${escapeHtml(op.targetClass)}</span>
        <span>${writes} writes</span>
        <span>${op.metrics.credentialFilesRead} cred reads</span>
        <span>${op.metrics.authorizationHeadersSent} headers</span>
        <span>${op.rollbackReady ? 'rollback ready' : 'rollback check'}</span>
      </div>
      <div class="authority-microgrid">
        ${authorityMiniMetric('Data', op.metrics.datasetWritesMade)}
        ${authorityMiniMetric('Prefab', op.metrics.prefabWritesMade)}
        ${authorityMiniMetric('Canon', op.metrics.canonPromotionsMade)}
        ${authorityMiniMetric('Asset', op.metrics.generatedAssetPromotionsMade)}
        ${authorityMiniMetric('Secrets', op.metrics.rawCredentialValuesEmitted)}
      </div>
      <div class="candidate-evidence">${renderEvidenceLinks(op.evidenceLinks)}</div>
    </article>
  `;
}

function authorityMiniMetric(label, value) {
  return `<span><b>${value}</b>${escapeHtml(label)}</span>`;
}

function renderAuthorityQueueItem(task) {
  return `
    <article class="authority-queue-item">
      <div class="candidate-title">
        <strong>${escapeHtml(task.title)}</strong>
        <span>${escapeHtml(task.priority)}</span>
      </div>
      <p>${escapeHtml(task.id)}</p>
      <div class="candidate-meta">
        <span>${escapeHtml(task.column)}</span>
        <span>${escapeHtml(task.owner)}</span>
        <span>${escapeHtml(task.lane || 'Authority')}</span>
      </div>
    </article>
  `;
}

function renderPromotionWorkbench() {
  const model = buildPromotionWorkbenchModel();
  promotionWorkbenchGrid.innerHTML = [
    consoleMetric('Candidates', model.candidates.length, `${model.sourceLinkedCount} sourced`),
    consoleMetric('Text Changes', model.totals.proposedTextChanges, 'dry-run only'),
    consoleMetric('Authority Gates', model.totals.authorityGates, 'visible'),
    consoleMetric('UI Writers', model.uiWritersDisabled ? 'disabled' : 'review', 'this pass')
  ].join('');

  promotionWorkbenchGates.innerHTML = [
    renderPromotionGate('Source Candidate', model.sourceLinkedCount > 0, `${model.sourceLinkedCount}/${model.candidates.length} cards link evidence`),
    renderPromotionGate('Writer Lock', model.uiWritersDisabled, '0 prefab / 0 scene / 0 asset writes this pass'),
    renderPromotionGate('Rollback Notes', model.rollbackVisibleCount === model.candidates.length && model.candidates.length > 0, `${model.rollbackVisibleCount}/${model.candidates.length} rows visible; ${model.rollbackSpecificCount} specific`),
    renderPromotionGate('Secret Boundary', model.totals.rawCredentialValuesEmitted === 0, `${model.totals.rawCredentialValuesEmitted} raw values emitted`)
  ].join('');

  promotionWorkbenchCandidates.innerHTML = `
    <div class="candidate-head">
      <strong>Promotion Candidates</strong>
      <span>${model.promotedEvidenceCount} promoted proof / ${model.dryRunCount} dry-run</span>
    </div>
    ${model.candidates.slice(0, 8).map(renderPromotionCandidate).join('') || '<p class="empty-state">No promotion candidates found.</p>'}
  `;

  promotionWorkbenchRollback.innerHTML = `
    <div class="candidate-head progress-head">
      <strong>Rollback And Locks</strong>
      <span>${model.currentTask ? model.currentTask.id : 'no active UI card'}</span>
    </div>
    ${model.candidates.slice(0, 8).map(renderPromotionRollbackRow).join('') || '<p class="empty-state">No rollback notes available.</p>'}
  `;
}

function buildPromotionWorkbenchModel() {
  const candidates = state.tasks
    .filter(isPromotionWorkbenchTask)
    .map(promotionCandidateFromTask)
    .sort((a, b) => {
      const modeWeight = { 'ui preview': 0, 'dry-run': 1, 'runtime preview': 2, 'protocol': 3, 'promotion evidence': 4 };
      const modeDelta = (modeWeight[a.mode] ?? 9) - (modeWeight[b.mode] ?? 9);
      if (modeDelta) return modeDelta;
      return a.task.createdAt.localeCompare(b.task.createdAt);
    });
  const totals = sumPromotionTotals(candidates);
  const currentTask = state.tasks.find((task) => task.id === 'phase4-generated-asset-promotion-workbench-ui') || null;
  const sourceLinkedCount = candidates.filter((candidate) => candidate.evidenceLinks.length > 0).length;
  const rollbackSpecificCount = candidates.filter((candidate) => candidate.rollbackNote).length;
  const rollbackVisibleCount = candidates.length;
  const promotedEvidenceCount = candidates.filter((candidate) => candidate.mode === 'promotion evidence').length;
  const dryRunCount = candidates.filter((candidate) => candidate.mode === 'dry-run').length;
  const uiWritersDisabled = totals.currentRunPrefabWrites === 0
    && totals.currentRunSceneWrites === 0
    && totals.currentRunGeneratedPromotions === 0
    && totals.currentRunVendorWrites === 0;

  return {
    candidates,
    totals,
    currentTask,
    sourceLinkedCount,
    rollbackVisibleCount,
    rollbackSpecificCount,
    promotedEvidenceCount,
    dryRunCount,
    uiWritersDisabled
  };
}

function isPromotionWorkbenchTask(task) {
  if (PROMOTION_TASK_HINTS[task.id]) return true;
  const text = [
    task.id,
    task.title,
    task.lane,
    ...(task.tags || [])
  ].join(' ').toLowerCase();
  return matchesAny(text, [
    'build recipe promotion',
    'promotion dry-run',
    'promotion workbench',
    'asset kit promotion',
    'generated ship prefab',
    'generated asset promotion',
    'builder review console'
  ]);
}

function promotionCandidateFromTask(task) {
  const hint = PROMOTION_TASK_HINTS[task.id] || {};
  const evidenceEvent = [...(task.history || [])].reverse().find((event) => event.payload?.acceptanceProof);
  const proof = evidenceEvent?.payload?.acceptanceProof || {};
  const historyText = (task.history || [])
    .map((event) => [event.payload?.body, event.payload?.comment].filter(Boolean).join(' '))
    .join(' ');
  const metrics = promotionMetricsFromProof(proof, historyText, hint);
  const evidenceLinks = latestEvidenceLinks(task);
  const writes = metrics.prefabWritesMade + metrics.persistentSceneWritesMade + metrics.generatedAssetPromotionsMade + metrics.vendorAssetWritesMade;

  return {
    task,
    mode: hint.mode || (writes > 0 ? 'promotion evidence' : 'dry-run'),
    source: hint.source || evidenceLinks[0]?.label || task.node || task.lane || 'Promotion source',
    proposedTextChanges: metrics.proposedTextChanges,
    authorityGates: metrics.authorityGates,
    rollbackNote: hint.rollback || inferRollbackNote(proof, task),
    evidenceLinks,
    metrics,
    writes
  };
}

function promotionMetricsFromProof(proof, historyText, hint) {
  const metrics = {};
  for (const [field, aliases] of Object.entries(PROMOTION_FIELD_ALIASES)) {
    metrics[field] = aliases.reduce((value, alias) => value + numericProofValue(proof, alias), 0);
  }
  metrics.proposedTextChanges += hint.proposedTextChanges || inferCount(historyText, /(\d+)\s+proposed (?:text |build |prefab |scene )?changes?/i);
  metrics.authorityGates += hint.authorityGates || inferCount(historyText, /(\d+)\s+(?:authority |human-authority |promotion )?gates?/i);
  return metrics;
}

function inferCount(text, pattern) {
  const match = String(text || '').match(pattern);
  return match ? Number(match[1]) : 0;
}

function inferRollbackNote(proof, task) {
  if (proof.rollbackManifestCreatedBeforeWrite || proof.rollbackBackupCreated) return 'Rollback manifest or backup was recorded before write.';
  if (task.acceptance?.some((item) => item.toLowerCase().includes('rollback'))) return 'Rollback expectation is listed in acceptance criteria.';
  if (task.description?.toLowerCase().includes('rollback')) return 'Rollback preview is described on the card.';
  return '';
}

function sumPromotionTotals(candidates) {
  const totals = {
    proposedTextChanges: 0,
    authorityGates: 0,
    rawCredentialValuesEmitted: 0,
    currentRunPrefabWrites: 0,
    currentRunSceneWrites: 0,
    currentRunGeneratedPromotions: 0,
    currentRunVendorWrites: 0,
    sourcePrefabWrites: 0,
    sourceSceneWrites: 0,
    sourceGeneratedPromotions: 0,
    sourceVendorWrites: 0
  };
  for (const candidate of candidates) {
    totals.proposedTextChanges += candidate.proposedTextChanges;
    totals.authorityGates += candidate.authorityGates;
    totals.rawCredentialValuesEmitted += candidate.metrics.rawCredentialValuesEmitted || 0;
    totals.sourcePrefabWrites += candidate.metrics.prefabWritesMade || 0;
    totals.sourceSceneWrites += candidate.metrics.persistentSceneWritesMade || 0;
    totals.sourceGeneratedPromotions += candidate.metrics.generatedAssetPromotionsMade || 0;
    totals.sourceVendorWrites += candidate.metrics.vendorAssetWritesMade || 0;
    if (candidate.task.id === 'phase4-generated-asset-promotion-workbench-ui') {
      totals.currentRunPrefabWrites += candidate.metrics.prefabWritesMade || 0;
      totals.currentRunSceneWrites += candidate.metrics.persistentSceneWritesMade || 0;
      totals.currentRunGeneratedPromotions += candidate.metrics.generatedAssetPromotionsMade || 0;
      totals.currentRunVendorWrites += candidate.metrics.vendorAssetWritesMade || 0;
    }
  }
  return totals;
}

function renderPromotionGate(label, ok, detail) {
  return `
    <div class="promotion-gate" data-tone="${ok ? 'good' : 'warn'}">
      <span>${escapeHtml(label)}</span>
      <strong>${ok ? 'clear' : 'review'}</strong>
      <em>${escapeHtml(detail)}</em>
    </div>
  `;
}

function renderPromotionCandidate(candidate) {
  const writeTone = candidate.task.id === 'phase4-generated-asset-promotion-workbench-ui' && candidate.writes > 0 ? 'warn' : 'good';
  return `
    <article class="promotion-candidate" data-tone="${escapeHtml(writeTone)}">
      <div class="candidate-title">
        <strong>${escapeHtml(candidate.task.title)}</strong>
        <span>${escapeHtml(candidate.task.priority)}</span>
      </div>
      <p>${escapeHtml(candidate.source)}</p>
      <div class="candidate-meta">
        <span>${escapeHtml(candidate.mode)}</span>
        <span>${candidate.proposedTextChanges} text changes</span>
        <span>${candidate.authorityGates} gates</span>
        <span>${candidate.writes} source writes</span>
      </div>
      <div class="candidate-evidence">${renderEvidenceLinks(candidate.evidenceLinks)}</div>
    </article>
  `;
}

function renderPromotionRollbackRow(candidate) {
  return `
    <article class="promotion-rollback-row">
      <div class="candidate-title">
        <strong>${escapeHtml(candidate.task.id)}</strong>
        <span>${escapeHtml(candidate.mode)}</span>
      </div>
      <p>${escapeHtml(candidate.rollbackNote || 'Rollback note not recorded; keep in review and do not promote until a rollback path is written.')}</p>
    </article>
  `;
}

function getReviewTasks() {
  return state.tasks.filter((task) => task.column === 'review');
}

function summarizeReviewLanes(reviewTasks) {
  const lanes = [
    {
      id: 'authority',
      label: 'Authority Gated',
      prompt: 'Promotion, canon, Janus, Anvil, Lance, assets',
      tone: 'warn',
      count: 0
    },
    {
      id: 'device',
      label: 'Device Evidence',
      prompt: 'Phone, LAN, QR, sensor, 6DOF proof',
      tone: 'warn',
      count: 0
    },
    {
      id: 'visual',
      label: 'Live / Visual Check',
      prompt: 'Unity, demo, browser, scene, interior proof',
      tone: 'info',
      count: 0
    },
    {
      id: 'evidence',
      label: 'Evidence Skim',
      prompt: 'Generated/read-only proof review',
      tone: 'good',
      count: 0
    },
    {
      id: 'missing',
      label: 'Evidence Needed',
      prompt: 'No linked artifact found in history',
      tone: 'quiet',
      count: 0
    }
  ];
  const index = new Map(lanes.map((lane) => [lane.id, lane]));
  for (const task of reviewTasks) index.get(classifyReviewTask(task)).count += 1;
  return lanes;
}

function renderReviewCandidate(task) {
  const row = summarizeReviewCandidate(task);
  return `
    <article class="review-candidate" data-risk="${escapeHtml(row.risk)}">
      <div class="candidate-title">
        <strong>${escapeHtml(task.title)}</strong>
        <span>${escapeHtml(task.priority)}</span>
      </div>
      <p>${escapeHtml(task.id)}</p>
      <div class="candidate-meta">
        <span>${escapeHtml(task.owner)}</span>
        <span>${escapeHtml(row.laneLabel)}</span>
        <span>${escapeHtml(row.risk)} risk</span>
        <span>${escapeHtml(row.proofStrength)} proof</span>
      </div>
      <div class="candidate-evidence">${renderEvidenceLinks(row.evidence)}</div>
      <div class="candidate-path">
        <span>${escapeHtml(row.recommendedDecisionPath)}</span>
        <em>${escapeHtml(row.noteStarter)}</em>
      </div>
      <button type="button" data-console-gate="${escapeHtml(task.id)}">Gate</button>
    </article>
  `;
}

function renderProgressCandidate(task) {
  const laneId = classifyReviewTask(task);
  return `
    <article class="review-candidate progress-candidate" data-risk="${escapeHtml(reviewRisk(task, laneId))}">
      <div class="candidate-title">
        <strong>${escapeHtml(task.title)}</strong>
        <span>${escapeHtml(task.priority)}</span>
      </div>
      <p>${escapeHtml(task.id)}</p>
      <div class="candidate-meta">
        <span>${escapeHtml(task.column)}</span>
        <span>${escapeHtml(task.owner)}</span>
        <span>${escapeHtml(task.lane || 'Coordination')}</span>
      </div>
    </article>
  `;
}

function summarizeReviewCandidate(task) {
  const laneId = classifyReviewTask(task);
  const evidence = latestEvidenceLinks(task);
  const risk = reviewRisk(task, laneId);
  const proofStrength = evidence.length >= 2 ? 'linked' : evidence.length === 1 ? 'partial' : 'missing';
  return {
    laneId,
    laneLabel: summarizeReviewLanes([]).find((lane) => lane.id === laneId)?.label || 'Review',
    evidence,
    risk,
    proofStrength,
    recommendedDecisionPath: recommendedDecisionPath(task, laneId, proofStrength),
    noteStarter: noteStarter(task, laneId, proofStrength)
  };
}

function topReviewCandidates(reviewTasks) {
  return [...reviewTasks].sort((a, b) => {
    const laneWeight = {
      authority: 0,
      device: 1,
      visual: 2,
      missing: 3,
      evidence: 4
    };
    const priorityWeight = { P0: 0, P1: 1, P2: 2, P3: 3 };
    const laneDelta = laneWeight[classifyReviewTask(a)] - laneWeight[classifyReviewTask(b)];
    if (laneDelta) return laneDelta;
    const priorityDelta = (priorityWeight[a.priority] ?? 9) - (priorityWeight[b.priority] ?? 9);
    if (priorityDelta) return priorityDelta;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

function topProgressCandidates() {
  const columnWeight = { ready: 0, in_progress: 1, 'in-progress': 1, backlog: 2, review: 3 };
  const priorityWeight = { P0: 0, P1: 1, P2: 2, P3: 3 };
  return state.tasks
    .filter((task) => ['ready', 'in_progress', 'in-progress', 'backlog'].includes(task.column))
    .sort((a, b) => {
      const columnDelta = (columnWeight[a.column] ?? 9) - (columnWeight[b.column] ?? 9);
      if (columnDelta) return columnDelta;
      const priorityDelta = (priorityWeight[a.priority] ?? 9) - (priorityWeight[b.priority] ?? 9);
      if (priorityDelta) return priorityDelta;
      const authorityDelta = Number(classifyReviewTask(b) === 'authority') - Number(classifyReviewTask(a) === 'authority');
      if (authorityDelta) return authorityDelta;
      return a.createdAt.localeCompare(b.createdAt);
    });
}

function classifyReviewTask(task) {
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
  if (latestEvidenceLinks(task).length === 0) return 'missing';
  return 'evidence';
}

function matchesAny(value, needles) {
  return needles.some((needle) => value.includes(needle));
}

function latestEvidenceLinks(task) {
  const seen = new Set();
  const links = [];
  for (const event of [...(task.history || [])].reverse()) {
    for (const link of event.links || []) {
      if (!link.href || seen.has(link.href)) continue;
      seen.add(link.href);
      links.push(link);
      if (links.length >= 3) return links;
    }
  }
  return links;
}

function reviewRisk(task, laneId) {
  if (laneId === 'authority' || laneId === 'device') return 'high';
  if (laneId === 'visual' || task.priority === 'P0') return 'medium';
  return 'low';
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

function renderEvidenceLinks(links) {
  if (!links.length) return '<span>No evidence link</span>';
  return links
    .slice(0, 2)
    .map((link) => `<a href="${escapeHtml(link.href)}" title="${escapeHtml(link.href)}">${escapeHtml(link.label || 'Evidence')}</a>`)
    .join('');
}

function renderReviewGate() {
  const reviewTasks = state.reviewGate?.reviewTasks || state.tasks.filter((task) => task.column === 'review');
  const currentValue = reviewTask.value;
  reviewTask.innerHTML = reviewTasks.length
    ? reviewTasks
        .map((task) => `<option value="${escapeHtml(task.id)}">${escapeHtml(task.priority)} / ${escapeHtml(task.owner)} / ${escapeHtml(task.title)}</option>`)
        .join('')
    : '<option value="">No review cards</option>';
  if (reviewTasks.some((task) => task.id === currentValue)) reviewTask.value = currentValue;
  reviewTask.disabled = reviewTasks.length === 0;
  renderReviewDecisionControls();
}

function renderReviewDecisionControls() {
  const isPromote = reviewDecision.value === 'promote';
  reviewFollowupWrap.hidden = !isPromote;
  reviewFollowupTitle.required = isPromote;
}

function renderMessages() {
  messageLog.innerHTML = state.messages
    .map((message) => `
      <article class="message">
        <div class="message-head">
          <strong>${escapeHtml(message.actor)} / ${escapeHtml(message.scope)}</strong>
          <span>${formatTime(message.ts)}</span>
        </div>
        <p>${escapeHtml(message.body)}</p>
      </article>
    `)
    .join('');
}

async function appendMessage(event) {
  event.preventDefault();
  const body = document.querySelector('#messageBody').value.trim();
  if (!body) return;
  await appendEvent({
    type: 'message',
    actor: messageActor.value,
    payload: {
      scope: document.querySelector('#messageScope').value,
      body
    }
  });
  document.querySelector('#messageBody').value = '';
  await loadState();
}

async function createTask(event) {
  event.preventDefault();
  const title = document.querySelector('#taskTitle').value.trim();
  const description = document.querySelector('#taskDescription').value.trim();
  if (!title) return;
  const taskId = slugify(title);
  await appendEvent({
    type: 'task_created',
    actor: 'Overwatch',
    task_id: taskId,
    payload: {
      taskId,
      title,
      description,
      column: 'backlog',
      owner: taskOwner.value,
      priority: document.querySelector('#taskPriority').value,
      lane: 'Coordination',
      tags: ['manual'],
      acceptance: []
    }
  });
  document.querySelector('#taskTitle').value = '';
  document.querySelector('#taskDescription').value = '';
  await loadState();
}

async function appendReviewDecision(event) {
  event.preventDefault();
  const taskId = reviewTask.value;
  const decision = reviewDecision.value;
  const actor = reviewActor.value || 'Human';
  const evidenceHref = reviewEvidence.value.trim();
  const note = reviewNote.value.trim();
  const followupTitle = reviewFollowupTitle.value.trim();

  if (!taskId || !evidenceHref || !note) {
    reviewStatus.textContent = 'Review card, evidence link, and human note are required.';
    return;
  }

  const response = await fetch(`/v1/projects/${projectId}/review-decisions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, decision, actor, evidenceHref, note, followupTitle })
  });
  const payload = await response.json();
  if (!payload.ok) throw new Error(payload.error || 'Failed to append review decision.');

  reviewStatus.textContent = `${taskId}: ${decision} -> ${payload.result.targetColumn}`;
  reviewEvidence.value = '';
  reviewNote.value = '';
  reviewFollowupTitle.value = '';
  await loadState();
}

async function moveTask(taskId, to, actor) {
  await appendEvent({
    type: 'task_moved',
    actor,
    task_id: taskId,
    payload: { to }
  });
  await loadState();
}

function focusReviewGate(taskId) {
  reviewTask.value = taskId;
  reviewStatus.textContent = `${taskId} selected for human review.`;
  document.querySelector('.review-gate').scrollIntoView({ block: 'center', behavior: 'smooth' });
}

async function blockTask(taskId) {
  const reason = window.prompt('Block reason?');
  if (!reason) return;
  await appendEvent({
    type: 'task_blocked',
    actor: 'Overwatch',
    task_id: taskId,
    payload: { reason }
  });
  await loadState();
}

async function commentTask(taskId) {
  const body = window.prompt('Append task note?');
  if (!body) return;
  await appendEvent({
    type: 'task_comment',
    actor: 'Overwatch',
    task_id: taskId,
    payload: { body }
  });
  await appendEvent({
    type: 'message',
    actor: 'Overwatch',
    task_id: taskId,
    payload: { scope: 'task', body: `${taskId}: ${body}` }
  });
  await loadState();
}

async function appendEvent(event) {
  const response = await fetch(`/v1/projects/${projectId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event)
  });
  const payload = await response.json();
  if (!payload.ok) throw new Error(payload.error || 'Failed to append event.');
  return payload.event;
}

function metric(label, value) {
  return `
    <div class="metric">
      <strong>${escapeHtml(String(value))}</strong>
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function consoleMetric(label, value, hint) {
  return `
    <div class="console-metric">
      <strong>${escapeHtml(String(value))}</strong>
      <span>${escapeHtml(label)}</span>
      <em>${escapeHtml(hint)}</em>
    </div>
  `;
}

function pill(label, tone = '') {
  return `<span class="pill ${tone}">${escapeHtml(label)}</span>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function slugify(value) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `${base || 'task'}-${Date.now().toString(36)}`;
}

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}
