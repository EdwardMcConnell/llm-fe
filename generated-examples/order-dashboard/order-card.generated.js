// MACHINE GENERATED FILE. DO NOT EDIT BY HAND.

function safeClassToken(val) {
  if (val == null) return '';
  return String(val).toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

function formatCurrency(val) {
  if (val == null) return '';
  return '$' + Number(val).toFixed(2);
}

export function createOrderCard(initialState, eventSink) {
  const template = document.createElement('template');
  template.innerHTML = `<article data-node='root'><h3 data-node='titleText'></h3><span data-node='statusBadge'></span><p data-node='totalText'></p></article>`;
  
  const root = template.content.firstElementChild.cloneNode(true);
  const titleTextElement = root.matches(`[data-node='titleText']`) ? root : root.querySelector(`[data-node='titleText']`);
  const statusBadgeElement = root.matches(`[data-node='statusBadge']`) ? root : root.querySelector(`[data-node='statusBadge']`);
  const totalTextElement = root.matches(`[data-node='totalText']`) ? root : root.querySelector(`[data-node='totalText']`);
  const titleTextTextNode = document.createTextNode('');
  titleTextElement.appendChild(titleTextTextNode);
  const totalTextTextNode = document.createTextNode('');
  totalTextElement.appendChild(totalTextTextNode);

  let currentOrderTitle;
  let currentOrderStatus;
  let currentOrderTotal;

  function patchOrderTitle(nextVal) {
    if (currentOrderTitle === nextVal) return;
    currentOrderTitle = nextVal;
    titleTextTextNode.nodeValue = nextVal == null ? '' : String(nextVal);
  }

  function patchOrderStatus(nextVal) {
    if (currentOrderStatus === nextVal) return;
    currentOrderStatus = nextVal;
    statusBadgeElement.textContent = nextVal == null ? '' : String(nextVal);
    statusBadgeElement.className = `status-${safeClassToken(nextVal)}`;
  }

  function patchOrderTotal(nextVal) {
    if (currentOrderTotal === nextVal) return;
    currentOrderTotal = nextVal;
    totalTextTextNode.nodeValue = formatCurrency(nextVal);
  }

  function handleonSelect(event) {
    eventSink({ type: 'order:selected', sourceEvent: event });
  }
  root.addEventListener('click', handleonSelect);

  function patch(nextState) {
    patchOrderTitle(nextState.orderTitle);
    patchOrderStatus(nextState.orderStatus);
    patchOrderTotal(nextState.orderTotal);
  }

  function dispose() {
    root.removeEventListener('click', handleonSelect);
  }

  patch(initialState);

  return { root, patch, dispose };
}
