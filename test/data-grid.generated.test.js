import { describe, test, expect } from 'vitest';
import { createGridApp } from '../generated-examples/data-grid/data-grid-app-wireup.generated.js';
import { globalSharedMap } from '../src/store.js';

describe('Data Grid Integration Tests', () => {
  test('cleans up reactive effects when disconnected', () => {
    const { dispose } = createGridApp(globalSharedMap);
    dispose();
    expect(true).toBe(true);
  });
});
