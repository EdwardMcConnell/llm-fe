// Compiled deterministically from data-grid.ir.json Data Grid IR
export function createDataGrid(sharedMap) {
  const template = document.createElement('template');
  template.innerHTML = `<div data-node="root" style="display:flex; flex-direction:column; width:100%; height:100%; font-family:sans-serif;"><style>.grid-toolbar { padding: 1rem; background: #1a1a1a; border-bottom: 1px solid #333; display: flex; gap: 1rem; } .grid-search { padding: 0.5rem; background: #000; color: #fff; border: 1px solid #444; border-radius: 4px; width: 300px; } .grid-header { display: flex; font-weight: bold; border-bottom: 1px solid #444; background: #222; color: #ccc; user-select: none; } .grid-cell { flex: 1; padding: 8px; border-right: 1px solid #333; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; } .header-cell { cursor: pointer; } .header-cell:hover { background: #333; } .header-cell[data-sort="asc"]::after { content: ' \\\\2191'; color: #4ade80; } .header-cell[data-sort="desc"]::after { content: ' \\\\2193'; color: #4ade80; } .grid-body { flex: 1; position: relative; overflow-y: auto; background: #111; color: #eee; outline: none; } .grid-row { display: flex; width: 100%; border-bottom: 1px solid #222; cursor: pointer; } .grid-row:hover { background: #2a2a2a; } .grid-row.selected { background: #1e3a8a; } .grid-row.focused { outline: 2px solid #60a5fa; outline-offset: -2px; z-index: 1; }</style><div class="grid-toolbar"><input type="text" class="grid-search" id="gridSearch" placeholder="Search records..." /></div><div class="grid-header" id="gridHeader"></div><div class="grid-body" id="gridBody" tabindex="0"></div></div>`;
  const root = template.content.firstElementChild.cloneNode(true);
  
  const searchElement = root.querySelector(`#gridSearch`);
  const headerElement = root.querySelector(`#gridHeader`);
  const bodyElement = root.querySelector(`#gridBody`);

  // Virtualization State
  bodyElement.tabIndex = 0;
  const ROW_HEIGHT = 32;
  const OVERSCAN = 5;
  let rowsData = [];
  let colsData = [];
  let scrollTop = 0;
  let clientHeight = 400; // default, update on resize
  
  // Tier A Feature State
  let filterText = '';
  let sortCol = null;
  let sortAsc = true;
  let selectedRows = new Set();
  let focusedRow = null;
  let processedRows = [];

  function recalculateProcessedRows() {
    let result = rowsData.slice();
    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      result = result.filter(rowId => {
        for (const col of colsData) {
          const val = sharedMap.get(`grid:cell:${rowId}:${col}`);
          if (val && String(val).toLowerCase().includes(lowerFilter)) return true;
        }
        return false;
      });
    }
    if (sortCol) {
      result.sort((a, b) => {
        const valA = sharedMap.get(`grid:cell:${a}:${sortCol}`) || '';
        const valB = sharedMap.get(`grid:cell:${b}:${sortCol}`) || '';
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
    }
    processedRows = result;
    renderVirtualRows();
  }

  function patchColumns(cols) {
    colsData = cols || [];
    headerElement.innerHTML = '';
    for (const col of colsData) {
      const el = document.createElement('div');
      el.className = 'grid-cell header-cell';
      el.dataset.col = col;
      el.textContent = col;
      if (col === sortCol) {
        el.dataset.sort = sortAsc ? 'asc' : 'desc';
      }
      el.addEventListener('click', () => {
        const newAsc = sortCol === col ? !sortAsc : true;
        sharedMap.set('grid:sortCol', col);
        sharedMap.set('grid:sortAsc', newAsc);
      });
      headerElement.appendChild(el);
    }
    recalculateProcessedRows();
  }

  function patchRows(rows) {
    rowsData = rows || [];
    recalculateProcessedRows();
  }

  function patchCell(rowId, colId, val) {
    const rowEl = bodyElement.querySelector(`[data-row-id="${rowId}"]`);
    if (rowEl) {
      const cellEl = rowEl.querySelector(`[data-col-id="${colId}"]`);
      if (cellEl) cellEl.textContent = val == null ? '' : String(val);
    }
    if (filterText || sortCol === colId) {
      // Defer full recalculation to avoid layout thrashing on mass edits.
      // In a real framework we'd schedule a microtask. We do a naive sync recalc here.
      recalculateProcessedRows();
    }
  }

  function patchFilter(val) {
    filterText = val || '';
    if (searchElement && searchElement.value !== filterText) {
      searchElement.value = filterText;
    }
    recalculateProcessedRows();
  }

  function patchSortCol(val) {
    sortCol = val;
    patchColumns(colsData);
  }

  function patchSortAsc(val) {
    sortAsc = !!val;
    patchColumns(colsData);
  }

  function patchSelectedRows(arr) {
    selectedRows = new Set(arr || []);
    for (const child of bodyElement.children) {
      if (child.className.includes('grid-row')) {
        const isSelected = selectedRows.has(child.dataset.rowId);
        child.classList.toggle('selected', isSelected);
      }
    }
  }

  function patchFocusedRow(rowId) {
    focusedRow = rowId;
    for (const child of bodyElement.children) {
      if (child.className.includes('grid-row')) {
        const isFocused = child.dataset.rowId === focusedRow;
        child.classList.toggle('focused', isFocused);
      }
    }
  }

  function renderVirtualRows() {
    const totalHeight = processedRows.length * ROW_HEIGHT;
    let spacer = bodyElement.querySelector('.virtual-spacer');
    if (!spacer) {
      spacer = document.createElement('div');
      spacer.className = 'virtual-spacer';
      spacer.style.width = '1px';
      bodyElement.appendChild(spacer);
    }
    spacer.style.height = totalHeight + 'px';

    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const endIndex = Math.min(processedRows.length, Math.floor((scrollTop + clientHeight) / ROW_HEIGHT) + OVERSCAN);

    const existing = new Set();
    for (const child of Array.from(bodyElement.children)) {
      if (child.className === 'virtual-spacer') continue;
      const idx = parseInt(child.dataset.index, 10);
      if (idx >= startIndex && idx < endIndex && child.dataset.rowId === processedRows[idx]) {
        existing.add(idx);
      } else {
        bodyElement.removeChild(child);
      }
    }

    for (let i = startIndex; i < endIndex; i++) {
      if (!existing.has(i)) {
        const rowId = processedRows[i];
        const rowEl = document.createElement('div');
        rowEl.className = 'grid-row';
        if (selectedRows.has(rowId)) rowEl.classList.add('selected');
        if (focusedRow === rowId) rowEl.classList.add('focused');
        
        rowEl.dataset.index = i;
        rowEl.dataset.rowId = rowId;
        rowEl.style.position = 'absolute';
        rowEl.style.top = (i * ROW_HEIGHT) + 'px';
        rowEl.style.display = 'flex';
        rowEl.style.width = '100%';

        rowEl.addEventListener('click', () => {
          const currentSelected = new Set(selectedRows);
          if (currentSelected.has(rowId)) currentSelected.delete(rowId);
          else currentSelected.add(rowId);
          sharedMap.set('grid:selectedRows', Array.from(currentSelected));
          sharedMap.set('grid:focusedRow', rowId);
        });

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

  if (searchElement) {
    searchElement.addEventListener('input', (e) => {
      sharedMap.set('grid:filter', e.target.value);
    });
  }

  bodyElement.addEventListener('keydown', (e) => {
    if (!focusedRow && processedRows.length > 0 && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      sharedMap.set('grid:focusedRow', processedRows[0]);
      e.preventDefault();
      return;
    }
    if (!focusedRow) return;
    const currentIndex = processedRows.indexOf(focusedRow);
    if (currentIndex === -1) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentIndex < processedRows.length - 1) {
        const nextRow = processedRows[currentIndex + 1];
        sharedMap.set('grid:focusedRow', nextRow);
        
        const nextTop = (currentIndex + 1) * ROW_HEIGHT;
        if (nextTop >= scrollTop + clientHeight) {
          bodyElement.scrollTop = nextTop - clientHeight + ROW_HEIGHT + ROW_HEIGHT;
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentIndex > 0) {
        const prevRow = processedRows[currentIndex - 1];
        sharedMap.set('grid:focusedRow', prevRow);
        
        const prevTop = (currentIndex - 1) * ROW_HEIGHT;
        if (prevTop < scrollTop) {
          bodyElement.scrollTop = prevTop;
        }
      }
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const currentSelected = new Set(selectedRows);
      if (currentSelected.has(focusedRow)) currentSelected.delete(focusedRow);
      else currentSelected.add(focusedRow);
      sharedMap.set('grid:selectedRows', Array.from(currentSelected));
    }
  });

  // Observe CRDT
  const cleanups = [];
  
  const observeMap = () => {
    for (const [key, val] of sharedMap.entries()) {
      if (key === 'grid:columns') patchColumns(val);
      else if (key === 'grid:rows') patchRows(val);
      else if (key === 'grid:filter') patchFilter(val);
      else if (key === 'grid:sortCol') patchSortCol(val);
      else if (key === 'grid:sortAsc') patchSortAsc(val);
      else if (key === 'grid:selectedRows') patchSelectedRows(val);
      else if (key === 'grid:focusedRow') patchFocusedRow(val);
    }
  };

  const disposeSub = sharedMap.onPatch((patch) => {
    const key = patch.key;
    const val = patch.value;
    if (key === 'grid:columns') patchColumns(val);
    else if (key === 'grid:rows') patchRows(val);
    else if (key === 'grid:filter') patchFilter(val);
    else if (key === 'grid:sortCol') patchSortCol(val);
    else if (key === 'grid:sortAsc') patchSortAsc(val);
    else if (key === 'grid:selectedRows') patchSelectedRows(val);
    else if (key === 'grid:focusedRow') patchFocusedRow(val);
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
