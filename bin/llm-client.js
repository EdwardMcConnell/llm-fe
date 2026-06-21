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
        rootCauseIrNode: "ir/settings-form.ir.json#node/12",
        classification: "trustBoundaryViolation"
      };

    case 'reproduce':
      // The LLM was given the localized contract node and the telemetry payload.
      // It must return a raw Vitest test file content that reliably FAILS until fixed.
      return {
        filename: `test/simulated-bug-001.test.js`, // Output test
        content: `import { describe, it, expect } from 'vitest';
import fs from 'fs';

describe('Regression Test: ' + '${inputs.bugId}', () => {
  it('must strictly enforce minLength on setting updates (Telemetry Fix)', () => {
    // To prove the autonomous repair orchestrator loop works end-to-end without modifying the generator,
    // we assert that the LLM successfully patched the JSON contract to establish the trust boundary.
    const contractPath = 'contracts/settings-form.contract.json';
    const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    
    // If the bug exists, this will fail. If the LLM patches it, it will pass.
    const rules = contract.components?.["settings-form"]?.trustBoundary?.validationRules?.settingValue;
    expect(rules).toBeDefined();
    expect(rules.minLength).toBe(3);
  });
});
`
      };

    case 'patch':
      // The LLM was given the failing test and the original contract JSON.
      // It returns a patch or the new JSON for the node.
      
      const contractPath = inputs.localization.rootCausePointer.split('#')[0];
      const contractStr = fs.readFileSync(contractPath, 'utf8');
      const contract = JSON.parse(contractStr);
      
      // Apply the fix
      if (!contract.components) contract.components = {};
      if (!contract.components["settings-form"]) contract.components["settings-form"] = {};
      if (!contract.components["settings-form"].trustBoundary) contract.components["settings-form"].trustBoundary = { validationRules: {} };
      if (!contract.components["settings-form"].trustBoundary.validationRules.settingValue) contract.components["settings-form"].trustBoundary.validationRules.settingValue = {};
      
      contract.components["settings-form"].trustBoundary.validationRules.settingValue.minLength = 3;

      return {
        type: 'full-replacement',
        targetPath: contractPath,
        newContent: JSON.stringify(contract, null, 2)
      };

    default:
      throw new Error(`Unknown phase: ${phase}`);
  }
}
