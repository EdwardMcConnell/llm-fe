import { describe, it, expect } from 'vitest';
import * as FePackage from '../src/index.js';

describe('Fe UI Package Entrypoint', () => {
  it('Invariant: Should export the complete stable API', () => {
    // Component primitives
    expect(FePackage.FeElement).toBeDefined();

    // Reactivity
    expect(FePackage.createSignal).toBeDefined();
    expect(FePackage.createEffect).toBeDefined();
    expect(FePackage.createTransitionEffect).toBeDefined();
    expect(FePackage.Signal).toBeDefined();

    // CRDT & State
    expect(FePackage.SharedMap).toBeDefined();
    expect(FePackage.createSharedSignal).toBeDefined();
    expect(FePackage.globalSharedMap).toBeDefined();
    expect(FePackage.globalDemandManager).toBeDefined();

    // Subsystems
    expect(FePackage.globalRouter).toBeDefined();
    expect(FePackage.globalTheme).toBeDefined();
    expect(FePackage.globalTime).toBeDefined();
    expect(FePackage.globalTelemetry).toBeDefined();
  });

  it('Invariant: Should auto-register core UI elements via side-effect imports', () => {
    expect(customElements.get('fe-button')).toBeDefined();
    expect(customElements.get('fe-dialog')).toBeDefined();
    expect(customElements.get('fe-grid')).toBeDefined();
  });
});
