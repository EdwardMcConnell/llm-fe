// MACHINE GENERATED FILE. DO NOT EDIT BY HAND.

function safeClassToken(val) {
  if (val == null) return '';
  return String(val).toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

function formatCurrency(val) {
  if (val == null) return '';
  return '$' + Number(val).toFixed(2);
}

export function createKanbanCard(initialState, eventSink) {
  const template = document.createElement('template');
  template.innerHTML = `<fe-card class="card" data-node="root"><div class="lock-badge" data-node="lockBadge"></div><div class="card-title" spellcheck="false" data-node="titleNode"></div><div class="card-meta"><fe-time format="relative" data-node="timeNode"></fe-time></div><div class="card-actions" data-node="actionsNode"><button class="delete-btn" data-node="deleteBtn">Delete</button><fe-tooltip data-node="tooltip">Delete this task permanently</fe-tooltip></div></fe-card>`;
  
  const root = template.content.firstElementChild.cloneNode(true);
  const lockBadgeElement = root.matches(`[data-node="lockBadge"]`) ? root : root.querySelector(`[data-node="lockBadge"]`);
  const titleNodeElement = root.matches(`[data-node="titleNode"]`) ? root : root.querySelector(`[data-node="titleNode"]`);
  const timeNodeElement = root.matches(`[data-node="timeNode"]`) ? root : root.querySelector(`[data-node="timeNode"]`);
  const actionsNodeElement = root.matches(`[data-node="actionsNode"]`) ? root : root.querySelector(`[data-node="actionsNode"]`);
  const deleteBtnElement = root.matches(`[data-node="deleteBtn"]`) ? root : root.querySelector(`[data-node="deleteBtn"]`);
  const tooltipElement = root.matches(`[data-node="tooltip"]`) ? root : root.querySelector(`[data-node="tooltip"]`);

  let currentId;
  let currentTitle;
  let currentIsoDate;
  let currentLockedBy;
  let currentIsLocked;

  function patchId(nextVal) {
    if (currentId === nextVal) return;
    currentId = nextVal;
    if (nextVal == null || nextVal === false) { root.removeAttribute('data-id'); } else { root.setAttribute('data-id', nextVal === true ? 'true' : nextVal); }
    if (nextVal == null || nextVal === false) { deleteBtnElement.removeAttribute('data-id'); } else { deleteBtnElement.setAttribute('data-id', nextVal === true ? 'true' : nextVal); }
    if (nextVal == null || nextVal === false) { deleteBtnElement.removeAttribute('id'); } else { deleteBtnElement.setAttribute('id', nextVal === true ? 'true' : nextVal); }
    if (nextVal == null || nextVal === false) { tooltipElement.removeAttribute('trigger'); } else { tooltipElement.setAttribute('trigger', nextVal === true ? 'true' : nextVal); }
  }

  function patchTitle(nextVal) {
    if (currentTitle === nextVal) return;
    currentTitle = nextVal;
    titleNodeElement.textContent = nextVal == null ? '' : String(nextVal);
  }

  function patchIsoDate(nextVal) {
    if (currentIsoDate === nextVal) return;
    currentIsoDate = nextVal;
    if (nextVal == null || nextVal === false) { timeNodeElement.removeAttribute('datetime'); } else { timeNodeElement.setAttribute('datetime', nextVal === true ? 'true' : nextVal); }
  }

  function patchLockedBy(nextVal) {
    if (currentLockedBy === nextVal) return;
    currentLockedBy = nextVal;
    lockBadgeElement.textContent = nextVal == null ? '' : `🔒 Locked by ${String(nextVal)}`;
  }

  function patchIsLocked(nextVal) {
    if (currentIsLocked === nextVal) return;
    currentIsLocked = nextVal;
    root.className = nextVal ? `card locked` : `card`;
    if (nextVal) { root.setAttribute('draggable', 'false'); } else { root.setAttribute('draggable', 'true'); }
    if (nextVal) { titleNodeElement.setAttribute('contenteditable', 'false'); } else { titleNodeElement.setAttribute('contenteditable', 'true'); }
    lockBadgeElement.style.display = nextVal ? 'inline-block' : 'none';
    actionsNodeElement.style.display = nextVal ? 'none' : 'flex';
  }

  function handleonDelete(event) {
    eventSink({ type: 'card:delete', sourceEvent: event });
  }
  deleteBtnElement.addEventListener('click', handleonDelete);

  function handleonEdit(event) {
    eventSink({ type: 'card:editTitle', sourceEvent: event });
  }
  titleNodeElement.addEventListener('input', handleonEdit);

  function handleonDragStart(event) {
    eventSink({ type: 'card:dragstart', sourceEvent: event });
  }
  root.addEventListener('dragstart', handleonDragStart);

  function patch(nextState) {
    patchId(nextState.id);
    patchTitle(nextState.title);
    patchIsoDate(nextState.isoDate);
    patchLockedBy(nextState.lockedBy);
    patchIsLocked(nextState.isLocked);
  }

  function dispose() {
    deleteBtnElement.removeEventListener('click', handleonDelete);
    titleNodeElement.removeEventListener('input', handleonEdit);
    root.removeEventListener('dragstart', handleonDragStart);
  }

  patch(initialState);

  return { root, patch, dispose };
}
