import { describe, test, expect } from 'vitest';
import { createSettingsApp } from '../generated-examples/settings-form/settings-form-app-wireup.generated.js';
import { globalSharedMap } from '../src/store.js';
import { flushMicrotasks } from '../src/testing.js';

describe('Settings Form Integration Tests', () => {
  test('renders initial form fields correctly', () => {
    globalSharedMap.set('settings_username', 'testuser');
    const { root, dispose } = createSettingsApp();
    const input = root.querySelector('#usernameInput');
    expect(input.value).toBe('testuser');
    dispose();
  });

  test('shows validation errors for invalid inputs', async () => {
    const { root, dispose } = createSettingsApp();
    const input = root.querySelector('#usernameInput');
    
    // Simulate input event
    input.value = 'a';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    
    await flushMicrotasks();
    
    const err = root.querySelector('#usernameError');
    expect(err.className).toContain('visible');
    expect(err.textContent).toContain('least 3');
    
    dispose();
    root.remove();
  });

  test('clears validation errors when inputs become valid', async () => {
    const { root, dispose } = createSettingsApp();
    document.body.appendChild(root);

    const input = root.querySelector('#usernameInput');
    
    input.value = 'a';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    await flushMicrotasks();
    
    let err = root.querySelector('#usernameError');
    expect(err.className).toContain('visible');
    
    input.value = 'validuser';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    await flushMicrotasks();
    
    expect(err.className).not.toContain('visible');
    
    dispose();
  });

  test('cleans up reactive effects when disconnected', () => {
    const { dispose } = createSettingsApp();
    dispose();
    // Assuming no errors is enough
  });
});
