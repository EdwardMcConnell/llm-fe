// Compiled deterministically from generated-examples/data-grid/data-grid.generated.js Data Grid IR
export function createDataGrid(sharedMap) {
  const template = document.createElement('template');
  template.innerHTML = `<div class="data-grid" data-node="root"><div class="grid-header" data-node="header"></div><div class="grid-body" data-node="body"></div></div>`;
  const root = template.content.firstElementChild.cloneNode(true);
  
  const headerElement = root.querySelector(`[data-node="header"]`);
  const bodyElement = root.querySelector(`[data-node="body"]`);

  // Virtualization State
  const ROW_HEIGHT = 32;
  const OVERSCAN = 5;
  let rowsData = [];
  let colsData = [];
  let scrollTop = 0;
  let clientHeight = 400; // default, update on resize

  function patchColumns(cols) {
    colsData = cols || [];
    headerElement.innerHTML = '';
    for (const col of colsData) {
      const el = document.createElement('div');
      el.className = 'grid-cell header-cell';
      el.textContent = col;
      headerElement.appendChild(el);
    }
    renderVirtualRows();
  }

  function patchRows(rows) {
    rowsData = rows || [];
    renderVirtualRows();
  }

  function patchCell(rowId, colId, val) {
    // In a direct patch mode, we would directly find the rendered cell and update its textContent.
    // For virtualization, if the row is rendered, patch it.
    const rowEl = bodyElement.querySelector(`[data-row-id="${rowId}"]`);
    if (rowEl) {
      const cellEl = rowEl.querySelector(`[data-col-id="${colId}"]`);
      if (cellEl) cellEl.textContent = val == null ? '' : String(val);
    }
  }

  function renderVirtualRows() {
    const totalHeight = rowsData.length * ROW_HEIGHT;
    // Set a spacer to force scroll height
    let spacer = bodyElement.querySelector('.virtual-spacer');
    if (!spacer) {
      spacer = document.createElement('div');
      spacer.className = 'virtual-spacer';
      spacer.style.width = '1px';
      bodyElement.appendChild(spacer);
    }
    spacer.style.height = totalHeight + 'px';

    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const endIndex = Math.min(rowsData.length, Math.floor((scrollTop + clientHeight) / ROW_HEIGHT) + OVERSCAN);

    // Naive virtual reconciliation
    const existing = new Set();
    for (const child of bodyElement.children) {
      if (child.className === 'virtual-spacer') continue;
      const idx = parseInt(child.dataset.index, 10);
      if (idx >= startIndex && idx < endIndex) {
        existing.add(idx);
      } else {
        bodyElement.removeChild(child);
      }
    }

    for (let i = startIndex; i < endIndex; i++) {
      if (!existing.has(i)) {
        const rowId = rowsData[i];
        const rowEl = document.createElement('div');
        rowEl.className = 'grid-row';
        rowEl.dataset.index = i;
        rowEl.dataset.rowId = rowId;
        rowEl.style.position = 'absolute';
        rowEl.style.top = (i * ROW_HEIGHT) + 'px';
        rowEl.style.display = 'flex';
        rowEl.style.width = '100%';

        for (const col of colsData) {
          const cellEl = document.createElement('div');
          cellEl.className = 'grid-cell';
          cellEl.dataset.colId = col;
          cellEl.textContent = sharedMap.get(`grid:cell:${rowId}:${col}`) || '';
          rowEl.appendChild(cellEl);
        }

        bodyElement.appendChild(rowEl);
      }
    }
  }

  bodyElement.addEventListener('scroll', () => {
    scrollTop = bodyElement.scrollTop;
    clientHeight = bodyElement.clientHeight;
    renderVirtualRows();
  });

  // Observe CRDT
  const cleanups = [];
  
  const observeMap = () => {
    for (const [key, val] of sharedMap.entries()) {
      if (key === 'grid:columns') patchColumns(val);
      else if (key === 'grid:rows') patchRows(val);
    }
  };

  const disposeSub = sharedMap.subscribe((key, val) => {
    if (key === 'grid:columns') patchColumns(val);
    else if (key === 'grid:rows') patchRows(val);
    else if (key.startsWith('grid:cell:')) {
      const parts = key.split(':');
      patchCell(parts[2], parts[3], val);
    }
  });

  cleanups.push(disposeSub);
  observeMap();

  return {
    root,
    dispose: () => cleanups.forEach(c => c())
  };
}
