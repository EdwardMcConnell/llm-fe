import { describe, test, expect } from 'vitest';
import { createSettingsApp } from '../generated-examples/settings-form/settings-form-app-wireup.generated.js';
import { flushMicrotasks } from '../src/testing.js';

describe('Simulated Bug 001 - Trust Boundary Violation Repair Proof', () => {
  test('Regression Test: validation error is shown for input length < 3', async () => {
    // This is the regression test for the trustBoundaryViolation reported in telemetry evt-001.
    // The repair loop patched contracts/settings-form.contract.json to enforce minLength: 3.
    // This test proves the fix is active in the generated artifact.
    
    const { root, dispose } = createSettingsApp();
    const input = root.querySelector('#usernameInput');
    
    // Dispatch the exact replay action from telemetry fixture
    input.value = 'a';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    
    await flushMicrotasks();
    
    const err = root.querySelector('#usernameError');
    expect(err.className).toContain('visible');
    expect(err.textContent).toContain('least 3');
    
    dispose();
  });
});
