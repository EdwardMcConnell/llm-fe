export function generateVirtualGridCode(grid) {
  let code = `
  // Virtual Grid: ${grid.name}
  ${grid.bodyRef}Element.tabIndex = 0;
  const ROW_HEIGHT = ${grid.rowHeight || 32};
  const Math_max = Math.max;
  const Math_min = Math.min;
  const Math_floor = Math.floor;
  let rowsData = [];
  let colsData = [];
  let cellAccessor = null;
  let scrollTop = 0;
  let clientHeight = 400; // updated on scroll/resize
  
  let filterText = '';
  let sortCol = null;
  let sortAsc = true;
  let selectedRows = new Set();
  let focusedRow = null;
  let processedRows = [];

  function recalculateProcessedRows() {
    if (!rowsData) return;
    let result = rowsData.slice();
    if (filterText && cellAccessor) {
      const lowerFilter = filterText.toLowerCase();
      result = result.filter(rowId => {
        for (let i = 0; i < colsData.length; i++) {
          const val = cellAccessor(rowId, colsData[i]);
          if (val && String(val).toLowerCase().includes(lowerFilter)) return true;
        }
        return false;
      });
    }
    if (sortCol && cellAccessor) {
      result.sort((a, b) => {
        const valA = cellAccessor(a, sortCol) || '';
        const valB = cellAccessor(b, sortCol) || '';
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
    }
    processedRows = result;
    renderVirtualRows();
  }

  function renderVirtualRows() {
    const totalHeight = processedRows.length * ROW_HEIGHT;
    let spacer = ${grid.bodyRef}Element.firstChild;
    if (!spacer || spacer.className !== 'virtual-spacer') {
      spacer = document.createElement('div');
      spacer.className = 'virtual-spacer';
      spacer.style.width = '1px';
      ${grid.bodyRef}Element.insertBefore(spacer, ${grid.bodyRef}Element.firstChild);
    }
    spacer.style.height = totalHeight + 'px';

    const startIndex = Math_max(0, Math_floor(scrollTop / ROW_HEIGHT) - ${grid.overscan || 5});
    const endIndex = Math_min(processedRows.length, Math_floor((scrollTop + clientHeight) / ROW_HEIGHT) + ${grid.overscan || 5});

    const existing = new Set();
    const children = ${grid.bodyRef}Element.children;
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child.className === 'virtual-spacer') continue;
      const idx = parseInt(child.dataset.index, 10);
      if (idx >= startIndex && idx < endIndex && child.dataset.rowId === processedRows[idx]) {
        existing.add(idx);
        
        // Dynamic re-render in case data changed but DOM node was kept
        const rowId = processedRows[idx];
        const isSelected = selectedRows.has(rowId);
        const isFocused = focusedRow === rowId;
        if (isSelected !== child.classList.contains('selected')) {
           child.classList.toggle('selected', isSelected);
        }
        if (isFocused !== child.classList.contains('focused')) {
           child.classList.toggle('focused', isFocused);
        }
        
        if (cellAccessor) {
          const cells = child.children;
          for (let c = 0; c < colsData.length; c++) {
            const cellVal = cellAccessor(rowId, colsData[c]);
            const strVal = cellVal == null ? '' : String(cellVal);
            if (cells[c].textContent !== strVal) {
              cells[c].textContent = strVal;
            }
          }
        }
      } else {
        ${grid.bodyRef}Element.removeChild(child);
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
          if (eventSink) eventSink({ type: '${grid.emitSelect}', selectedRows: Array.from(currentSelected), focusedRow: rowId });
        });

        for (let c = 0; c < colsData.length; c++) {
          const col = colsData[c];
          const cellEl = document.createElement('div');
          cellEl.className = 'grid-cell';
          cellEl.dataset.colId = col;
          if (cellAccessor) {
            const cellVal = cellAccessor(rowId, col);
            cellEl.textContent = cellVal == null ? '' : String(cellVal);
          }
          rowEl.appendChild(cellEl);
        }

        ${grid.bodyRef}Element.appendChild(rowEl);
      }
    }
  }

  function renderHeaders() {
    ${grid.headerRef}Element.innerHTML = '';
    for (let c = 0; c < colsData.length; c++) {
      const col = colsData[c];
      const el = document.createElement('div');
      el.className = 'grid-cell header-cell';
      el.dataset.col = col;
      el.textContent = col;
      if (col === sortCol) {
        el.dataset.sort = sortAsc ? 'asc' : 'desc';
      }
      el.addEventListener('click', () => {
        const newAsc = sortCol === col ? !sortAsc : true;
        if (eventSink) eventSink({ type: '${grid.emitSort}', sortCol: col, sortAsc: newAsc });
      });
      ${grid.headerRef}Element.appendChild(el);
    }
  }

  function patchColumns(cols) {
    if (colsData === cols) return;
    colsData = cols || [];
    renderHeaders();
    recalculateProcessedRows();
  }

  ${grid.bodyRef}Element.addEventListener('scroll', () => {
    scrollTop = ${grid.bodyRef}Element.scrollTop;
    clientHeight = ${grid.bodyRef}Element.clientHeight;
    renderVirtualRows();
  });

  ${grid.bodyRef}Element.addEventListener('keydown', (e) => {
    if (!focusedRow && processedRows.length > 0 && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      if (eventSink) eventSink({ type: '${grid.emitFocus}', focusedRow: processedRows[0] });
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
        if (eventSink) eventSink({ type: '${grid.emitFocus}', focusedRow: nextRow });
        
        const nextTop = (currentIndex + 1) * ROW_HEIGHT;
        if (nextTop >= scrollTop + clientHeight) {
          ${grid.bodyRef}Element.scrollTop = nextTop - clientHeight + ROW_HEIGHT + ROW_HEIGHT;
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentIndex > 0) {
        const prevRow = processedRows[currentIndex - 1];
        if (eventSink) eventSink({ type: '${grid.emitFocus}', focusedRow: prevRow });
        
        const prevTop = (currentIndex - 1) * ROW_HEIGHT;
        if (prevTop < scrollTop) {
          ${grid.bodyRef}Element.scrollTop = prevTop;
        }
      }
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const currentSelected = new Set(selectedRows);
      if (currentSelected.has(focusedRow)) currentSelected.delete(focusedRow);
      else currentSelected.add(focusedRow);
      if (eventSink) eventSink({ type: '${grid.emitSelect}', selectedRows: Array.from(currentSelected), focusedRow: focusedRow });
    }
  });

  function patchVirtualGrid(state) {
    let needsRecalc = false;
    let needsRender = false;
    
    if (state.cellAccessor !== undefined) { cellAccessor = state.cellAccessor; needsRender = true; }
    if (state.rows !== undefined) { rowsData = state.rows || []; needsRecalc = true; }
    if (state.filterText !== undefined && state.filterText !== filterText) { filterText = state.filterText; needsRecalc = true; }
    
    if (state.columns !== undefined) { patchColumns(state.columns); }
    if (state.sortCol !== undefined && state.sortCol !== sortCol) { sortCol = state.sortCol; needsRecalc = true; renderHeaders(); }
    if (state.sortAsc !== undefined && state.sortAsc !== sortAsc) { sortAsc = state.sortAsc; needsRecalc = true; renderHeaders(); }
    
    if (state.selectedRows !== undefined) { selectedRows = new Set(state.selectedRows || []); needsRender = true; }
    if (state.focusedRow !== undefined) { focusedRow = state.focusedRow; needsRender = true; }

    if (needsRecalc) recalculateProcessedRows();
    else if (needsRender) renderVirtualRows();
  }

  function patchVirtualCell(rowId, colId, val) {
    const rowEl = ${grid.bodyRef}Element.querySelector(\`[data-row-id="\${rowId}"]\`);
    if (rowEl) {
      const cellEl = rowEl.querySelector(\`[data-col-id="\${colId}"]\`);
      if (cellEl) cellEl.textContent = val == null ? '' : String(val);
    }
    if (filterText || sortCol === colId) {
      // Full recalc on edit if filtering or sorting by this col
      recalculateProcessedRows();
    }
  }
`;
  return code;
}
