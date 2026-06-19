import { describe, it, expect, vi } from 'vitest';
import '../src/primitives.js';
import { mount, fireEvent, flushMicrotasks } from '../src/testing.js';

describe('FeButton (<fe-button>)', () => {
  it('should delegate focus and render a native button', async () => {
    const btn = await mount('fe-button');
    const nativeBtn = btn.root.querySelector('button');
    expect(nativeBtn).toBeTruthy();
  });

  it('should sync disabled attribute to internal button', async () => {
    const btn = await mount('fe-button');
    const nativeBtn = btn.root.querySelector('button');

    btn.setAttribute('disabled', 'true');
    await flushMicrotasks(); // Wait for MutationObserver
    expect(nativeBtn.hasAttribute('disabled')).toBe(true);

    btn.removeAttribute('disabled');
    await flushMicrotasks();
    expect(nativeBtn.hasAttribute('disabled')).toBe(false);
  });
});

describe('FeDialog (<fe-dialog>)', () => {
  it('should render a native dialog', async () => {
    const dialog = await mount('fe-dialog');
    const nativeDialog = dialog.root.querySelector('dialog');
    expect(nativeDialog).toBeTruthy();
  });

  it('should call native showModal on open', async () => {
    const dialog = await mount('fe-dialog');
    const nativeDialog = dialog.root.querySelector('dialog');
    
    // JSDOM might not fully support showModal rendering, but we can spy on it
    let called = false;
    nativeDialog.showModal = () => { called = true; nativeDialog.open = true; };
    nativeDialog.close = () => { nativeDialog.open = false; };

    /** @type {any} */(dialog).open();
    expect(called).toBe(true);
    expect(nativeDialog.open).toBe(true);
    
    /** @type {any} */(dialog).close();
    expect(nativeDialog.open).toBe(false);
  });
});

describe('FeGrid (<fe-grid>) DOM Recycling', () => {
  // JSDOM does not implement ResizeObserver
  global.ResizeObserver = class {
    constructor(callback) { this.callback = callback; }
    observe() { this.callback(); }
    unobserve() {}
    disconnect() {}
  };

  it('should mathematically cap DOM nodes regardless of massive datasets', async () => {
    // Generate 10,000 items
    const massiveDataset = Array.from({ length: 10000 }, (_, i) => ({ id: i, text: `Row ${i}` }));
    let signalData = massiveDataset;

    const grid = await mount('fe-grid');
    // Mock physical dimensions since JSDOM doesn't render layout
    Object.defineProperty(grid, 'clientHeight', { value: 400 });
    
    /** @type {any} */(grid).bindList(
      () => signalData,
      (item) => `<div class="row">${item.text}</div>`,
      { itemHeight: 40, overscan: 2 }
    );

    // Wait for ResizeObserver and requestAnimationFrame
    await flushMicrotasks();
    await new Promise(resolve => setTimeout(resolve, 50)); // allow RAF

    const viewport = grid.root.querySelector('#viewport');
    const ghost = grid.root.querySelector('#ghost');
    
    // Total physical height must match 10,000 * 40
    expect(ghost.style.height).toBe('400000px');

    // DOM Node Cap: 400 / 40 = 10 visible nodes. Plus 2 * overscan (4). Total = 14 nodes.
    const renderedNodes = viewport.children.length;
    expect(renderedNodes).toBe(14); // 10,000 items -> 14 DOM nodes!
    
    // Verify first node
    expect(viewport.children[0].innerHTML).toBe('<div class="row">Row 0</div>');
  });
});
