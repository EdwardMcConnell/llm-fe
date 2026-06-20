import fs from 'fs';
import path from 'path';

export function generateDataGrid(contract, ir, outDir) {
  let code = `// Compiled deterministically from ${ir.module} Data Grid IR
export function createDataGrid(sharedMap) {
  const template = document.createElement('template');
  template.innerHTML = \`${ir.create.template.replace(/\\/g, '\\\\\\\\')}\`;
  const root = template.content.firstElementChild.cloneNode(true);
  
`;

  for (const [refName, selector] of Object.entries(ir.create.refs)) {
    if (refName !== 'root') {
      code += `  const ${refName}Element = root.querySelector(\`${selector}\`);\n`;
    }
  }

  code += `
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
          const val = sharedMap.get(\`grid:cell:\${rowId}:\${col}\`);
          if (val && String(val).toLowerCase().includes(lowerFilter)) return true;
        }
        return false;
      });
    }
    if (sortCol) {
      result.sort((a, b) => {
        const valA = sharedMap.get(\`grid:cell:\${a}:\${sortCol}\`) || '';
        const valB = sharedMap.get(\`grid:cell:\${b}:\${sortCol}\`) || '';
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
    const rowEl = bodyElement.querySelector(\`[data-row-id="\${rowId}"]\`);
    if (rowEl) {
      const cellEl = rowEl.querySelector(\`[data-col-id="\${colId}"]\`);
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
          cellEl.textContent = sharedMap.get(\`grid:cell:\${rowId}:\${col}\`) || '';
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
`;
  fs.writeFileSync(path.join(outDir, 'data-grid.generated.js'), code);
  let wireupCode = `import { createDataGrid } from './data-grid.generated.js';
export function createGridApp(sharedMap) {
  return createDataGrid(sharedMap);
}
`;
  fs.writeFileSync(path.join(outDir, 'data-grid-app-wireup.generated.js'), wireupCode);
}
