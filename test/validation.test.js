import { describe, test, expect } from 'vitest';
import { validateContractAndIR, validateAppGraph } from '../generator/validate-contract-ir.js';

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

import fs from 'fs';
import path from 'path';

describe('App Graph Validation', () => {
  const baseApp = { components: { "kanban-card": "foo", "kanban-board": "bar", "kanban-column": "baz" }, generatedOutputs: ["kanban-card.generated.js"] };
  const baseState = {
    schemas: { KanbanItem: { properties: { title: { trust: "external-text" }, status: { trust: "external-enum", enum: ["todo"] } } } },
    keys: { "kanban:item:<id>": { schema: "KanbanItem", collaborative: true } }
  };
  const baseTrust = {
    externalInputs: { shared: "untrusted" },
    rules: { "external-text": {}, "external-enum": {}, "external-html": {} }
  };
  const baseEvents = { events: { "kanban:item:add": { writesStateKeys: ["kanban:item:<id>"] } } };
  const baseComps = {
    "kanban-card": { stateReads: ["kanban:item:<id>"], events: { "add": { emits: "kanban:item:add" } } },
    "kanban-board": {},
    "kanban-column": {}
  };

  test('real kanban graph is valid', () => {
    const appStr = fs.readFileSync(path.join(process.cwd(), 'contracts/kanban-app.contract.json'), 'utf8');
    const stateStr = fs.readFileSync(path.join(process.cwd(), 'contracts/kanban-state.contract.json'), 'utf8');
    const trustStr = fs.readFileSync(path.join(process.cwd(), 'contracts/kanban-trust.contract.json'), 'utf8');
    const evStr = fs.readFileSync(path.join(process.cwd(), 'contracts/kanban-events.contract.json'), 'utf8');
    const brdStr = fs.readFileSync(path.join(process.cwd(), 'contracts/kanban-board.contract.json'), 'utf8');
    const colStr = fs.readFileSync(path.join(process.cwd(), 'contracts/kanban-column.contract.json'), 'utf8');
    const cardStr = fs.readFileSync(path.join(process.cwd(), 'contracts/kanban-card.contract.json'), 'utf8');

    const appContract = JSON.parse(appStr);
    const stateContract = JSON.parse(stateStr);
    const trustContract = JSON.parse(trustStr);
    const evContract = JSON.parse(evStr);
    const comps = {
      "kanban-board": JSON.parse(brdStr),
      "kanban-column": JSON.parse(colStr),
      "kanban-card": JSON.parse(cardStr)
    };

    expect(() => validateAppGraph(appContract, stateContract, trustContract, evContract, comps)).not.toThrow();
  });

  test('passes on valid app graph', () => {
    expect(() => validateAppGraph(baseApp, baseState, baseTrust, baseEvents, baseComps)).not.toThrow();
  });

  test('fails if missing component contract', () => {
    const badApp = { ...baseApp, components: { ...baseApp.components, "missing-comp": "missing.json" } };
    expect(() => validateAppGraph(badApp, baseState, baseTrust, baseEvents, baseComps)).toThrowError(/missing component contract: missing-comp/);
  });

  test('fails if component reads undeclared state key', () => {
    const badComps = { ...baseComps, "kanban-card": { stateReads: ["bad:key"] } };
    expect(() => validateAppGraph(baseApp, baseState, baseTrust, baseEvents, badComps)).toThrowError(/reads undeclared state key: bad:key/);
  });

  test('fails if component emits undeclared event', () => {
    const badComps = { ...baseComps, "kanban-card": { events: { "bad": { emits: "bad:event" } } } };
    expect(() => validateAppGraph(baseApp, baseState, baseTrust, baseEvents, badComps)).toThrowError(/emits undeclared event: bad:event/);
  });

  test('fails if event writes undeclared state key', () => {
    const badEvents = { events: { "kanban:item:add": { writesStateKeys: ["bad:key"] } } };
    expect(() => validateAppGraph(baseApp, baseState, baseTrust, badEvents, baseComps)).toThrowError(/writes undeclared state key: bad:key/);
  });

  test('fails if trust rules missing for external input', () => {
    const badTrust = { ...baseTrust, externalInputs: { shared: "trusted" } };
    expect(() => validateAppGraph(baseApp, baseState, badTrust, baseEvents, baseComps)).toThrowError(/must be untrusted/);
  });

  test('fails if dynamic class lacks allowed enum values', () => {
    const badState = { ...baseState, schemas: { KanbanItem: { properties: { status: { trust: "external-enum" } } } } };
    expect(() => validateAppGraph(baseApp, badState, baseTrust, baseEvents, baseComps)).toThrowError(/lacks allowed enum values/);
  });

  test('fails if whole-board array appears in collaborative state', () => {
    const badState = { ...baseState, keys: { "board": { schema: "BoardArray", collaborative: true } } };
    expect(() => validateAppGraph(baseApp, badState, baseTrust, baseEvents, baseComps)).toThrowError(/uses prohibited whole-board array/);
  });

  test('fails if text field is not marked external-text', () => {
    const badState = { ...baseState, schemas: { KanbanItem: { properties: { title: { trust: "external-enum" } } } } };
    expect(() => validateAppGraph(baseApp, badState, baseTrust, baseEvents, baseComps)).toThrowError(/is not marked external-text/);
  });
});

import { validateRuntimeAPI } from '../generator/index.js';

describe('Runtime API Validation', () => {
  test('fails if IR references sharedMap.observe', () => {
    const badIR = { patches: [{ ops: [{ op: 'custom', code: 'sharedMap.observe()' }] }] };
    expect(() => validateRuntimeAPI(badIR)).toThrow(/sharedMap\.observe/);
  });

  test('fails if IR uses innerHTML', () => {
    const badIR = { create: { template: '<div innerHTML="bad"></div>' } };
    expect(() => validateRuntimeAPI(badIR)).toThrow(/innerHTML/);
  });

  test('passes if IR uses valid sharedMap.subscribe', () => {
    const goodIR = { events: [{ emits: 'kanban:update', code: 'sharedMap.subscribe()' }] };
    expect(() => validateRuntimeAPI(goodIR)).not.toThrow();
  });
});
