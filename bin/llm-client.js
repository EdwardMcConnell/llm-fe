/**
 * Mock LLM Client
 * 
 * This file acts as the boundary for the autonomous repair orchestrator.
 * It strictly returns structured JSON based on the requested phase to prove the mechanics
 * of the loop before wiring up a live, costly OpenAI pipeline.
 * 
 * In a production pipeline, this would use `@ai-sdk/openai` to enforce `generateObject` schema compliance.
 */
import fs from 'fs';
import path from 'path';

export async function askLLM(phase, inputs) {
  // Simulate network latency
  await new Promise(r => setTimeout(r, 500));

  switch (phase) {
    case 'triage':
      // The LLM was given the fixture. It should return the localized pointers.
      return {
        rootCausePointer: "contracts/settings-form.contract.json#/components/settings-form/trustBoundary",
        rootCauseIrNode: "ir/settings-form.ir.json#wireup/forms/0/validate",
        classification: "trustBoundaryViolation"
      };

    case 'reproduce':
      // The LLM was given the localized contract node and the telemetry payload.
      // It must return a raw Vitest test file content that reliably FAILS until fixed natively against the DOM.
      return {
        filename: `test/simulated-bug-001.test.js`, // Output test
        content: `import { describe, it, expect } from 'vitest';
import { flushMicrotasks } from '../src/testing.js';
import { createSettingsApp } from '../generated-examples/settings-form/settings-form-app-wireup.generated.js';

describe('Regression Test: ' + '${inputs.bugId}', () => {
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
`
      };

    case 'patch':
      // The LLM was given the failing test and the original JSON files.
      // It returns a patch for BOTH the contract and the IR.
      
      const contractPath = inputs.localization.rootCausePointer.split('#')[0];
      const contractStr = fs.readFileSync(contractPath, 'utf8');
      const contract = JSON.parse(contractStr);
      
      // 1. Patch the contract
      if (!contract.components) contract.components = {};
      if (!contract.components["settings-form"]) contract.components["settings-form"] = {};
      if (!contract.components["settings-form"].trustBoundary) contract.components["settings-form"].trustBoundary = { validationRules: {} };
      if (!contract.components["settings-form"].trustBoundary.validationRules) contract.components["settings-form"].trustBoundary.validationRules = {};
      if (!contract.components["settings-form"].trustBoundary.validationRules.settingValue) contract.components["settings-form"].trustBoundary.validationRules.settingValue = {};
      
      contract.components["settings-form"].trustBoundary.validationRules.settingValue.minLength = 3;
      fs.writeFileSync(contractPath, JSON.stringify(contract, null, 2), 'utf8');

      // 2. Patch the IR node directly since app-generator.js does not synthesize validation logic (Compile-in-Prompt)
      const irPath = inputs.localization.rootCauseIrNode.split('#')[0];
      const irStr = fs.readFileSync(irPath, 'utf8');
      const ir = JSON.parse(irStr);
      
      ir.wireup.forms[0].validate = `(values) => {
    const errors = {};
    if (!values.username || values.username.length < 3) errors.username = 'Username must be at least 3 characters.';
    if (!values.email || !values.email.includes('@')) errors.email = 'A valid email is required.';
    return errors;
  }`;
      fs.writeFileSync(irPath, JSON.stringify(ir, null, 2), 'utf8');

      return {
        type: 'full-replacement',
        targetPath: irPath,
        newContent: JSON.stringify(ir, null, 2)
      };

    default:
      throw new Error(`Unknown phase: ${phase}`);
  }
}
