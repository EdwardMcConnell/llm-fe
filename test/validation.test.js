import { describe, test, expect } from 'vitest';
import { validateContractAndIR } from '../generator/validate-contract-ir.js';

describe('Contract/IR Parity Validation', () => {
  const baseContract = {
    state: { title: { trust: "external-text" }, status: { trust: "external-enum" } },
    ownedNodes: { titleNode: {} },
    events: {}
  };

  test('passes on valid parity', () => {
    const ir = {
      patches: [{ input: "title", ops: [] }],
      create: { refs: { titleNode: "" } },
      events: []
    };
    expect(() => validateContractAndIR(baseContract, ir)).not.toThrow();
  });

  test('fails if IR patch input is missing from contract', () => {
    const ir = {
      patches: [{ input: "missingState", ops: [] }],
      create: { refs: {} },
      events: []
    };
    expect(() => validateContractAndIR(baseContract, ir)).toThrowError(/unknown state input 'missingState'/);
  });

  test('fails if IR emits external-text into trusted HTML', () => {
    const ir = {
      patches: [{ input: "title", ops: [{ op: "setInnerHTML" }] }],
      create: { refs: {} },
      events: []
    };
    expect(() => validateContractAndIR(baseContract, ir)).toThrowError(/emits external-text 'title' into trusted HTML/);
  });

  test('fails if IR class token is from non-enum', () => {
    const ir = {
      patches: [{ input: "title", ops: [{ op: "setClassToken" }] }],
      create: { refs: {} },
      events: []
    };
    expect(() => validateContractAndIR(baseContract, ir)).toThrowError(/creates class token from non-enum/);
  });

  test('fails if IR references undeclared node', () => {
    const ir = {
      patches: [],
      create: { refs: { badNode: "" } },
      events: []
    };
    expect(() => validateContractAndIR(baseContract, ir)).toThrowError(/undeclared node reference 'badNode'/);
  });

  test('fails if IR emits undeclared event', () => {
    const ir = {
      patches: [],
      create: { refs: {} },
      events: [{ target: "btn", type: "click", emits: "custom:event" }]
    };
    expect(() => validateContractAndIR(baseContract, ir)).toThrowError(/emits undeclared event/);
  });
});
