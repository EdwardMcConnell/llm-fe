import { describe, it, expect } from 'vitest';
import { flushMicrotasks } from '../src/testing.js';
import { createSettingsApp } from '../generated-examples/settings-form/settings-form-app-wireup.generated.js';

describe('Regression Test: ' + 'simulated-bug-001', () => {
  it('must strictly enforce minLength on setting updates (DOM Native)', async () => {
    const { root } = createSettingsApp();
    
    const userEl = root.querySelector('#usernameInput');
    const emailEl = root.querySelector('#emailInput');
    const formEl = root.querySelector('#settingsForm');
    
    // Simulate telemetry payload input (1 char)
    userEl.value = 'a';
    userEl.dispatchEvent(new Event('input', { bubbles: true }));
    
    emailEl.value = 'edward@example.com';
    emailEl.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Attempt submit
    formEl.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    
    // Wait for reactivity to flush
    await flushMicrotasks();
    
    const errorEl = root.querySelector('#usernameError');
    expect(errorEl).not.toBeNull();
    expect(errorEl.classList.contains('visible')).toBe(true);
    expect(errorEl.textContent).toContain('Username must be at least 3 characters');
  });
});
